import mongoose from 'mongoose';

// ─── Telemetry（时序遥测数据）──────────────────────────────────────────────────
const telemetrySchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },

  // 光伏组串
  pvPower: Number,              // 当前功率 kW
  pvEfficiency: Number,         // 转换效率 %
  pvTemperature: Number,         // 组件温度 ℃
  pvIrradiance: Number,         // 辐照度 W/m²

  // 储能BMS
  batterySOC: Number,           // 荷电状态 %
  batterySOH: Number,           // 健康状态 %（来自BMS）
  batteryTemp: Number,          // 电池温度 ℃
  batteryVoltage: Number,        // 总电压 V
  batteryCurrent: Number,        // 充放电电流 A

  // PCS变流器
  pcsPower: Number,             // 当前功率 kW
  pcsEfficiency: Number,        // 变流效率 %
  pcsTemperature: Number,        // 运行温度 ℃

  // 电网
  gridPower: Number,            // 并网功率 kW
  gridFrequency: Number,         // 电网频率 Hz

  // 统计类
  dailyYield: Number,            // 今日发电量 kWh
  dailyCurtailment: Number,     // 今日弃光量 kWh
  dailyCharge: Number,          // 今日充电量 kWh
  dailyDischarge: Number,       // 今日放电量 kWh

  timestamp: { type: Date, required: true, index: true },
});

// Telemetry – capped daily collection helper (auto-created by timeseries)
export const Telemetry = mongoose.model('Telemetry', telemetrySchema);

// ─── HealthScore（设备健康分）─────────────────────────────────────────────────
const healthScoreSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true, unique: true },

  // 综合评分
  score: { type: Number, default: 100, min: 0, max: 100 },
  grade: { type: String, enum: ['A', 'B', 'C', 'D'], default: 'A' },

  // 分项得分
  factors: {
    powerScore: { type: Number, default: 100, min: 0, max: 100 },
    efficiencyScore: { type: Number, default: 100, min: 0, max: 100 },
    tempScore: { type: Number, default: 100, min: 0, max: 100 },
    stabilityScore: { type: Number, default: 100, min: 0, max: 100 },
  },

  // 问题列表
  issues: [{
    code: String,
    description: String,
    severity: { type: String, enum: ['critical', 'warning', 'info'] },
    suggestion: String,
  }],

  // 趋势
  trend: { type: String, enum: ['rising', 'stable', 'declining'], default: 'stable' },
  comparedToLastWeek: Number, // 与上周相比变化

  // 元数据
  calculatedAt: { type: Date, default: Date.now },
  periodStart: Date,
  periodEnd: Date,
}, { timestamps: true });

export const HealthScore = mongoose.model('HealthScore', healthScoreSchema);

// ─── PredictiveAlert（预测性告警）──────────────────────────────────────────────
const predictiveAlertSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true, index: true },
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true, index: true },

  alertCode: { type: String, required: true },
  alertLevel: { type: String, enum: ['critical', 'major', 'minor'], required: true },

  // 预测信息
  predictedFailureTime: Date,
  failureProbability: { type: Number, min: 0, max: 1 },
  confidenceLevel: { type: Number, min: 0, max: 1 },

  // 根因分析
  rootCauseAnalysis: String,
  evidence: [String],

  // 状态
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved', 'false_alarm'],
    default: 'active',
  },

  acknowledgedAt: Date,
  resolvedAt: Date,
}, { timestamps: true });

export const PredictiveAlert = mongoose.model('PredictiveAlert', predictiveAlertSchema);
