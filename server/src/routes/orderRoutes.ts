import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Order, Partner, WorkOrder, Commission, Lead, Opportunity } from '../models/index.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || process.env.PARTNER_JWT_SECRET || 'smartsolar_secret_key_change_in_production';

function auth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, message: '未登录' });
  try {
    req.user = jwt.verify(token, JWT_SECRET) as any;
    next();
  } catch { res.status(401).json({ success: false, message: 'Token无效' }); }
}

// 生成订单号
function genOrderNo(): string {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `ORD-${dateStr}-${rand}`;
}

// ─── 订单列表 ───────────────────────────────────────────────────────────────
router.get('/', auth, async (req: any, res) => {
  try {
    const { status, productType, sourcePartnerId, assignedInstallerId, page = 1, limit = 20 } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (productType) filter.productType = productType;
    if (sourcePartnerId) filter.sourcePartnerId = sourcePartnerId;
    if (assignedInstallerId) filter.assignedInstallerId = assignedInstallerId;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Order.find(filter)
        .populate('sourcePartnerId', 'name level')
        .populate('assignedInstallerId', 'name level')
        .populate('leadId', 'customerName')
        .populate('opportunityId', 'title')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ success: true, data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 订单详情 ───────────────────────────────────────────────────────────────
router.get('/:id', auth, async (req: any, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('sourcePartnerId', 'name level contactPerson phone')
      .populate('assignedInstallerId', 'name level contactPerson phone')
      .populate('leadId', 'customerName customerPhone')
      .populate('opportunityId', 'title probability')
      .populate('workOrderId', 'orderNo status type');
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 创建订单 ───────────────────────────────────────────────────────────────
router.post('/', auth, async (req: any, res) => {
  try {
    const { orderNo, customerName, customerPhone, customerAddress, region,
      productType, productModel, quantity, totalAmount,
      sourcePartnerId, assignedInstallerId, leadId, opportunityId,
      installationDate, notes } = req.body;

    const order = await Order.create({
      orderNo: orderNo || genOrderNo(),
      customerName, customerPhone, customerAddress, region,
      productType, productModel, quantity: quantity || 1,
      totalAmount: totalAmount || 0,
      sourcePartnerId, assignedInstallerId, leadId, opportunityId,
      installationDate,
      status: 'pending',
      notes,
    });

    // 如果有 leadId，更新 lead 状态为 converted
    if (leadId) {
      await Lead.findByIdAndUpdate(leadId, { status: 'converted' });
    }
    // 如果有 opportunityId，更新为 won
    if (opportunityId) {
      await Opportunity.findByIdAndUpdate(opportunityId, { stage: 'won', actualCloseDate: new Date() });
    }

    const populated = await Order.findById(order._id)
      .populate('sourcePartnerId', 'name')
      .populate('assignedInstallerId', 'name');
    res.json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 更新订单 ───────────────────────────────────────────────────────────────
router.put('/:id', auth, async (req: any, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('sourcePartnerId', 'name')
      .populate('assignedInstallerId', 'name');
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    res.json({ success: true, data: order });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 订单状态变更 ───────────────────────────────────────────────────────────
router.patch('/:id/status', auth, async (req: any, res) => {
  try {
    const { status, completionDate } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });

    const validTransitions: Record<string, string[]> = {
      pending: ['confirmed', 'cancelled'],
      confirmed: ['shipped', 'cancelled'],
      shipped: ['installed'],
      installed: ['completed'],
      completed: [],
      cancelled: [],
    };
    if (!validTransitions[order.status]?.includes(status)) {
      return res.status(400).json({ success: false, message: `当前状态[${order.status}]不能变更为[${status}]` });
    }

    order.status = status;
    if (status === 'installed' && !order.installationDate) {
      order.installationDate = new Date();
    }
    if (status === 'completed') {
      order.completionDate = completionDate ? new Date(completionDate) : new Date();
      order.commissionStatus = 'calculated';
    }
    await order.save();

    // ── 订单完工 → 自动创建运维工单 ──────────────────────────────
    if (status === 'completed' && !order.workOrderId) {
      try {
        const workOrder = await WorkOrder.create({
          title: `【售后巡检】${order.customerName} - ${order.productType || '光伏'}系统`,
          description: `订单号：${order.orderNo}，产品类型：${order.productType || '光伏'}，数量：${order.quantity || 1}套`,
          type: 'maintenance',
          priority: 'normal',
          status: 'created',
          partnerId: order.assignedInstallerId,
          // stationId 和 equipmentId 需要后续关联，这里先不填
          handlingSteps: [{
            step: '系统自动创建',
            operator: '系统',
            at: new Date(),
            note: `订单${order.orderNo}完工，自动创建售后巡检工单`,
          }],
        });
        order.workOrderId = workOrder._id as any;
        await order.save();
        console.log(`[Order→WO] Auto-created WO ${workOrder.orderNo} for Order ${order.orderNo}`);
      } catch (woErr) {
        console.error('[Order→WO] Failed to auto-create work order:', woErr);
      }
    }

    const populated = await Order.findById(order._id)
      .populate('sourcePartnerId', 'name')
      .populate('assignedInstallerId', 'name')
      .populate('workOrderId', 'orderNo status');
    res.json({ success: true, data: populated });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 删除订单 ───────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req: any, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ success: false, message: '订单不存在' });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export { router as orderRoutes };
