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
  console.log(`[DailyJob] Auto-created work order for alert: ${alert.alertCode}`);
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

    // 2. 为每台设备生成预测告警
    console.log('[DailyHealthJob] Generating predictive alerts...');
    const equipments = await Equipment.find().lean();
    let alertCount = 0;
    for (const equip of equipments) {
      const alerts = await generatePredictiveAlerts(equip._id);
      for (const alert of alerts) {
        // 自动创建工单（仅 critical 且概率 > 80%）
        if (alert.alertLevel === 'critical' && alert.failureProbability > 0.8) {
          await autoCreateWorkOrder(alert);
        }
        alertCount++;
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
