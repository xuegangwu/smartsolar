import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Partner, Commission, Order, WorkOrder } from '../models/index.js';

const router = Router();
const PARTNER_JWT_SECRET = process.env.JWT_SECRET || process.env.PARTNER_JWT_SECRET || 'smartsolar_secret_key_change_in_production';

function partnerAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: '未登录' });
  try {
    const decoded = jwt.verify(auth.slice(7), PARTNER_JWT_SECRET) as any;
    req.partnerUser = decoded;
    req.partnerId = decoded.partnerId;
    next();
  } catch { res.status(401).json({ success: false, message: 'Token无效' }); }
}

// ─── 佣金列表 ───────────────────────────────────────────────────────────────
router.get('/', partnerAuth, async (req: any, res) => {
  try {
    const { period, status, type } = req.query;
    const filter: any = {};
    if (req.partnerUser.role !== 'admin') {
      filter.$or = [
        { distributorId: req.partnerId },
        { installerId: req.partnerId },
      ];
    }
    if (period) filter.period = period;
    if (status) filter.status = status;
    if (type) filter.type = type;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      Commission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Commission.countDocuments(filter),
    ]);

    res.json({ success: true, data, total, page, pages: Math.ceil(total / limit) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 佣金详情 ───────────────────────────────────────────────────────────────
router.get('/:id', partnerAuth, async (req: any, res) => {
  try {
    const comm = await Commission.findById(req.params.id).lean();
    if (!comm) return res.status(404).json({ success: false, message: '佣金记录不存在' });
    res.json({ success: true, data: comm });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 申请支付佣金 ───────────────────────────────────────────────────────────
router.post('/:id/apply-pay', partnerAuth, async (req: any, res) => {
  try {
    const comm = await Commission.findById(req.params.id);
    if (!comm) return res.status(404).json({ success: false, message: '佣金记录不存在' });
    if (comm.status !== 'pending') return res.json({ success: false, message: '当前状态不支持申请' });
    comm.status = 'approved';
    await comm.save();
    res.json({ success: true, data: comm });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 标记佣金已支付 ─────────────────────────────────────────────────────────
router.patch('/:id/paid', partnerAuth, async (req: any, res) => {
  try {
    const { paidDate, paidMethod, transactionRef } = req.body;
    const comm = await Commission.findByIdAndUpdate(
      req.params.id,
      {
        status: 'paid',
        paidDate: paidDate || new Date(),
        paidMethod,
        transactionRef,
      },
      { new: true }
    );
    if (!comm) return res.status(404).json({ success: false, message: '佣金记录不存在' });
    res.json({ success: true, data: comm });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 按订单计算佣金 ─────────────────────────────────────────────────────────
router.post('/calculate', partnerAuth, async (req: any, res) => {
  try {
    const { orderIds } = req.body;
    if (!orderIds || !Array.isArray(orderIds)) {
      return res.json({ success: false, message: '请提供订单ID列表' });
    }

    const orders = await Order.find({ _id: { $in: orderIds }, status: 'completed' }).lean();
    const results = await Promise.all(orders.map(async (o: any) => {
      // 查找分销商和安装商
      const distributor = o.sourcePartnerId ? await Partner.findById(o.sourcePartnerId).lean() : null;
      const installer = o.assignedInstallerId ? await Partner.findById(o.assignedInstallerId).lean() : null;

      const baseCommission = (distributor?.commissionRate || 5) / 100 * (o.totalAmount || 0);
      const installCommission = installer ? (installer.commissionRate || 5) / 100 * (o.totalAmount || 0) : 0;

      return {
        orderId: o._id,
        orderNo: o.orderNo,
        customerName: o.customerName,
        totalAmount: o.totalAmount,
        distributorId: distributor?._id,
        distributorName: distributor?.name,
        installerId: installer?._id,
        installerName: installer?.name,
        salesCommission: Math.round(baseCommission * 100) / 100,
        installCommission: Math.round(installCommission * 100) / 100,
        totalCommission: Math.round((baseCommission + installCommission) * 100) / 100,
      };
    }));

    const grandTotal = results.reduce((s, r) => s + r.totalCommission, 0);
    res.json({ success: true, data: { details: results, grandTotal } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
