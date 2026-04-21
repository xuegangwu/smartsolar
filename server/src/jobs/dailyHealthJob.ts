import cron from 'node-cron';
import { Equipment } from '../models/index.js';
import { PredictiveAlert } from '../models/healthScore.js';
import { WorkOrder } from '../models/index.js';
import { calculateAllHealthScores, generatePredictiveAlerts } from '../services/healthScoreService.js';

function generateOrderNo() {
  const date = new Date();
  const datePart = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `AI-${datePart}-${random}`;
}

// ─── 自动从健康分 < 60 创建预防性维护工单 ─────────────────────────────
async function autoCreateFromLowHealthScore(score: any) {
  // 只对 D 级（<60分）设备创建工单
  if (score.score >= 60) return null;

  // 检查是否已有相关未关闭工单（避免重复创建）
  const existing = await WorkOrder.findOne({
    equipmentId: score.equipmentId,
    status: { $nin: ['closed'] },
    type: 'maintenance',
  });
  if (existing) return null;

  const topIssue = score.issues?.[0];
  const workOrder = new WorkOrder({
    orderNo: generateOrderNo(),
    stationId: score.stationId,
    equipmentId: score.equipmentId,
    title: `【预防性维护】设备健康分过低（${score.score}分）`,
    description: `🤖 AI 健康分触发自动工单\n\n📊 健康分：${score.score}分（${score.grade}级）\n📅 计算时间：${new Date(score.calculatedAt).toLocaleString('zh-CN')}\n📉 趋势：${score.trend === 'rising' ? '上升↗' : score.trend === 'declining' ? '下降↘' : '稳定→'}\n\n🔍 关键问题：${topIssue ? `\n• ${topIssue.description}\n  建议：${topIssue.suggestion}` : '暂无详细问题描述'}\n\n⚠️ 请及时安排维护，避免故障发生`,
    type: 'maintenance',
    priority: score.score < 40 ? 'urgent' : 'important',
    status: 'created',
    tags: ['AI预防', '健康分预警', `Grade_${score.grade}`],
    relatedAlertId: null,
    handlingSteps: [{
      step: 'AI自动创建（健康分预警）',
      operator: '系统AI',
      at: new Date(),
      note: `健康分${score.score}分（${score.grade}级），自动创建预防性维护工单`,
    }],
  });

  await workOrder.save();
  console.log(`[DailyHealthJob] Auto-created maintenance WO for low health score: equipment=${score.equipmentId}, score=${score.score}`);
  return workOrder;
}

// ─── 自动从预测告警创建工单 ─────────────────────────────────────────────────
async function autoCreateWorkOrder(alert: any) {
  // 检查是否已有相关未关闭工单
  const existing = await WorkOrder.findOne({
    relatedAlertId: alert._id,
    status: { $nin: ['closed'] },
  });
  if (existing) return null;

  const workOrder = new WorkOrder({
    orderNo: generateOrderNo(),
    stationId: alert.stationId,
    equipmentId: alert.equipmentId,
    title: `【AI预警】${alert.alertCode.replace(/_/g, ' ')}`,
    description: `🤖 AI 预测告警\n\n📊 故障概率：${(alert.failureProbability * 100).toFixed(0)}%\n⏰ 预计故障时间：${alert.predictedFailureTime ? new Date(alert.predictedFailureTime).toLocaleString('zh-CN') : '待评估'}\n\n📋 根因分析：\n${alert.rootCauseAnalysis}\n\n📎 支撑证据：\n${(alert.evidence || []).map((e: string) => `• ${e}`).join('\n')}`,
    type: 'fault',
    priority: alert.alertLevel === 'critical' ? 'urgent' : alert.alertLevel === 'major' ? 'important' : 'normal',
    status: 'created',
    tags: ['AI预警', '预测性维护'],
    relatedAlertId: alert._id,
    handlingSteps: [{
      step: 'AI自动创建',
      operator: '系统AI',
      at: new Date(),
      note: `AI预测告警触发：${alert.alertCode}`,
    }],
  });

  await workOrder.save();
  console.log(`[DailyHealthJob] Auto-created work order for alert: ${alert.alertCode}`);
  return workOrder;
}

// ─── 每日处理 ───────────────────────────────────────────────────────────────
async function runDailyHealthJob() {
  console.log('[DailyHealthJob] Starting...');

  try {
    // 1. 计算所有设备健康分
    console.log('[DailyHealthJob] Calculating health scores...');
    const scored = await calculateAllHealthScores();
    console.log(`[DailyHealthJob] Scored ${scored} equipment`);

    // 2. 为每台设备生成预测告警 + 低健康分工单
    console.log('[DailyHealthJob] Generating predictive alerts & checking low health scores...');
    const { HealthScore } = await import('../models/healthScore.js');
    const { Equipment } = await import('../models/index.js');
    const equipments = await Equipment.find().lean();
    let alertCount = 0;
    for (const equip of equipments) {
      // 为该设备生成预测告警（critical + prob>80% 则自动建工单）
      const alerts = await generatePredictiveAlerts(equip._id);
      for (const alert of alerts) {
        if (alert.alertLevel === 'critical' && alert.failureProbability > 0.8) {
          await autoCreateWorkOrder(alert);
        }
        alertCount++;
      }

      // 检查健康分，<60分自动创建预防性维护工单
      const latestScore = await HealthScore.findOne({ equipmentId: equip._id }).sort({ calculatedAt: -1 }).lean();
      if (latestScore && latestScore.score < 60) {
        await autoCreateFromLowHealthScore(latestScore);
      }
    }
    console.log(`[DailyHealthJob] Generated ${alertCount} alerts`);

    // 3. 清理过期的 false_alarm
    const oldAlerts = await PredictiveAlert.find({
      status: 'active',
      createdAt: { $lt: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
    });
    for (const alert of oldAlerts) {
      // 如果30天内一直是 active，没有创建工单，说明是 false_alarm
      const relatedWO = await WorkOrder.findOne({ relatedAlertId: alert._id });
      if (!relatedWO) {
        alert.status = 'false_alarm';
        await alert.save();
      }
    }

    console.log('[DailyHealthJob] Complete.');
  } catch (err) {
    console.error('[DailyHealthJob] Error:', err);
  }
}

// ─── 定时任务 ───────────────────────────────────────────────────────────────
// 每天凌晨 2:00 执行
export function startDailyHealthJob() {
  // 先立即运行一次（异步，不阻塞启动）
  setTimeout(() => runDailyHealthJob(), 5000);

  cron.schedule('0 2 * * *', () => {
    runDailyHealthJob();
  });

  console.log('[DailyHealthJob] Scheduled: runs daily at 02:00');
}
