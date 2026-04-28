import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Partner, PartnerUser, PartnerSettlement, WorkOrder } from '../models/index.js';

const router = Router();

function partnerAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, message: '未登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.PARTNER_JWT_SECRET || 'smartsolar_secret_key_change_in_production') as any;
    if (!decoded.partnerId) return res.status(403).json({ success: false, message: '非渠道商账号' });
    req.partnerUser = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token 无效' });
  }
}

// ─── 生成月度结算（管理员/分销商）────────────────────────────────────────────
router.post('/generate', partnerAuth, async (req: any, res) => {
  try {
    const { yearMonth } = req.body; // YYYY-MM 格式，如 "2026-04"
    const { partnerId, role } = req.partnerUser;

    if (!yearMonth) return res.status(400).json({ success: false, message: '请提供结算月份（YYYY-MM）' });

    // 解析月份范围
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // 确定要结算的安装商列表
    let targetPartners: any[] = [];
    if (role === 'admin') {
      targetPartners = await Partner.find({ type: 'installer', status: 'active' }).lean();
    } else if (role === 'owner' || role === 'manager') {
      const parent = await Partner.findById(partnerId);
      if (parent?.type === 'distributor') {
        targetPartners = await Partner.find({ parentPartnerId: partnerId, type: 'installer', status: 'active' }).lean();
      } else {
        targetPartners = [parent].filter(Boolean);
      }
    } else {
      return res.status(403).json({ success: false, message: '权限不足' });
    }

    const results = [];
    for (const p of targetPartners) {
      // 查询该月完工的工单（closed）
      const completedOrders = await WorkOrder.find({
        partnerId: p._id,
        status: 'closed',
        closedAt: { $gte: startDate, $lte: endDate },
      }).lean();

      const installationsCount = completedOrders.length;
      // totalCapacity 从关联 Station 获取（暂用预估容量字段或默认为0）
      const totalCapacity = 0;
      const quota = p.monthlyQuota || 0;
      const quotaAchieved = quota > 0 ? Math.round((installationsCount / quota) * 100) : null;
      const commissionRate = p.commissionRate || 0;
      const commissionAmount = Math.round(totalCapacity * commissionRate * 10); // 元 = 容量(kW) × 佣金比例 × 10元/kW
      const pointsEarned = installationsCount * 100; // 每套100积分

      // 查询是否已存在
      const existing = await PartnerSettlement.findOne({ partnerId: p._id, yearMonth });
      if (existing) {
        Object.assign(existing, {
          installationsCount, totalCapacity, monthlyQuota: quota,
          quotaAchieved, commissionRate, commissionAmount, pointsEarned,
        });
        await existing.save();
        results.push(existing);
      } else {
        const settlement = await PartnerSettlement.create({
          partnerId: p._id, yearMonth,
          installationsCount, totalCapacity, monthlyQuota: quota,
          quotaAchieved, commissionRate, commissionAmount, pointsEarned,
        });
        results.push(settlement);
      }
    }

    res.json({ success: true, data: results });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 获取结算列表 ───────────────────────────────────────────────────────────
router.get('/', partnerAuth, async (req: any, res) => {
  try {
    const { partnerId, role } = req.partnerUser;
    const { yearMonth } = req.query;
    const filter: any = {};

    if (role === 'installer') {
      filter.partnerId = partnerId;
    } else if (role === 'owner' || role === 'manager') {
      // 分销商可以看下级安装商和自己
      const p = await Partner.findById(partnerId);
      if (p?.type === 'distributor') {
        const subIds = (await Partner.find({ parentPartnerId: partnerId, type: 'installer' }).lean()).map(x => x._id);
        filter.partnerId = { $in: [...subIds, partnerId] };
      } else {
        filter.partnerId = partnerId;
      }
    }

    if (yearMonth) filter.yearMonth = yearMonth;

    const settlements = await PartnerSettlement.find(filter)
      .populate('partnerId', 'name level region')
      .sort({ yearMonth: -1 })
      .lean();
    res.json({ success: true, data: settlements });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 确认结算（管理员/分销商）──────────────────────────────────────────────
router.patch('/:id/confirm', partnerAuth, async (req: any, res) => {
  try {
    const { sub: userId } = req.partnerUser;
    const settlement = await PartnerSettlement.findById(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: '结算记录不存在' });

    settlement.status = 'confirmed';
    settlement.confirmedBy = userId as any;
    settlement.confirmedAt = new Date();
    await settlement.save();
    res.json({ success: true, data: settlement });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 标记已付款 ─────────────────────────────────────────────────────────────
router.patch('/:id/paid', partnerAuth, async (req: any, res) => {
  try {
    const { paymentMethod, paymentNote } = req.body;
    const settlement = await PartnerSettlement.findById(req.params.id);
    if (!settlement) return res.status(404).json({ success: false, message: '结算记录不存在' });

    settlement.status = 'paid';
    settlement.paidAt = new Date();
    if (paymentMethod) settlement.paymentMethod = paymentMethod;
    if (paymentNote) settlement.paymentNote = paymentNote;
    await settlement.save();
    res.json({ success: true, data: settlement });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 设置配额和佣金率（管理员/分销商设置下级）───────────────────────────────
router.patch('/set-quota/:partnerId', partnerAuth, async (req: any, res) => {
  try {
    const { monthlyQuota, commissionRate } = req.body;
    const { partnerId: myId, role } = req.partnerUser;

    const target = await Partner.findById(req.params.partnerId);
    if (!target) return res.status(404).json({ success: false, message: '渠道商不存在' });

    // 权限：管理员可设置任何人，分销商只能设置自己下级
    if (role !== 'admin') {
      const me = await Partner.findById(myId);
      if (me?.type !== 'distributor' || String(target.parentPartnerId) !== String(myId)) {
        return res.status(403).json({ success: false, message: '只能设置下级安装商的配额' });
      }
    }

    if (monthlyQuota !== undefined) target.monthlyQuota = monthlyQuota;
    if (commissionRate !== undefined) target.commissionRate = commissionRate;
    await target.save();

    res.json({ success: true, data: target });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
