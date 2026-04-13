/**
 * 生成历史遥测数据（过去7天，每5分钟一条）
 * 用于健康分系统冷启动就有历史数据可分析
 */
import { Equipment } from '../models/index.js';
import { Telemetry } from '../models/healthScore.js';

function rand(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function solarFactorForHour(hour: number): number {
  if (hour < 6 || hour > 18) return 0;
  return Math.max(0, Math.sin((hour - 6) * Math.PI / 12));
}

async function seedEquipmentHistory(equip: any): Promise<void> {
  const type = (equip.categoryId as any)?.type || equip.type || 'other';
  const station = equip.stationId as any;

  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 3600 * 1000;
  const interval = 5 * 60 * 1000; // 5分钟一条

  const docs: any[] = [];

  for (let ts = sevenDaysAgo; ts <= now; ts += interval) {
    const date = new Date(ts);
    const hour = date.getHours();
    const sf = solarFactorForHour(hour);

    const doc: any = {
      stationId: equip.stationId,
      equipmentId: equip._id,
      timestamp: date,
    };

    if (type === 'solar' || type === 'other') {
      const cloudFactor = 0.7 + Math.random() * 0.3;
      const pvPower = Math.max(0, (equip.ratedPower || 100) * sf * cloudFactor);
      const baseEff = 18 + Math.random() * 3;
      const pvTemperature = 25 + sf * 40 + rand(-5, 5);

      doc.pvPower = Math.round(pvPower * 10) / 10;
      doc.pvEfficiency = Math.round(baseEff * 10) / 10;
      doc.pvTemperature = Math.round(pvTemperature * 10) / 10;
      doc.pvIrradiance = Math.round(Math.max(0, sf * 1000 + rand(-100, 100)) * 10) / 10;
      doc.dailyYield = Math.round(pvPower * 0.1 * 100) / 100;
      doc.dailyCurtailment = sf > 0.9 ? Math.round(rand(0, 3) * 100) / 100 : 0;
    }

    if (type === 'battery') {
      const socBase = 50 + Math.sin(ts / 3600000) * 30;
      const soc = Math.min(100, Math.max(10, socBase + rand(-5, 5)));
      doc.batterySOC = Math.round(soc * 10) / 10;
      doc.batterySOH = Math.round((93 + rand(0, 4)) * 10) / 10;
      doc.batteryTemp = Math.round((32 + rand(-3, 10)) * 10) / 10;
      doc.batteryVoltage = Math.round((350 + rand(-20, 20)) * 10) / 10;
      doc.batteryCurrent = Math.round((rand(-50, 50)) * 10) / 10;
      doc.dailyCharge = Math.round(rand(0, 50) * 100) / 100;
      doc.dailyDischarge = Math.round(rand(0, 50) * 100) / 100;
    }

    if (type === 'pcs') {
      const power = (equip.ratedPower || 500) * sf * rand(0.8, 1.0);
      doc.pcsPower = Math.round(power * 10) / 10;
      doc.pcsEfficiency = Math.round((94 + rand(-2, 3)) * 10) / 10;
      doc.pcsTemperature = Math.round((35 + power / (equip.ratedPower || 500) * 20 + rand(-3, 3)) * 10) / 10;
    }

    if (type === 'grid') {
      doc.gridPower = Math.round(rand(-50, 100) * 10) / 10;
      doc.gridFrequency = Math.round((50 + rand(-0.1, 0.1)) * 100) / 100;
    }

    docs.push(doc);
  }

  // 批量插入（每100条一批）
  for (let i = 0; i < docs.length; i += 100) {
    const batch = docs.slice(i, i + 100);
    try {
      await Telemetry.insertMany(batch, { ordered: false });
    } catch {
      // 忽略重复错误
    }
  }
  console.log(`[SeedTelemetry] ${(equip as any).name}: ${docs.length} records`);
}

export async function seedAllTelemetry(): Promise<void> {
  const equipments = await Equipment.find()
    .populate('stationId')
    .populate('categoryId')
    .lean();

  console.log(`[SeedTelemetry] Seeding historical telemetry for ${equipments.length} equipment...`);

  for (const equip of equipments) {
    await seedEquipmentHistory(equip);
  }

  console.log('[SeedTelemetry] Done! Historical telemetry seeded.');
}
