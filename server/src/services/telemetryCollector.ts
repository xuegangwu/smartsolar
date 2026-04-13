import cron from 'node-cron';
import { Equipment, Station } from '../models/index.js';
import { Telemetry } from '../models/healthScore.js';

// ─── 辅助函数 ───────────────────────────────────────────────────────────────
function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function jitter(v: number, pct = 0.05): number {
  return v * (1 + (Math.random() - 0.5) * 2 * pct);
}

// ─── 按时段计算光伏因子 ─────────────────────────────────────────────────────
function solarFactor(): number {
  const hour = new Date().getHours();
  if (hour < 6 || hour > 18) return 0;
  // 6-18点正弦曲线
  return Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
}

// ─── 为单台设备生成遥测数据 ─────────────────────────────────────────────────
async function collectForEquipment(equip: any): Promise<void> {
  const station = equip.stationId as any;
  const type = (equip.categoryId as any)?.type || equip.type || 'other';
  const now = new Date();

  const doc: any = {
    stationId: equip.stationId,
    equipmentId: equip._id,
    timestamp: now,
  };

  if (type === 'solar' || type === 'other') {
    const sf = solarFactor();
    const cloudFactor = 0.75 + Math.random() * 0.25; // 75-100% 利用率
    const pvPower = Math.max(0, (equip.ratedPower || 100) * sf * cloudFactor);
    const pvEfficiency = 18 + Math.random() * 3; // 18-21%
    const pvTemperature = 25 + sf * 40 + rand(-5, 5); // 25-65℃ 随日照变化

    doc.pvPower = Math.round(pvPower * 10) / 10;
    doc.pvEfficiency = Math.round(pvEfficiency * 10) / 10;
    doc.pvTemperature = Math.round(pvTemperature * 10) / 10;
    doc.pvIrradiance = Math.round((sf * 1000 + rand(-50, 50)) * 10) / 10; // W/m²
    doc.dailyYield = Math.round(pvPower * (sf > 0 ? 1 : 0.1) * 100) / 100;
    doc.dailyCurtailment = sf > 0.9 ? Math.round(rand(0, 5) * 100) / 100 : 0;
  }

  if (type === 'battery') {
    // BMS 数据
    const baseSOC = 50 + Math.sin(Date.now() / 3600000) * 30; // 随时间波动
    const soc = Math.min(100, Math.max(10, baseSOC + rand(-3, 3)));
    const soh = 95 + rand(-5, 2); // 健康状态缓慢衰减
    const temp = 30 + rand(-5, 15); // 30-45℃
    const current = soc > 80 ? -rand(10, 80) : soc < 30 ? rand(10, 80) : rand(-20, 20);

    doc.batterySOC = Math.round(soc * 10) / 10;
    doc.batterySOH = Math.round(soh * 10) / 10;
    doc.batteryTemp = Math.round(temp * 10) / 10;
    doc.batteryVoltage = Math.round((350 + rand(-20, 20)) * 10) / 10; // 330-370V
    doc.batteryCurrent = Math.round(current * 10) / 10;
    doc.dailyCharge = current < 0 ? Math.round(Math.abs(current) * rand(1, 5) * 100) / 100 : 0;
    doc.dailyDischarge = current > 0 ? Math.round(current * rand(1, 5) * 100) / 100 : 0;
  }

  if (type === 'pcs') {
    const sf = solarFactor();
    const power = (equip.ratedPower || 500) * sf * rand(0.8, 1.0);
    const efficiency = 95 + rand(-3, 2); // 92-97%

    doc.pcsPower = Math.round(power * 10) / 10;
    doc.pcsEfficiency = Math.round(efficiency * 10) / 10;
    doc.pcsTemperature = Math.round(35 + power / (equip.ratedPower || 500) * 20 + rand(-3, 3));
  }

  if (type === 'grid') {
    const sf = solarFactor();
    doc.gridPower = Math.round((rand(-50, 100)) * 10) / 10;
    doc.gridFrequency = Math.round((50 + rand(-0.1, 0.1)) * 100) / 100;
  }

  try {
    await Telemetry.create(doc);
  } catch (err) {
    // 忽略重复 timestamp 错误（同一秒内多次采集）
  }
}

// ─── 全量采集 ───────────────────────────────────────────────────────────────
async function runCollection(): Promise<number> {
  const equipments = await Equipment.find()
    .populate('stationId')
    .populate('categoryId')
    .lean();

  await Promise.all(equipments.map(equip => collectForEquipment(equip)));
  return equipments.length;
}

// ─── 启动采集服务 ───────────────────────────────────────────────────────────
export function startTelemetryCollector(): void {
  // 服务器启动后先采集一次
  setTimeout(() => {
    console.log('[Telemetry] Initial collection...');
    runCollection().then(n => console.log(`[Telemetry] Collected ${n} equipment records`)).catch(console.error);
  }, 3000);

  // 每 5 分钟采集一次
  cron.schedule('*/5 * * * *', () => {
    console.log('[Telemetry] Running scheduled collection...');
    runCollection().then(n => console.log(`[Telemetry] Collected ${n} equipment records`)).catch(console.error);
  });

  console.log('[Telemetry] Collector started: runs every 5 minutes');
}
