import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Opportunity, Lead } from '../models/index.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || process.env.PARTNER_JWT_SECRET || 'smartsolar_secret_key_change_in_production';

function auth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, message: '未登录' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch { res.status(401).json({ success: false, message: 'Token无效' }); }
}

// ─── 商机列表 ───────────────────────────────────────────────────────────────
router.get('/', auth, async (req: any, res) => {
  try {
    const { stage, status, page = 1, limit = 20 } = req.query;
    const filter: any = {};
    if (stage) filter.stage = stage;
    if (status) filter.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      Opportunity.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      Opportunity.countDocuments(filter),
    ]);

    res.json({ success: true, data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 商机详情 ───────────────────────────────────────────────────────────────
router.get('/:id', auth, async (req: any, res) => {
  try {
    const opp = await Opportunity.findById(req.params.id).lean();
    if (!opp) return res.status(404).json({ success: false, message: '商机不存在' });
    res.json({ success: true, data: opp });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 创建商机 ──────────────────────────────────────────────────────────────
router.post('/', auth, async (req: any, res) => {
  try {
    const { oppNo, title, leadId, customerName, customerPhone, customerAddress,
      assignedPartnerId, productType, systemCapacity, estimatedAmount,
      probability, stage, expectedCloseDate, notes } = req.body;

    const opp = await Opportunity.create({
      oppNo: oppNo || `OPP-${Date.now()}`,
      title, leadId, customerName, customerPhone, customerAddress,
      assignedPartnerId, productType, systemCapacity, estimatedAmount,
      probability, stage: stage || 'initial_contact',
      expectedCloseDate, notes,
    });

    res.json({ success: true, data: opp });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 更新商机 ──────────────────────────────────────────────────────────────
router.patch('/:id', auth, async (req: any, res) => {
  try {
    const opp = await Opportunity.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!opp) return res.status(404).json({ success: false, message: '商机不存在' });
    res.json({ success: true, data: opp });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 删除商机 ───────────────────────────────────────────────────────────────
router.delete('/:id', auth, async (req: any, res) => {
  try {
    await Opportunity.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 商机统计 ──────────────────────────────────────────────────────────────
router.get('/stats/summary', auth, async (req: any, res) => {
  try {
    const total = await Opportunity.countDocuments();
    const stages = await Opportunity.aggregate([
      { $group: { _id: '$stage', count: { $sum: 1 } } },
    ]);
    const totalAmount = await Opportunity.aggregate([
      { $group: { _id: null, total: { $sum: '$estimatedAmount' } } },
    ]);

    res.json({
      success: true,
      data: {
        total,
        totalAmount: totalAmount[0]?.total || 0,
        stages: stages.reduce((acc: any, s: any) => { acc[s._id] = s.count; return acc; }, {}),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
