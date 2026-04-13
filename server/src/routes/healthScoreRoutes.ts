import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { HealthScore, PredictiveAlert, Telemetry } from '../models/healthScore.js';
import { calculateHealthScore, calculateAllHealthScores, generatePredictiveAlerts } from '../services/healthScoreService.js';

const router = Router();

// ─── GET /api/health-scores ───────────────────────────────────────────────────
// 全场站健康分概览
router.get('/health-scores', auth, async (req, res) => {
  try {
    const { stationId, grade } = req.query;

    const filter: any = {};
    if (stationId) filter.stationId = stationId;
    if (grade) filter.grade = grade;

    const scores = await HealthScore.find(filter)
      .populate('stationId', 'name type')
      .populate('equipmentId', 'name type ratedPower categoryId')
      .sort({ score: 1 })
      .lean();

    // 统计
    const all = await HealthScore.find().lean();
    const stats = {
      total: all.length,
      avgScore: all.length ? Math.round(all.reduce((s: number, x: any) => s + x.score, 0) / all.length) : 0,
      gradeA: all.filter((x: any) => x.grade === 'A').length,
      gradeB: all.filter((x: any) => x.grade === 'B').length,
      gradeC: all.filter((x: any) => x.grade === 'C').length,
      gradeD: all.filter((x: any) => x.grade === 'D').length,
      declining: all.filter((x: any) => x.trend === 'declining').length,
    };

    res.json({ success: true, data: scores, stats });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/health-scores/:equipmentId ──────────────────────────────────────
// 单设备健康分详情
router.get('/health-scores/:equipmentId', auth, async (req, res) => {
  try {
    const score = await HealthScore.findOne({ equipmentId: req.params.equipmentId })
      .populate('stationId', 'name type location')
      .populate('equipmentId', 'name type ratedPower brand model serialNumber categoryId')
      .lean();

    if (!score) {
      // 还没评分，计算一次
      const result = await calculateHealthScore(req.params.equipmentId);
      if (!result) return res.status(404).json({ success: false, message: '设备不存在' });
      const saved = await HealthScore.create(result);
      return res.json({ success: true, data: saved });
    }

    res.json({ success: true, data: score });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/health-scores/:equipmentId/history ──────────────────────────────
// 健康分历史趋势
router.get('/health-scores/:equipmentId/history', auth, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - Number(days) * 24 * 3600 * 1000);

    const history = await HealthScore.find({
      equipmentId: req.params.equipmentId,
      calculatedAt: { $gte: since },
    })
      .sort({ calculatedAt: 1 })
      .select('score grade factors calculatedAt')
      .lean();

    res.json({ success: true, data: history });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── POST /api/health-scores/calculate ───────────────────────────────────────
// 手动触发全量健康分计算
router.post('/health-scores/calculate', auth, async (req, res) => {
  try {
    const count = await calculateAllHealthScores();
    res.json({ success: true, message: `已计算 ${count} 台设备的健康分` });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/predictive-alerts ───────────────────────────────────────────────
router.get('/predictive-alerts', auth, async (req, res) => {
  try {
    const { status, level, stationId } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (level) filter.alertLevel = level;
    if (stationId) filter.stationId = stationId;

    const alerts = await PredictiveAlert.find(filter)
      .populate('stationId', 'name')
      .populate('equipmentId', 'name type')
      .sort({ alertLevel: -1, createdAt: -1 })
      .lean();

    res.json({ success: true, data: alerts });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── PATCH /api/predictive-alerts/:id ─────────────────────────────────────────
router.patch('/predictive-alerts/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const update: any = { status };
    if (status === 'acknowledged') update.acknowledgedAt = new Date();
    if (status === 'resolved') update.resolvedAt = new Date();

    const alert = await PredictiveAlert.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true },
    ).lean();

    res.json({ success: true, data: alert });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── GET /api/equipment/:id/telemetry ─────────────────────────────────────────
// 设备遥测数据
router.get('/equipment/:id/telemetry', auth, async (req, res) => {
  try {
    const { hours = 24, limit = 100 } = req.query;
    const since = new Date(Date.now() - Number(hours) * 3600 * 1000);

    const telemetryData = await Telemetry.find({
      equipmentId: req.params.id,
      timestamp: { $gte: since },
    })
      .sort({ timestamp: -1 })
      .limit(Number(limit))
      .lean();

    res.json({ success: true, data: telemetryData });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export { router as healthScoreRoutes };
