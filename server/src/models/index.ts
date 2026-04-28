import mongoose from 'mongoose';

// ─── Station ───────────────────────────────────────────────────────────────────
const stationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['solar', 'storage', 'solar_storage'], required: true },
  location: {
    address: String,
    lat: Number,
    lng: Number,
  },
  capacity: Number,           // kWh（储能容量）或 kW（光伏装机）
  installedCapacity: Number,
  peakPower: Number,
  owner: String,
  contact: String,
  status: { type: String, enum: ['online', 'offline', 'maintenance'], default: 'online' },
  gridConnectionDate: String,
  installerPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', label: '安装商' },
}, { timestamps: true });

export const Station = mongoose.model('Station', stationSchema);

// ─── EquipmentCategory ──────────────────────────────────────────────────────────
const equipmentCategorySchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  name: { type: String, required: true },   // e.g. "光伏组串A区", "储能BMS", "充电桩"
  type: { type: String, enum: ['solar', 'battery', 'pcs', 'meter', 'ev_charger', 'grid', 'other'] },
}, { timestamps: true });

export const EquipmentCategory = mongoose.model('EquipmentCategory', equipmentCategorySchema);

// ─── Equipment ─────────────────────────────────────────────────────────────────
const equipmentSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'EquipmentCategory' },
  name: { type: String, required: true },
  type: { type: String, required: true },
  brand: String,
  model: String,
  serialNumber: String,
  ratedPower: Number,        // kW
  ratedVoltage: Number,       // V
  efficiency: Number,         // %
  installationDate: Date,
  warrantyExpire: Date,
  status: { type: String, enum: ['online', 'offline', 'maintenance'], default: 'online' },
  parameters: mongoose.Schema.Types.Mixed,
}, { timestamps: true });

export const Equipment = mongoose.model('Equipment', equipmentSchema);

// ─── WorkOrder ─────────────────────────────────────────────────────────────────
const workOrderSchema = new mongoose.Schema({
  orderNo: { type: String, unique: true },
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
  title: { type: String, required: true },
  description: String,
  type: { type: String, enum: ['fault', 'maintenance', 'inspection', 'upgrade'], required: true },
  priority: { type: String, enum: ['urgent', 'important', 'normal'], default: 'normal' },
  status: {
    type: String,
    enum: ['created', 'assigned', 'accepted', 'processing', 'accepted_check', 'closed'],
    default: 'created',
  },
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' },
  // 关联安装商（工单关闭时给该渠道商计积分）
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
  // 备件消耗（工单关闭时自动扣减库存）
  spareParts: [{
    sparePartId: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart' },
    quantity: { type: Number, default: 1 },
  }],
  // 操作时间线
  handlingSteps: [{
    step: { type: String, required: true },   // 步骤名称
    operator: { type: String },                // 操作人姓名
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' },
    at: { type: Date, default: Date.now },
    note: { type: String },
  }],
  // AI预测相关
  relatedAlertId: { type: mongoose.Schema.Types.ObjectId },
  tags: [String],
  // 客户评分（工单关闭时填写，1-5星）
  rating: { type: Number, min: 1, max: 5 },
  // 时间戳
  assignedAt: Date,
  acceptedAt: Date,
  completedAt: Date,
  createdAt: Date,
  updatedAt: Date,
  closedAt: Date,
}, { timestamps: true });

export const WorkOrder = mongoose.model('WorkOrder', workOrderSchema);

// ─── MaintenanceRecord ─────────────────────────────────────────────────────────
const maintenanceRecordSchema = new mongoose.Schema({
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment', required: true },
  workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
  description: String,
  cost: Number,
  createdAt: Date,
}, { timestamps: true });

export const MaintenanceRecord = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);

// ─── Alert（从EMS同步）──────────────────────────────────────────────────────────
const alertSchema = new mongoose.Schema({
  sourceAlertId: String,  // EMS原始告警ID（用于去重）
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station' },
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
  level: { type: String, enum: ['critical', 'major', 'minor'], required: true },
  code: String,
  message: { type: String, required: true },
  acknowledged: { type: Boolean, default: false },
  acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician' },
  acknowledgedAt: Date,
  createdAt: { type: Date, default: Date.now },
}, { timestamps: true });

