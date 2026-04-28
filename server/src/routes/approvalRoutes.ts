import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { ApprovalTemplate, ApprovalInstance, ApprovalLog, Commission } from '../models/index.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || process.env.PARTNER_JWT_SECRET || 'smartsolar_secret_key_change_in_production';

function auth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: '未登录' });
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch { res.status(401).json({ success: false, message: 'Token无效' }); }
}

// 生成审批编号
function genNo(prefix: string) {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
  return `${prefix}-${dateStr}-${rand}`;
}

// ─── 审批模板 CRUD ─────────────────────────────────────────────────────────
router.get('/templates', auth, async (req: any, res) => {
  try {
    const { entityType, isActive } = req.query;
    const filter: any = {};
    if (entityType) filter.entityType = entityType;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    const templates = await ApprovalTemplate.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: templates });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/templates', auth, async (req: any, res) => {
  try {
    const { name, code, description, entityType, action, nodes } = req.body;
    if (!name || !code || !entityType) {
      return res.json({ success: false, message: '缺少必填字段' });
    }
    const existing = await ApprovalTemplate.findOne({ code });
    if (existing) return res.json({ success: false, message: '模板编码已存在' });

    const template = await ApprovalTemplate.create({ name, code, description, entityType, action, nodes, isActive: true });
    res.json({ success: true, data: template });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/templates/:id', auth, async (req: any, res) => {
  try {
    const template = await ApprovalTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!template) return res.status(404).json({ success: false, message: '模板不存在' });
    res.json({ success: true, data: template });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.delete('/templates/:id', auth, async (req: any, res) => {
  try {
    await ApprovalTemplate.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 发起审批 ──────────────────────────────────────────────────────────────
router.post('/instances', auth, async (req: any, res) => {
  try {
    const { templateId, entityType, entityId, entityCode, entityName, action, actionData, title } = req.body;
    if (!templateId || !entityType || !entityId) {
      return res.json({ success: false, message: '缺少必填字段' });
    }

    const template = await ApprovalTemplate.findById(templateId);
    if (!template) return res.status(404).json({ success: false, message: '审批模板不存在' });
    if (!template.isActive) return res.json({ success: false, message: '模板已停用' });

    // 生成实例编号
    const instanceNo = genNo('APR');

    const instance = await ApprovalInstance.create({
      templateId: template._id,
      instanceNo,
      title: title || `${template.name} - ${entityCode || entityId}`,
      entityType,
      entityId,
      entityCode,
      entityName,
      action: action || template.action,
      actionData: actionData || {},
      status: 'pending',
      currentNodeIndex: 0,
      submitterId: req.user.id || req.user.sub,
      submitterName: req.user.name || req.user.username,
    });

    res.json({ success: true, data: instance });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 审批实例列表 ───────────────────────────────────────────────────────────
router.get('/instances', auth, async (req: any, res) => {
  try {
    const { status, entityType, page = 1, limit = 20 } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (entityType) filter.entityType = entityType;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [data, total] = await Promise.all([
      ApprovalInstance.find(filter).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      ApprovalInstance.countDocuments(filter),
    ]);

    res.json({ success: true, data, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 审批实例详情 ───────────────────────────────────────────────────────────
router.get('/instances/:id', auth, async (req: any, res) => {
  try {
    const instance = await ApprovalInstance.findById(req.params.id)
      .populate('templateId', 'name code nodes')
      .lean();
    if (!instance) return res.status(404).json({ success: false, message: '审批实例不存在' });

    const logs = await ApprovalLog.find({ instanceId: instance._id }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, data: { ...instance, logs } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 审批操作（通过/拒绝）───────────────────────────────────────────────────
router.post('/instances/:id/decide', auth, async (req: any, res) => {
  try {
    const { decision, comment } = req.body;  // decision: 'approve' | 'reject'
    if (!decision) return res.json({ success: false, message: '请提供审批决定' });

    const instance = await ApprovalInstance.findById(req.params.id);
    if (!instance) return res.status(404).json({ success: false, message: '审批实例不存在' });
    if (instance.status !== 'pending') return res.json({ success: false, message: '当前状态不支持审批' });

    const template = await ApprovalTemplate.findById(instance.templateId);
    const currentNode = template?.nodes?.[instance.currentNodeIndex];
    if (!currentNode) return res.json({ success: false, message: '审批节点不存在' });

    // 记录审批日志
    await ApprovalLog.create({
      instanceId: instance._id,
      action: decision,
      actorId: req.user.id || req.user.sub,
      actorName: req.user.name || req.user.username,
      nodeIndex: instance.currentNodeIndex,
      nodeName: currentNode?.name,
      comment,
    });

    if (decision === 'approve') {
      // 检查是否还有下一节点
      const nextIndex = instance.currentNodeIndex + 1;
      if (nextIndex < (template?.nodes?.length || 0)) {
        // 进入下一节点
        instance.currentNodeIndex = nextIndex;
      } else {
        // 审批全部通过
        instance.status = 'approved';
        instance.completedAt = new Date();

        // 如果是佣金支付审批，自动更新佣金状态
        if (instance.entityType === 'commission') {
          await Commission.findByIdAndUpdate(instance.entityId, { status: 'paid', paidDate: new Date() });
        }
      }
    } else {
      // 拒绝
      instance.status = 'rejected';
      instance.completedAt = new Date();
    }

    await instance.save();
    res.json({ success: true, data: instance });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 我的待审批任务 ─────────────────────────────────────────────────────────
router.get('/my-tasks', auth, async (req: any, res) => {
  try {
    const userId = req.user.id || req.user.sub;
    const userRole = req.user.role;

    // 查找所有 pending 实例
    const pendingInstances = await ApprovalInstance.find({ status: 'pending' })
      .populate('templateId', 'name code nodes')
      .lean();

    // 过滤当前用户可审批的
    const myTasks = pendingInstances.filter((inst: any) => {
      const template = inst.templateId;
      if (!template || !template.nodes) return false;
      const currentNode = template.nodes[inst.currentNodeIndex];
      if (!currentNode) return false;

      // 检查当前节点是否需要此人审批
      return currentNode.approvers?.some((a: any) => {
        if (a.type === 'user' && a.userId?.toString() === userId) return true;
        if (a.type === 'role' && a.role === userRole) return true;
        return false;
      });
    });

    res.json({ success: true, data: myTasks });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 审批历史记录 ───────────────────────────────────────────────────────────
router.get('/logs/:instanceId', auth, async (req: any, res) => {
  try {
    const logs = await ApprovalLog.find({ instanceId: req.params.instanceId }).sort({ createdAt: 1 }).lean();
    res.json({ success: true, data: logs });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
