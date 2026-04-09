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
  assigneeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Technician' },
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