alertSchema.index({ stationId: 1, createdAt: -1 });
alertSchema.index({ acknowledged: 1 });

export const Alert = mongoose.model('Alert', alertSchema);

// ─── InspectionPlan ────────────────────────────────────────────────────────────
const inspectionPlanSchema = new mongoose.Schema({
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station', required: true },
  equipmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Equipment' },
  name: { type: String, required: true },
  period: { type: String, enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
  items: [String],
  nextRunAt: Date,
  enabled: { type: Boolean, default: true },
}, { timestamps: true });

export const InspectionPlan = mongoose.model('InspectionPlan', inspectionPlanSchema);

// ─── InspectionRecord ──────────────────────────────────────────────────────────
const inspectionRecordSchema = new mongoose.Schema({
  planId: { type: mongoose.Schema.Types.ObjectId, ref: 'InspectionPlan', required: true },
  inspectorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician', required: true },
  result: String,
  photos: [String],
  signedAt: { type: Date, default: Date.now },
}, { timestamps: true });

export const InspectionRecord = mongoose.model('InspectionRecord', inspectionRecordSchema);

// ─── SparePart ─────────────────────────────────────────────────────────────────
const sparePartSchema = new mongoose.Schema({
  name: { type: String, required: true },
  model: String,
  warehouse: String,
  quantity: { type: Number, default: 0 },
  safeStock: { type: Number, default: 0 },
  unitCost: Number,
  unit: String,
}, { timestamps: true });

export const SparePart = mongoose.model('SparePart', sparePartSchema);

// ─── SparePartConsume ─────────────────────────────────────────────────────────
const sparePartConsumeSchema = new mongoose.Schema({
  sparePartId: { type: mongoose.Schema.Types.ObjectId, ref: 'SparePart', required: true },
  workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
  technicianId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician' },
  quantity: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});

export const SparePartConsume = mongoose.model('SparePartConsume', sparePartConsumeSchema);

// ─── Technician ────────────────────────────────────────────────────────────────
const technicianSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: String,
  email: String,
  skills: [String],
  status: { type: String, enum: ['available', 'busy', 'offline'], default: 'available' },
  currentTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
}, { timestamps: true });

export const Technician = mongoose.model('Technician', technicianSchema);

// ─── Personnel ─────────────────────────────────────────────────────────────────
const personnelSchema = new mongoose.Schema({
  authId: { type: String, sparse: true }, // 绑定 AuthUser.id（非必填，技术员可无登录账号）
  name: { type: String, required: true },
  phone: String,
  email: String,
  role: {
    type: String,
    enum: ['admin', 'operator', 'technician', 'supervisor', 'manager'],
    required: true,
  },
  organization: { type: String, default: '集团总部' },
  stationIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Station' }],
  skills: [String],
  status: {
    type: String,
    enum: ['active', 'leave', 'fired'],
    default: 'active',
  },
  // 技术人员专用
  workStatus: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'available',
  },
  currentTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
  joinDate: Date,
}, { timestamps: true });

export const Personnel = mongoose.model('Personnel', personnelSchema);

// ─── Notification ──────────────────────────────────────────────────────────────
const NotificationSchema = new mongoose.Schema({
  userId: { type: String, default: 'admin' },
  type: { type: String, enum: ['alert', 'workorder', 'system', 'inspection'], required: true },
  level: { type: String, enum: ['info', 'warning', 'critical'], default: 'info' },
  title: { type: String, required: true },
  message: String,
  relatedId: mongoose.Schema.Types.ObjectId,
  relatedType: String,
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});
export const Notification = mongoose.model('Notification', NotificationSchema);

