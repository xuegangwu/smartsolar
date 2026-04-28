/**
 * PartnerHub → SmartSolar 数据迁移脚本
 *
 * 使用方法:
 *   MONGODB_HUB_URI=mongodb://localhost:27017/partner_management \
 *   MONGODB_URI=mongodb://localhost:27017/smartsolar \
 *   npx tsx src/seed/seedPartnerHubMigration.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const MONGODB_HUB_URI = process.env.MONGODB_HUB_URI;
if (!MONGODB_HUB_URI) {
  console.error('❌ 请设置 MONGODB_HUB_URI 环境变量（PartnerHub 数据库连接）');
  process.exit(1);
}
const SMART_SOLAR_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartsolar';

// ─── SmartSolar 连接 ──────────────────────────────────────────────────────────
await mongoose.connect(SMART_SOLAR_URI);
const DB = mongoose.connection;
console.log(`✅ SmartSolar DB: ${SMART_SOLAR_URI}`);

// ─── PartnerHub 连接 ──────────────────────────────────────────────────────────
const HubDB = mongoose.createConnection(MONGODB_HUB_URI);
console.log(`✅ PartnerHub DB: ${MONGODB_HUB_URI}`);

// ─── ID 映射表（Hub._id → SmartSolar._id）────────────────────────────────────
const idMap: Map<string, mongoose.Types.ObjectId> = new Map();

function log(msg: string) { console.log(`  ${msg}`); }
function err(msg: string) { console.error(`  ❌ ${msg}`); }

// ══════════════════════════════════════════════════════════════
// PartnerHub 模型定义（inline，避免未注册 model 错误）
// ══════════════════════════════════════════════════════════════

const HubDistributorSchema = new mongoose.Schema({
  code: String, companyName: String, legalPerson: String,
  contactName: String, contactPhone: String, email: String,
  region: String, address: String,
  level: String, status: String,
  certifications: [{
    certType: String, certNo: String,
    issueDate: Date, expiryDate: Date, issuingAuthority: String,
    attachment: String, status: String,
  }],
  parentDistributor: mongoose.Schema.Types.ObjectId,
  commissionRate: Number, creditLimit: Number, creditUsed: Number,
  annualTarget: Number, annualAchieved: Number,
  bankInfo: { bankName: String, accountName: String, accountNumber: String },
}, { timestamps: true });

const HubInstallerSchema = new mongoose.Schema({
  code: String, type: String, companyName: String, name: String,
  phone: String, email: String, region: String, address: String,
  serviceTypes: [String], status: String,
  certifications: [{
    certType: String, certNo: String,
    issueDate: Date, expiryDate: Date, issuingAuthority: String,
    attachment: String, status: String,
  }],
  boundDistributor: mongoose.Schema.Types.ObjectId,
  rating: Number, totalInstallations: Number, completedInstallations: Number,
  onTimeRate: Number, skills: [String], teamSize: Number, coverageRadius: Number,
  bankInfo: { bankName: String, accountName: String, accountNumber: String },
}, { timestamps: true });

const HubLeadSchema = new mongoose.Schema({
  leadNo: String, source: String,
  sourceDistributor: mongoose.Schema.Types.ObjectId,
  sourceInstaller: mongoose.Schema.Types.ObjectId,
  referrerId: mongoose.Schema.Types.ObjectId,
  customerName: String, customerPhone: String, customerAddress: String,
  region: String, propertyType: String, roofType: String,
  monthlyBill: Number, interestProducts: [String], budgetRange: String,
  status: String, assignedTo: mongoose.Schema.Types.ObjectId,
  assignedToType: String, notes: String,
  expectedCloseDate: Date, lostReason: String,
}, { timestamps: true });

const HubOpportunitySchema = new mongoose.Schema({
  oppNo: String, leadId: mongoose.Schema.Types.ObjectId,
  title: String, customerName: String, customerPhone: String,
  assignedDistributor: mongoose.Schema.Types.ObjectId,
  assignedInstaller: mongoose.Schema.Types.ObjectId,
  productType: String, systemCapacity: Number,
  estimatedAmount: Number, probability: Number,
  stage: String, expectedCloseDate: Date, actualCloseDate: Date,
  competitor: String, lostReason: String,
  orderId: mongoose.Schema.Types.ObjectId, notes: String,
}, { timestamps: true });

const HubOrderSchema = new mongoose.Schema({
  orderNo: String, customerName: String, customerPhone: String,
  customerAddress: String, region: String,
  productType: String, productModel: String, quantity: Number, totalAmount: Number,
  status: String, sourceDistributor: mongoose.Schema.Types.ObjectId,
  assignedInstaller: mongoose.Schema.Types.ObjectId,
  leadId: mongoose.Schema.Types.ObjectId, opportunityId: mongoose.Schema.Types.ObjectId,
  projectId: mongoose.Schema.Types.ObjectId,
  installationDate: Date, completionDate: Date,
  commissionAmount: Number, commissionStatus: String, notes: String,
}, { timestamps: true });

const HubUserSchema = new mongoose.Schema({
  username: String, passwordHash: String, password: String,
  name: String, phone: String, email: String,
  role: String, status: String,
  partnerId: mongoose.Schema.Types.ObjectId,
  distributorId: mongoose.Schema.Types.ObjectId,
  lastLoginAt: Date,
}, { timestamps: true });

const HubCommissionSchema = new mongoose.Schema({
  commissionNo: String, orderId: mongoose.Schema.Types.ObjectId,
  distributorId: mongoose.Schema.Types.ObjectId, installerId: mongoose.Schema.Types.ObjectId,
  amount: Number, type: String, status: String,
  period: String, paidDate: Date, paidMethod: String,
  transactionRef: String, notes: String,
}, { timestamps: true });

const HubApprovalTemplateSchema = new mongoose.Schema({
  name: String, code: String, description: String,
  entityType: String, action: String, isActive: Boolean,
  nodes: [{
    name: String, order: Number, approvalType: String,
    approvers: [{
      type: String, userId: mongoose.Schema.Types.ObjectId,
      role: String, department: String,
      partnerType: String, partnerEntityId: String,
    }],
  }],
}, { timestamps: true });

// 注册 HubDB models
HubDB.model('Distributor', HubDistributorSchema);
HubDB.model('Installer', HubInstallerSchema);
HubDB.model('Lead', HubLeadSchema);
HubDB.model('Opportunity', HubOpportunitySchema);
HubDB.model('Order', HubOrderSchema);
HubDB.model('User', HubUserSchema);
HubDB.model('Commission', HubCommissionSchema);
HubDB.model('ApprovalTemplate', HubApprovalTemplateSchema);

// ══════════════════════════════════════════════════════════════
// 辅助函数
// ══════════════════════════════════════════════════════════════

