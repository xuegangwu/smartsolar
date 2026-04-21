import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import { Project, Milestone, ProjectDoc, PROJECT_PHASES } from '../models/index.js';

const router = Router();
const ALL_PHASES = [...PROJECT_PHASES];

// 生成项目编号
async function generateCode(): Promise<string> {
  const date = new Date();
  const ym = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}`;
  const count = await Project.countDocuments({ code: new RegExp(`^PJ${ym}`) });
  return `PJ${ym}-${String(count + 1).padStart(3, '0')}`;
}

// 初始化阶段数据
function initPhases() {
  return ALL_PHASES.map(name => ({
    name,
    status: 'pending',
    progress: 0,
  }));
}

// GET /api/projects - 获取项目列表
router.get('/', auth, async (req, res) => {
  try {
    const { status, phase, keyword } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (phase) filter.phase = phase;
    if (keyword) filter.name = { $regex: keyword, $options: 'i' };

    const projects = await Project.find(filter)
      .populate('installerPartnerId', 'name level')
      .populate('managerId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, data: projects });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/projects/:id - 获取单个项目
router.get('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('installerPartnerId', 'name level contactPerson phone region')
      .populate('managerId', 'name phone')
      .populate('stationId', 'name status')
      .lean();
    if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

    const milestones = await Milestone.find({ projectId: project._id }).sort({ createdAt: 1 }).lean();
    const docs = await ProjectDoc.find({ projectId: project._id }).sort({ uploadedAt: -1 }).lean();

    res.json({ success: true, data: { ...project, milestones, docs } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects - 新建项目
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, location, capacity, owner, installerPartnerId, planStartDate, planEndDate, budget, managerId } = req.body;

    const code = await generateCode();
    const project = await Project.create({
      code,
      name,
      type,
      location,
      capacity,
      owner,
      installerPartnerId,
      planStartDate,
      planEndDate,
      budget,
      managerId,
      phases: initPhases(),
    });

    res.json({ success: true, data: project });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/projects/:id - 更新项目
router.put('/:id', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

    const allowed = ['name', 'type', 'location', 'capacity', 'owner', 'installerPartnerId',
      'planStartDate', 'planEndDate', 'budget', 'managerId', 'status', 'phase', 'progress', 'actualStartDate', 'actualEndDate', 'actualCost'];
    allowed.forEach(k => { if (req.body[k] !== undefined) (project as any)[k] = req.body[k]; });

    await project.save();
    res.json({ success: true, data: project });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/projects/:id/phase - 更新阶段状态
router.patch('/:id/phase', auth, async (req, res) => {
  try {
    const { phaseName, status, progress, remark } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: '项目不存在' });

    const phaseIdx = project.phases.findIndex((p: any) => p.name === phaseName);
    if (phaseIdx === -1) return res.status(400).json({ success: false, message: '阶段不存在' });

    const phase = project.phases[phaseIdx];
    if (status) phase.status = status;
    if (progress !== undefined) phase.progress = progress;
    if (remark) phase.remark = remark;

    // 自动更新项目总进度
    const totalProgress = project.phases.reduce((s: number, p: any) => s + (p.progress || 0), 0) / project.phases.length;
    project.progress = Math.round(totalProgress);
    project.phase = phaseName;

    // 自动更新项目状态
    if (status === 'completed' && phaseName === '完工移交') {
      project.status = 'completed';
    } else if (project.status === 'planning') {
      project.status = 'in_progress';
    }

    await project.save();
    res.json({ success: true, data: project });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects/:id/milestones - 添加里程碑
router.post('/:id/milestones', auth, async (req, res) => {
  try {
    const { name, phase, dueDate, remark } = req.body;
    const milestone = await Milestone.create({
      projectId: req.params.id, name, phase, dueDate, remark,
    });
    res.json({ success: true, data: milestone });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PATCH /api/projects/:id/milestones/:mid - 更新里程碑
router.patch('/:id/milestones/:mid', auth, async (req, res) => {
  try {
    const { completed, remark } = req.body;
    const milestone = await Milestone.findById(req.params.mid);
    if (!milestone) return res.status(404).json({ success: false, message: '里程碑不存在' });

    if (completed !== undefined) {
      milestone.completedAt = completed ? new Date() : undefined;
      milestone.completedBy = completed ? (req as any).user?.id : undefined;
    }
    if (remark !== undefined) milestone.remark = remark;
    await milestone.save();
    res.json({ success: true, data: milestone });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/projects/stats/summary - 项目统计
router.get('/stats/summary', auth, async (req, res) => {
  try {
    const [total, byStatus, byPhase, recent] = await Promise.all([
      Project.countDocuments(),
      Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Project.aggregate([{ $group: { _id: '$phase', count: { $sum: 1 } } }]),
      Project.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    res.json({
      success: true,
      data: {
        total,
        byStatus: byStatus.reduce((acc: any, s: any) => { acc[s._id] = s.count; return acc; }, {}),
        byPhase: byPhase.reduce((acc: any, s: any) => { acc[s._id] = s.count; return acc; }, {}),
        recent,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