// ─── InspectionTemplate ───────────────────────────────────────────────────────
const inspectionTemplateSchema = new mongoose.Schema({
  name: { type: String, required: true },
  equipmentType: { type: String, required: true },  // solar/battery/pcs/ev_charger/default
  items: [{
    name: { type: String, required: true },
    checkPoint: String,
    standard: String,       // 合格标准
    method: String,         // 检查方法
  }],
  remark: String,
}, { timestamps: true });

export const InspectionTemplate = mongoose.model('InspectionTemplate', inspectionTemplateSchema);

// ─── Partner（渠道商）────────────────────────────────────────────────────────
const PARTNER_LEVELS = {
  bronze: 'bronze', silver: 'silver', gold: 'gold', diamond: 'diamond',
} as const;
const LEVEL_THRESHOLDS: Record<string, number> = {
  bronze: 0, silver: 5000, gold: 20000, diamond: 50000,
};
const LEVEL_MULTIPLIERS: Record<string, number> = {
  bronze: 1.0, silver: 1.2, gold: 1.5, diamond: 2.0,
};

// ─── 安装商业绩跟踪（每个安装商的安装量统计）──────────────────────────────────────
const installerStatsSchema = new mongoose.Schema({
  installerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  month: { type: String, required: true },           // YYYY-MM
  totalInstallations: { type: Number, default: 0 },  // 累计安装量
  totalCapacity: { type: Number, default: 0 },        // 累计装机容量 (kW)
  residentialCount: { type: Number, default: 0 },    // 家用安装数
  commercialCount: { type: Number, default: 0 },     // 商用安装数
  industrialCount: { type: Number, default: 0 },     // 工商业安装数
  workOrderCount: { type: Number, default: 0 },       // 完工工单数
  qualityScore: { type: Number, default: 5.0 },      // 质量评分 (1-5)
  complaintCount: { type: Number, default: 0 },     // 投诉次数
}, { timestamps: true });
installerStatsSchema.index({ installerId: 1, month: 1 }, { unique: true });
export const InstallerStats = mongoose.model('InstallerStats', installerStatsSchema);

const partnerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, enum: ['distributor', 'installer'], required: true },
  parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
  level: { type: String, enum: Object.values(PARTNER_LEVELS), default: 'bronze' },
  totalPoints: { type: Number, default: 0 },
  availablePoints: { type: Number, default: 0 },
  phone: String, address: String, contactPerson: String,
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  // 配额与结算
  monthlyQuota: { type: Number, default: 0 },        // 月度安装配额（套数）
  commissionRate: { type: Number, default: 5 },      // 佣金比例（%），默认5%
  region: String, description: String,

  // ── 安装商专属字段 ──────────────────────────────────────────────────────────
  businessLicense: { type: String, label: '统一社会信用代码' },
  establishmentDate: { type: Date, label: '成立时间' },
  staffCount: { type: Number, label: '员工数量' },
  serviceRegions: [{ type: String, label: '服务区域' }],          // 多选：省/市
  specializedTypes: [{ type: String, enum: ['residential', 'commercial', 'industrial'], label: '擅长类型' }],
  qualifications: [{
    name: String,        // 证书名称
    number: String,      // 证书编号
    expireDate: Date,    // 过期时间
    fileUrl: String,     // 证书扫描件
  }],
  totalInstallations: { type: Number, default: 0 },   // 历史累计安装量
  totalCapacity: { type: Number, default: 0 },         // 历史累计装机容量 (kW)
  rating: { type: Number, default: 5.0, min: 1, max: 5 },  // 客户评分
  bankAccount: {
    bankName: String,
    accountName: String,
    accountNumber: String,
  },
  taxId: String,
}, { timestamps: true });
partnerSchema.methods.calcLevel = function() {
  if (this.totalPoints >= LEVEL_THRESHOLDS.diamond) return 'diamond';
  if (this.totalPoints >= LEVEL_THRESHOLDS.gold) return 'gold';
  if (this.totalPoints >= LEVEL_THRESHOLDS.silver) return 'silver';
  return 'bronze';
};
export const Partner = mongoose.model('Partner', partnerSchema);

