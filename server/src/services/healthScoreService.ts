import { Equipment, Station } from '../models/index.js';
import { Telemetry, HealthScore, PredictiveAlert } from '../models/healthScore.js';

// ─── 辅助函数 ───────────────────────────────────────────────────────────────
function mean(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function linearTrend(values: number[]): number {
  if (values.length < 2) return 0;
  const n = values.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((acc, xi, i) => acc + xi * values[i], 0);
  const sumX2 = x.reduce((acc, xi) => acc + xi * xi, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// ─── 设备类型判断 ────────────────────────────────────────────────────────────
type EquipType = 'solar' | 'battery' | 'pcs' | 'ev_charger' | 'meter' | 'grid' | 'other';

function getEquipType(equip: any): EquipType {
  const t = (equip.categoryId as any)?.type || equip.type || 'other';
  return t as EquipType;
}

// ─── Telemetry 数据获取 ─────────────────────────────────────────────────────
async function getRecentTelemetry(
  equipmentId: any,
  hours = 24,
): Promise<any[]> {
  const since = new Date(Date.now() - hours * 3600 * 1000);
  return Telemetry.find({
    equipmentId,
    timestamp: { $gte: since },
  })
    .sort({ timestamp: -1 })
    .lean();
}

async function getWeeklyTelemetry(
  equipmentId: any,
): Promise<any[]> {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  return Telemetry.find({
    equipmentId,
    timestamp: { $gte: since },
  })
    .sort({ timestamp: -1 })
    .lean();
}

// ─── 功率得分 ───────────────────────────────────────────────────────────────
function calcPowerScore(equip: any, recent: any[]): { score: number; issues: any[] } {
  const issues: any[] = [];
  let score = 100;

  const type = getEquipType(equip);

  if (type === 'solar' || type === 'other') {
    // 光伏：看实际功率 / 额定功率
    const powers = recent.map(t => t.pvPower).filter(Boolean);
    if (powers.length > 0) {
      const avgPower = mean(powers);
      const ratedPower = equip.ratedPower || 100; // kW
      const ratio = avgPower / ratedPower;

      if (ratio < 0.5) score -= 40;
      else if (ratio < 0.7) score -= 20;
      else if (ratio < 0.85) score -= 10;

      if (ratio < 0.5) {
        issues.push({ code: 'PV_POWER_LOW', description: `当前功率仅占额定功率 ${(ratio * 100).toFixed(0)}%`, severity: 'critical', suggestion: '检查组件遮挡、脏污或 PID 效应' });
      } else if (ratio < 0.8) {
        issues.push({ code: 'PV_POWER_WARN', description: `功率偏低，当前 ${avgPower.toFixed(1)}kW / 额定 ${ratedPower}kW`, severity: 'warning', suggestion: '建议进行组件清洁度检查' });
      }
    }

    // 组串一致性：取最近24h数据里最大/最小功率比
    if (powers.length >= 2) {
      const maxP = Math.max(...powers);
      const minP = Math.min(...powers);
      if (maxP > 0 && minP / maxP < 0.7) {
        score -= 15;
        issues.push({ code: 'PV_STRING_IMBALANCE', description: '组串功率差异过大，最大/最小比值超过 1.4', severity: 'warning', suggestion: '检测是否存在阴影遮挡或组件损坏' });
      }
    }

    // 弃光率
    const dailyYield = recent[0]?.dailyYield || 0;
    const capacity = (equip.stationId as any)?.capacity || 1000;
    const expectedYield = capacity * 24 / 24 * 0.85; // 假设 85% 可利用小时数
    if (expectedYield > 0) {
      const curtailRatio = (recent[0]?.dailyCurtailment || 0) / expectedYield;
      if (curtailRatio > 0.1) {
        score -= 20;
        issues.push({ code: 'PV_CURTAIL_HIGH', description: `弃光率过高：${(curtailRatio * 100).toFixed(1)}%`, severity: 'warning', suggestion: '关注限功率运行原因，提升消纳能力' });
      }
    }
  }

  if (type === 'battery') {
    const powers = recent.map(t => t.pcsPower).filter(Boolean);
    if (powers.length > 0) {
      const avgPower = mean(powers);
      const ratedPower = equip.ratedPower || 500;
      const ratio = avgPower / ratedPower;
      if (ratio < 0.3) score -= 20;
    }
  }

  return { score: clamp(score, 0, 100), issues };
}

// ─── 效率得分 ───────────────────────────────────────────────────────────────
function calcEfficiencyScore(equip: any, recent: any[]): { score: number; issues: any[] } {
  const issues: any[] = [];
  let score = 100;
  const type = getEquipType(equip);

  if (type === 'solar' || type === 'other') {
    const effs = recent.map(t => t.pvEfficiency).filter(v => v != null);
    if (effs.length > 0) {
      const avgEff = mean(effs);
      if (avgEff < 15) score -= 50;
      else if (avgEff < 18) score -= 20;
      else if (avgEff < 20) score -= 5;

      if (avgEff < 15) {
        issues.push({ code: 'PV_EFFICIENCY_LOW', description: `组件效率过低：${avgEff.toFixed(1)}%`, severity: 'critical', suggestion: '建议检测组件衰减情况，考虑更换低效组件' });
      } else if (avgEff < 18) {
        issues.push({ code: 'PV_EFFICIENCY_WARN', description: `组件效率偏低：${avgEff.toFixed(1)}%`, severity: 'warning', suggestion: '关注组件衰减趋势' });
      }
    }
  }

  if (type === 'battery') {
    // 储能充放电效率
    const socValues = recent.map(t => t.batterySOC).filter(Boolean);
    if (socValues.length >= 2) {
      // 通过 SOC 变化反推效率
      const chargeEvents = recent.filter(t => t.batteryCurrent > 0).length;
      const dischargeEvents = recent.filter(t => t.batteryCurrent < 0).length;
      const totalEvents = chargeEvents + dischargeEvents;
      if (totalEvents > 5) {
        // 简化：假设充放电效率应该在 90% 以上
        const effRatio = dischargeEvents / (chargeEvents || 1);
        if (effRatio < 0.8) {
          score -= 15;
          issues.push({ code: 'BATTERY_EFFICIENCY_LOW', description: '充放电效率偏低', severity: 'warning', suggestion: '检查 BMS 均衡功能' });
        }
      }
    }
  }

  if (type === 'pcs') {
    const effs = recent.map(t => t.pcsEfficiency).filter(v => v != null);
    if (effs.length > 0) {
      const avgEff = mean(effs);
      if (avgEff < 90) score -= 40;
      else if (avgEff < 95) score -= 15;
      else if (avgEff < 98) score -= 5;

      if (avgEff < 90) {
        issues.push({ code: 'PCS_EFFICIENCY_LOW', description: `变流效率过低：${avgEff.toFixed(1)}%`, severity: 'critical', suggestion: '建议检修变流器' });
      }
    }
  }

  return { score: clamp(score, 0, 100), issues };
}

// ─── 温度得分 ───────────────────────────────────────────────────────────────
function calcTempScore(equip: any, recent: any[]): { score: number; issues: any[] } {
  const issues: any[] = [];
  let score = 100;
  const type = getEquipType(equip);

  if (type === 'solar' || type === 'other') {
    const temps = recent.map(t => t.pvTemperature).filter(v => v != null);
    if (temps.length > 0) {
      const avgTemp = mean(temps);
      const maxTemp = Math.max(...temps);
      const minTemp = Math.min(...temps);

      if (maxTemp > 85) {
        score -= 50;
        issues.push({ code: 'PV_TEMP_CRITICAL', description: `组件温度过高：${maxTemp.toFixed(1)}℃，存在热斑风险`, severity: 'critical', suggestion: '立即检查组串，清理遮挡物，加强散热' });
      } else if (avgTemp > 65) {
        score -= 20;
        issues.push({ code: 'PV_TEMP_HIGH', description: `组件温度偏高：平均 ${avgTemp.toFixed(1)}℃`, severity: 'warning', suggestion: '关注散热条件，避免高温时段满载运行' });
      }

      // 温度一致性
      if (maxTemp - minTemp > 20) {
        score -= 10;
        issues.push({ code: 'PV_TEMP_UNEVEN', description: '组件温差过大（>20℃），存在热斑风险', severity: 'warning', suggestion: '检测组串内部短路或遮挡' });
      }
    }
  }

  if (type === 'battery') {
    const temps = recent.map(t => t.batteryTemp).filter(v => v != null);
    if (temps.length > 0) {
      const avgTemp = mean(temps);
      const maxTemp = Math.max(...temps);

      if (maxTemp > 50) {
        score -= 60;
        issues.push({ code: 'BATTERY_TEMP_CRITICAL', description: `电池温度过热：${maxTemp.toFixed(1)}℃，存在热失控风险`, severity: 'critical', suggestion: '立即停止充放电，检查冷却系统' });
      } else if (avgTemp > 40) {
        score -= 25;
        issues.push({ code: 'BATTERY_TEMP_HIGH', description: `电池温度偏高：${avgTemp.toFixed(1)}℃`, severity: 'warning', suggestion: '关注冷却系统运行状态' });
      } else if (avgTemp < 5) {
        score -= 10;
        issues.push({ code: 'BATTERY_TEMP_LOW', description: `电池温度过低：${avgTemp.toFixed(1)}℃，可能影响放电性能`, severity: 'info', suggestion: '低温环境下注意电池预热' });
      }
    }
  }

  if (type === 'pcs') {
    const temps = recent.map(t => t.pcsTemperature).filter(v => v != null);
    if (temps.length > 0) {
      const avgTemp = mean(temps);
      if (avgTemp > 70) {
        score -= 40;
        issues.push({ code: 'PCS_TEMP_HIGH', description: `变流器温度偏高：${avgTemp.toFixed(1)}℃`, severity: 'warning', suggestion: '检查散热风扇和通风条件' });
      }
    }
  }

  return { score: clamp(score, 0, 100), issues };
}

// ─── 稳定性得分 ─────────────────────────────────────────────────────────────
async function calcStabilityScore(equip: any, recent: any[], weekData: any[]): Promise<{ score: number; issues: any[] }> {
  const issues: any[] = [];
  let score = 100;
  const type = getEquipType(equip);

  // 近7天告警次数
  const alertCount = weekData.length; // 用数据点密度间接判断
  if (alertCount > 50) score -= 10; // 数据点过多说明告警频繁

  // 功率波动
  if (type === 'solar' || type === 'other') {
    const powers = weekData.map(t => t.pvPower).filter(Boolean);
    if (powers.length > 10) {
      const m = mean(powers);
      const variance = mean(powers.map(p => Math.pow(p - m, 2)));
      const stdDev = Math.sqrt(variance);
      const cv = m > 0 ? stdDev / m : 0; // 变异系数

      if (cv > 0.5) {
        score -= 20;
        issues.push({ code: 'PV_POWER_UNSTABLE', description: `功率波动过大，变异系数 ${(cv * 100).toFixed(0)}%`, severity: 'warning', suggestion: '检查逆变器参数和电网稳定性' });
      }
    }
  }

  // 温度稳定性
  if (type === 'battery') {
    const temps = weekData.map(t => t.batteryTemp).filter(Boolean);
    if (temps.length > 10) {
      const m = mean(temps);
      const variance = mean(temps.map(p => Math.pow(p - m, 2)));
      const stdDev = Math.sqrt(variance);
      if (stdDev > 10) {
        score -= 15;
        issues.push({ code: 'BATTERY_TEMP_UNSTABLE', description: '电池温度波动较大', severity: 'warning', suggestion: '检查冷却系统响应' });
      }
    }
  }

  return { score: clamp(score, 0, 100), issues };
}

// ─── 主计算函数 ─────────────────────────────────────────────────────────────
export async function calculateHealthScore(equipmentId: any): Promise<any> {
  const equip = await Equipment.findById(equipmentId)
    .populate('stationId')
    .populate('categoryId')
    .lean();
  if (!equip) return null;

  const recent = await getRecentTelemetry(equipmentId, 24); // 近24h
  const weekData = await getWeeklyTelemetry(equipmentId);   // 近7天

  // 如果没有遥测数据，返回默认分
  if (!recent || recent.length === 0) {
    return {
      stationId: equip.stationId._id,
      equipmentId: equip._id,
      score: 75,
      grade: 'B',
      factors: { powerScore: 75, efficiencyScore: 75, tempScore: 75, stabilityScore: 75 },
      issues: [{ code: 'NO_DATA', description: '暂无遥测数据', severity: 'info', suggestion: '请确认设备已接入数据采集' }],
      trend: 'stable',
      comparedToLastWeek: 0,
      calculatedAt: new Date(),
    };
  }

  const powerResult = calcPowerScore(equip, recent);
  const effResult = calcEfficiencyScore(equip, recent);
  const tempResult = calcTempScore(equip, recent);
  const stabilityResult = await calcStabilityScore(equip, recent, weekData);

  // 合并问题
  const allIssues = [...powerResult.issues, ...effResult.issues, ...tempResult.issues, ...stabilityResult.issues];

  // 综合评分
  const score = Math.round(
    powerResult.score * 0.30 +
    effResult.score * 0.30 +
    tempResult.score * 0.20 +
    stabilityResult.score * 0.20,
  );

  // 等级
  let grade: 'A' | 'B' | 'C' | 'D' = 'A';
  if (score < 60) grade = 'D';
  else if (score < 75) grade = 'C';
  else if (score < 90) grade = 'B';

  // 趋势（对比上周）
  const lastWeekScore = await HealthScore.findOne({ equipmentId }).sort({ calculatedAt: -1 }).lean();
  const comparedToLastWeek = lastWeekScore ? score - (lastWeekScore.score || 0) : 0;
  const trend: 'rising' | 'stable' | 'declining' =
    comparedToLastWeek > 3 ? 'rising' : comparedToLastWeek < -3 ? 'declining' : 'stable';

  return {
    stationId: equip.stationId._id,
    equipmentId: equip._id,
    score,
    grade,
    factors: {
      powerScore: Math.round(powerResult.score),
      efficiencyScore: Math.round(effResult.score),
      tempScore: Math.round(tempResult.score),
      stabilityScore: Math.round(stabilityResult.score),
    },
    issues: allIssues.slice(0, 5), // 最多保留5个问题
    trend,
    comparedToLastWeek: Math.round(comparedToLastWeek * 10) / 10,
    calculatedAt: new Date(),
    periodStart: new Date(Date.now() - 24 * 3600 * 1000),
    periodEnd: new Date(),
  };
}

// ─── 批量计算 ───────────────────────────────────────────────────────────────
export async function calculateAllHealthScores(): Promise<number> {
  const equipments = await Equipment.find().populate('stationId').lean();
  let count = 0;
  for (const equip of equipments) {
    const score = await calculateHealthScore(equip._id);
    if (!score) continue;
    await HealthScore.findOneAndUpdate(
      { equipmentId: equip._id },
      score,
      { upsert: true, new: true },
    );
    count++;
  }
  return count;
}

// ─── 预测告警生成 ───────────────────────────────────────────────────────────
export async function generatePredictiveAlerts(equipmentId: any): Promise<any[]> {
  const equip = await Equipment.findById(equipmentId).populate('stationId').lean();
  if (!equip) return [];

  const weekData = await getWeeklyTelemetry(equipmentId);
  const alerts: any[] = [];

  // 电池热失控预测
  if (getEquipType(equip) === 'battery') {
    const temps = weekData.map(t => t.batteryTemp).filter(Boolean);
    if (temps.length > 0) {
      const avgTemp = mean(temps);
      const tempTrend = linearTrend(temps.slice(-24)); // 近24条趋势

      if (avgTemp > 42 && tempTrend > 0.3) {
        const socValues = weekData.map(t => t.batterySOC).filter(Boolean);
        alerts.push({
          stationId: equip.stationId._id,
          equipmentId: equip._id,
          alertCode: 'BATTERY_OVERHEAT_RISK',
          alertLevel: avgTemp > 48 ? 'critical' : 'major',
          predictedFailureTime: new Date(Date.now() + 3 * 24 * 3600 * 1000),
          failureProbability: Math.min(0.95, 0.5 + avgTemp / 100 + tempTrend * 0.2),
          confidenceLevel: 0.85,
          rootCauseAnalysis: `近7天电池平均温度${avgTemp.toFixed(1)}℃，呈${tempTrend > 0 ? '上升' : '下降'}趋势，存在热失控风险`,
          evidence: [
            `当前电池温度：${temps[temps.length - 1]}℃`,
            `温度上升趋势：+${(tempTrend * 24).toFixed(1)}℃/天`,
            `数据样本数：${temps.length}条`,
          ],
        });
      }
    }
  }

  // 光伏热斑预测
  if (getEquipType(equip) === 'solar' || getEquipType(equip) === 'other') {
    const temps = weekData.map(t => t.pvTemperature).filter(Boolean);
    if (temps.length > 0) {
      const maxTemp = Math.max(...temps);
      const tempTrend = linearTrend(temps.slice(-24));

      if (maxTemp > 75 && tempTrend > 0.2) {
        alerts.push({
          stationId: equip.stationId._id,
          equipmentId: equip._id,
          alertCode: 'PV_HOTSPOT_RISK',
          alertLevel: 'major',
          predictedFailureTime: new Date(Date.now() + 7 * 24 * 3600 * 1000),
          failureProbability: 0.75,
          confidenceLevel: 0.78,
          rootCauseAnalysis: `组件温度持续偏高，存在热斑风险，可能导致组件功率衰减或烧毁`,
          evidence: [
            `最高组件温度：${maxTemp.toFixed(1)}℃`,
            `温度上升趋势：+${(tempTrend * 24).toFixed(1)}℃/天`,
            `建议：清理组件表面遮挡，检查通风条件`,
          ],
        });
      }
    }
  }

  // 保存告警
  for (const alertData of alerts) {
    // 检查是否已有相同活跃告警
    const existing = await PredictiveAlert.findOne({
      equipmentId: alertData.equipmentId,
      alertCode: alertData.alertCode,
      status: 'active',
    });
    if (!existing) {
      await PredictiveAlert.create(alertData);
    }
  }

  return alerts;
}
