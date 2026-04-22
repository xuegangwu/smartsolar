import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Partner, PartnerUser, Lead, Project } from '../models/index.js';

const router = Router();

// ─── partnerAuth 中间件（从 partnerRoutes 复制）──────────────────────────────
function partnerAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, message: '未登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'smartsolar_partner_secret') as any;
    if (!decoded.partnerId) return res.status(403).json({ success: false, message: '非渠道商账号' });
    req.partnerUser = decoded;
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Token 无效' });
  }
}

function requireRole(...roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!roles.includes(req.partnerUser?.role)) return res.status(403).json({ success: false, message: '权限不足' });
    next();
  };
}

// ─── 安装商：录入线索 ────────────────────────────────────────────────────────
router.post('/', partnerAuth, async (req: any, res) => {
  try {
    const { customerName, customerPhone, customerAddress, province, city, district,
      projectType, estimatedCapacity, estimatedBudget, description, remark } = req.body;
    const { partnerId, sub: userId } = req.partnerUser;

    if (!customerName || !customerPhone || !customerAddress || !projectType) {
      return res.status(400).json({ success: false, message: '请填写必填项：客户名称、电话、地址、项目类型' });
    }

    // 同一安装商 30 天内同一电话不能重复报备
    const recent = await Lead.findOne({
      installerPartnerId: partnerId,
      customerPhone,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    }).lean();
    if (recent) {
      return res.status(400).json({ success: false, message: '30天内相同电话已有一条有效线索，请勿重复报备' });
    }

    const protectionDays = 30;
    const lead = await Lead.create({
      installerPartnerId: partnerId,
      customerName, customerPhone, customerAddress,
      province, city, district,
      projectType, estimatedCapacity, estimatedBudget, description, remark,
      protectionDays,
      protectExpiresAt: new Date(Date.now() + protectionDays * 24 * 60 * 60 * 1000),
    });

    res.json({ success: true, data: lead });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 安装商：我的线索列表 ────────────────────────────────────────────────────
router.get('/', partnerAuth, async (req: any, res) => {
  try {
    const { partnerId } = req.partnerUser;
    const { status } = req.query;
    const filter: any = { installerPartnerId: partnerId };
    if (status) filter.status = status;

    const leads = await Lead.find(filter)
      .populate('distributorId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: leads });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 分销商/管理员：所有线索列表 ────────────────────────────────────────────
router.get('/all', partnerAuth, async (req: any, res) => {
  try {
    const { partnerId, role } = req.partnerUser;
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;

    // 安装商：只看自己报备的
    if (role === 'installer') {
      filter.installerPartnerId = partnerId;
    }
    // 分销商：看所有下级安装商的线索（简化：直接看全部 pending）
    // 实际应该先找所有 subPartners，再查

    const leads = await Lead.find(filter)
      .populate('installerPartnerId', 'name level region')
      .populate('distributorId', 'name')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: leads });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 单条线索详情 ───────────────────────────────────────────────────────────
router.get('/:id', partnerAuth, async (req: any, res) => {
  try {
    const lead = await Lead.findById(req.params.id)
      .populate('installerPartnerId', 'name level region contactPerson phone')
      .populate('distributorId', 'name')
      .lean();
    if (!lead) return res.status(404).json({ success: false, message: '线索不存在' });
    res.json({ success: true, data: lead });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 分销商/管理员：审批线索 ────────────────────────────────────────────────
router.patch('/:id/review', partnerAuth, async (req: any, res) => {
  try {
    const { status, distributorId, remark } = req.body;
    const { sub: userId } = req.partnerUser;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ success: false, message: '请提供正确的审批状态' });
    }

    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: '线索不存在' });
    if (lead.status !== 'pending') return res.status(400).json({ success: false, message: '该线索已审批' });

    lead.status = status;
    lead.reviewedBy = userId as any;
    lead.reviewedAt = new Date();

    if (status === 'approved') {
      // 分配给分销商
      lead.distributorId = distributorId || null;
      // 保护期从审批通过日开始计算
      lead.protectionDays = 60; // 审批后保护60天
      lead.protectExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    } else {
      lead.rejectionReason = remark || '';
    }

    await lead.save();
    res.json({ success: true, data: lead });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 安装商：认领线索（转化为项目）─────────────────────────────────────────
router.patch('/:id/convert', partnerAuth, async (req: any, res) => {
  try {
    const { projectId } = req.body;
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ success: false, message: '线索不存在' });
    if (lead.status === 'expired') return res.status(400).json({ success: false, message: '线索已过期' });
    if (lead.status === 'converted') return res.status(400).json({ success: false, message: '该线索已转化' });

    // 更新为已转化
    lead.status = 'converted';
    lead.convertedProjectId = projectId || null;
    lead.convertedAt = new Date();
    await lead.save();

    res.json({ success: true, data: lead });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 定期清理过期线索 ─────────────────────────────────────────────────────
router.post('/cleanup', partnerAuth, requireRole('admin'), async (req, res) => {
  try {
    const result = await Lead.updateMany(
      { status: 'pending', protectExpiresAt: { $lt: new Date() } },
      { status: 'expired' },
    );
    res.json({ success: true, data: { expiredCount: result.modifiedCount } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