// ─── PartnerUser（渠道商登录账号）───────────────────────────────────────────────
const partnerUserSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  phone: String, email: String,
  role: { type: String, enum: ['owner', 'staff'], default: 'staff' },
  status: { type: String, enum: ['active', 'disabled'], default: 'active' },
  lastLoginAt: Date,
}, { timestamps: true });
export const PartnerUser = mongoose.model('PartnerUser', partnerUserSchema);

// ─── PointRule（积分规则）─────────────────────────────────────────────────────
const pointRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  trigger: { type: String, enum: ['work_order_close', 'inspection_pass', 'manual'], required: true },
  equipmentType: { type: String, default: 'mixed' },
  basePointsPerUnit: { type: Number, default: 10 },
  unit: { type: String, enum: ['kWh', 'kW'], default: 'kWh' },
  enabled: { type: Boolean, default: true },
  remark: String,
}, { timestamps: true });
export const PointRule = mongoose.model('PointRule', pointRuleSchema);

// ─── PointTransaction（积分流水）───────────────────────────────────────────────
const pointTransactionSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  type: { type: String, enum: ['earn', 'redeem', 'adjust', 'expire', 'deduct'], required: true },
  amount: { type: Number, required: true },
  balance: { type: Number, required: true },
  description: String,
  workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
  orderId: String,
  multiplier: { type: Number, default: 1.0 },
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerUser' },
}, { timestamps: true });
export const PointTransaction = mongoose.model('PointTransaction', pointTransactionSchema);

// ─── PointRedemption（积分兑换）───────────────────────────────────────────────
const pointRedemptionSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  itemName: { type: String, required: true },
  pointsCost: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'dispatched', 'completed', 'cancelled'], default: 'pending' },
  shippingAddress: String, contactPhone: String, remark: String,
  handledBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' }, handledAt: Date,
  shippingMethod: String,
  trackingNumber: String,
  dispatchedAt: Date,
  dispatchedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerUser' },
  completedAt: Date,
}, { timestamps: true });
export const PointRedemption = mongoose.model('PointRedemption', pointRedemptionSchema);

// ─── PartnerTransfer（安装商归属变更记录）─────────────────────────────────────
const partnerTransferSchema = new mongoose.Schema({
  installerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  fromDistributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
  toDistributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
  reason: { type: String, default: '' },
  operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerUser' },
  operatorName: { type: String },
}, { timestamps: true });
partnerTransferSchema.index({ installerId: 1, createdAt: -1 });
// ─── PartnerComplaint（安装商投诉记录）─────────────────────────────────────────
const partnerComplaintSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  complainantName: { type: String, required: true },
  complainantPhone: String,
  reason: { type: String, required: true },
  status: { type: String, enum: ['pending', 'resolved', 'dismissed'], default: 'pending' },
  resolution: String,
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerUser' },
  resolvedAt: Date,
}, { timestamps: true });
partnerComplaintSchema.index({ partnerId: 1, createdAt: -1 });
export const PartnerComplaint = mongoose.model('PartnerComplaint', partnerComplaintSchema);

// ─── PartnerApplication（安装商入驻申请）─────────────────────────────────────────
const partnerApplicationSchema = new mongoose.Schema({
  // 公司基本信息
  companyName: { type: String, required: true },
  contactPerson: { type: String, required: true },
  phone: { type: String, required: true },
  email: String,
  address: String,
  // 业务信息
  serviceRegions: [{ type: String }],          // 服务区域，如 ["上海市", "江苏省"]
  specializedTypes: [{ type: String, enum: ['residential', 'commercial', 'industrial'] }],
  staffCount: Number,                          // 员工数量
  establishmentDate: Date,                    // 成立时间
  businessLicense: String,                    // 统一社会信用代码
  description: String,                          // 公司简介
  // 资质证书
  qualifications: [{
    name: String,
    number: String,
    expireDate: Date,
  }],
  // 申请状态
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  // 关联分销商（审批通过后填入）
  parentDistributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
  // 审批信息
  rejectionReason: String,
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerUser' },
  reviewedAt: Date,
  // 审批通过后生成的账号
  createdPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
}, { timestamps: true });
partnerApplicationSchema.index({ status: 1, createdAt: -1 });
export const PartnerApplication = mongoose.model('PartnerApplication', partnerApplicationSchema);

// ─── Lead（客户线索/报备）────────────────────────────────────────────────────────
const leadSchema = new mongoose.Schema({
  // 报备人（安装商）
  installerPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  // 客户基本信息
  customerName: { type: String, required: true },
  customerPhone: { type: String, required: true },
  customerAddress: { type: String, required: true },
  province: String,
  city: String,
  district: String,
  // 项目信息
  projectType: { type: String, enum: ['residential', 'commercial', 'industrial'], required: true },
  estimatedCapacity: Number,        // 预估装机容量 (kW)
  estimatedBudget: Number,         // 预估预算 (万元)
  description: String,
  // 报备状态
  status: { type: String, enum: ['pending', 'approved', 'rejected', 'converted', 'expired'], default: 'pending' },
  // 报备有效期（天）
  protectionDays: { type: Number, default: 30 },
  protectExpiresAt: Date,         // 保护期截止
  // 审批信息
  reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerUser' },
  reviewedAt: Date,
  rejectionReason: String,
  // 转化信息（批准后填入）
  convertedProjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
  convertedAt: Date,
  // 关联分销商（审批时填入）
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
  // 备注
  remark: String,
}, { timestamps: true });
leadSchema.index({ installerPartnerId: 1, createdAt: -1 });
leadSchema.index({ status: 1, protectExpiresAt: 1 });
export const Lead = mongoose.model('Lead', leadSchema);

// ─── PartnerSettlement（月度结算）───────────────────────────────────────────────
const partnerSettlementSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  yearMonth: { type: String, required: true },           // 格式：YYYY-MM
  // 安装量统计
  installationsCount: { type: Number, default: 0 },
  totalCapacity: { type: Number, default: 0 },              // 总装机容量 (kW)
  // 配额
  monthlyQuota: { type: Number, default: 0 },
  quotaAchieved: { type: Number, default: 0 },             // 配额完成率 %
  // 结算金额
  commissionRate: { type: Number, default: 0 },            // 佣金比例 %
  commissionAmount: { type: Number, default: 0 },           // 佣金金额（元）
  pointsEarned: { type: Number, default: 0 },              // 本月获得积分
  // 结算状态
  status: { type: String, enum: ['pending', 'confirmed', 'paid'], default: 'pending' },
  // 对账信息
  confirmedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'PartnerUser' },
  confirmedAt: Date,
  paidAt: Date,
  paymentMethod: String,
  paymentNote: String,
  remark: String,
}, { timestamps: true });
partnerSettlementSchema.index({ partnerId: 1, yearMonth: -1 });
export const PartnerSettlement = mongoose.model('PartnerSettlement', partnerSettlementSchema);

export const PartnerTransfer = mongoose.model('PartnerTransfer', partnerTransferSchema);

export { LEVEL_THRESHOLDS, LEVEL_MULTIPLIERS, PARTNER_LEVELS as PARTNER_LEVEL };

// ─── 项目阶段定义 ────────────────────────────────────────────────────────────────
export const PROJECT_PHASES = ['设计', '设计审批', '设备采购', '施工建设', '并网申请', '并网验收', '完工移交'] as const;
export type ProjectPhase = typeof PROJECT_PHASES[number];

// ─── Project（项目建设）─────────────────────────────────────────────────────────
const milestoneSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phase: { type: String, enum: PROJECT_PHASES, required: true },
  dueDate: Date,
  completedAt: Date,
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' },
  remark: String,
}, { timestamps: true });

const projectDocSchema = new mongoose.Schema({
  projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  name: { type: String, required: true },
  category: { type: String, enum: ['合同', '审批文件', '图纸', '检测报告', '发票', '其他'], default: '其他' },
  fileUrl: String,
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' },
}, { timestamps: true });

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, unique: true },            // 项目编号 PJ20260420-001
  type: { type: String, enum: ['solar', 'storage', 'solar_storage'], required: true },
  location: { address: String, lat: Number, lng: Number },
  capacity: Number,                              // kW / kWh

  // 业主信息（独立档案）
  owner: {
    name: String, contact: String, phone: String,
    idCard: String, address: String,
  },

  // 关联
  installerPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
  stationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Station' },  // 并网后关联电站

  // 进度
  phase: { type: String, enum: PROJECT_PHASES, default: '设计' },
  progress: { type: Number, default: 0, min: 0, max: 100 },  // 0-100

  // 时间
  planStartDate: Date,
  planEndDate: Date,
  actualStartDate: Date,
  actualEndDate: Date,

  // 预算与成本
  budget: Number,         // 预算万元
  actualCost: Number,     // 实际成本万元

  // 阶段状态
  phases: [{
    name: { type: String, enum: PROJECT_PHASES },
    status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
    progress: { type: Number, default: 0 },
    startDate: Date,
    endDate: Date,
    remark: String,
  }],

  // 负责人
  managerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Personnel' },
  status: { type: String, enum: ['planning', 'in_progress', 'suspended', 'completed', 'cancelled'], default: 'planning' },
}, { timestamps: true });

projectSchema.index({ status: 1, phase: 1 });
export const Project = mongoose.model('Project', projectSchema);
export const Milestone = mongoose.model('Milestone', milestoneSchema);
export const ProjectDoc = mongoose.model('ProjectDoc', projectDocSchema);

// ─── Notification（站内通知）───────────────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  recipientPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  type: { type: String, enum: [
    'application_received',   // 新入驻申请
    'application_approved',    // 申请通过
    'application_rejected',    // 申请被拒
    'complaint_received',      // 收到投诉
    'complaint_resolved',      // 投诉已处理
    'lead_approved',           // 线索审批通过
    'lead_rejected',           // 线索被驳回
    'lead_converted',         // 线索已转化
    'settlement_generated',   // 结算单生成
    'settlement_confirmed',    // 结算已确认
    'settlement_paid',         // 结算已付款
    'redemption_approved',    // 兑换审批通过
    'redemption_dispatched',   // 兑换已发货
    'level_up',               // 等级提升
    'level_down',             // 等级下降
    'account_suspended',       // 账号被封
  ], required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  // 关联数据（可选）
  relatedId: mongoose.Schema.Types.ObjectId,
  relatedType: String,          // 'Lead' | 'WorkOrder' | 'Settlement' | 'PartnerApplication' etc.
  isRead: { type: Boolean, default: false },
  readAt: Date,
}, { timestamps: true });
notificationSchema.index({ recipientPartnerId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ recipientPartnerId: 1, createdAt: -1 });
export const PartnerNotification = mongoose.model('PartnerNotification', notificationSchema);

// ─── CommissionRule（分销商佣金规则）────────────────────────────────────────
const commissionRuleSchema = new mongoose.Schema({
  name: { type: String, required: true },                   // 规则名称
  distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  installerLevel: { type: String, enum: ['bronze', 'silver', 'gold', 'diamond'], required: true },
  projectType: { type: String, enum: ['residential', 'commercial', 'industrial'], required: true },
  region: { type: String, default: '' },                     // 空=全部区域
  baseCommission: { type: Number, default: 1000 },         // 单套基础佣金（元）
  capacityBonus: { type: Number, default: 50 },            // 超容量奖励（元/kW）
  quotaMultiplier: { type: Number, default: 1.0 },        // 超配额奖励倍数
  quotaThreshold: { type: Number, default: 100 },          // 超配额触发百分比
  effectiveFrom: { type: Date, required: true },
  effectiveTo: Date,
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  remark: String,
}, { timestamps: true });
commissionRuleSchema.index({ distributorId: 1, installerLevel: 1, projectType: 1, region: 1, status: 1 });
export const CommissionRule = mongoose.model('CommissionRule', commissionRuleSchema);
