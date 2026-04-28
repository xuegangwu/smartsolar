/**
 * PartnerHub → SmartSolar 数据迁移脚本 (CJS)
 */
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_HUB_URI = process.env.MONGODB_HUB_URI;
if (!MONGODB_HUB_URI) {
  console.error('❌ 请设置 MONGODB_HUB_URI 环境变量（PartnerHub 数据库连接）');
  process.exit(1);
}
const SMART_SOLAR_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/smartsolar';

async function main() {
  await mongoose.connect(SMART_SOLAR_URI);
  console.log(`✅ SmartSolar DB: ${SMART_SOLAR_URI}`);

  const HubDB = mongoose.createConnection(MONGODB_HUB_URI);
  await HubDB.asPromise();
  console.log(`✅ PartnerHub DB: ${MONGODB_HUB_URI}`);

  const idMap = new Map();

  // ─── PartnerHub Schema ────────────────────────────────────────────────────────
  const HubDistSchema = new mongoose.Schema({
    code: String, companyName: String, legalPerson: String,
    contactName: String, contactPhone: String, email: String,
    region: String, address: String, level: String, status: String,
    certifications: [{ certType: String, certNo: String, issueDate: Date, expiryDate: Date, issuingAuthority: String, attachment: String, status: String }],
    parentDistributor: mongoose.Schema.Types.ObjectId,
    commissionRate: Number, creditLimit: Number, creditUsed: Number,
    annualTarget: Number, annualAchieved: Number,
    bankInfo: { bankName: String, accountName: String, accountNumber: String },
  }, { timestamps: true });

  const HubInstSchema = new mongoose.Schema({
    code: String, type: String, companyName: String, name: String,
    phone: String, email: String, region: String, address: String,
    serviceTypes: [String], status: String,
    certifications: [{ certType: String, certNo: String, issueDate: Date, expiryDate: Date, issuingAuthority: String, attachment: String, status: String }],
    boundDistributor: mongoose.Schema.Types.ObjectId,
    rating: Number, totalInstallations: Number, completedInstallations: Number,
    onTimeRate: Number, skills: [String], teamSize: Number, coverageRadius: Number,
    bankInfo: { bankName: String, accountName: String, accountNumber: String },
  }, { timestamps: true });

  const HubLeadSchema = new mongoose.Schema({
    leadNo: String, source: String, sourceDistributor: mongoose.Schema.Types.ObjectId,
    sourceInstaller: mongoose.Schema.Types.ObjectId, referrerId: mongoose.Schema.Types.ObjectId,
    customerName: String, customerPhone: String, customerAddress: String,
    region: String, propertyType: String, roofType: String, monthlyBill: Number,
    interestProducts: [String], budgetRange: String, status: String,
    assignedTo: mongoose.Schema.Types.ObjectId, assignedToType: String, notes: String,
    expectedCloseDate: Date, lostReason: String,
  }, { timestamps: true });

  const HubOppSchema = new mongoose.Schema({
    oppNo: String, leadId: mongoose.Schema.Types.ObjectId, title: String,
    customerName: String, customerPhone: String,
    assignedDistributor: mongoose.Schema.Types.ObjectId, assignedInstaller: mongoose.Schema.Types.ObjectId,
    productType: String, systemCapacity: Number, estimatedAmount: Number, probability: Number,
    stage: String, expectedCloseDate: Date, actualCloseDate: Date,
    competitor: String, lostReason: String, orderId: mongoose.Schema.Types.ObjectId, notes: String,
  }, { timestamps: true });

  const HubOrderSchema = new mongoose.Schema({
    orderNo: String, customerName: String, customerPhone: String,
    customerAddress: String, region: String, productType: String, productModel: String,
    quantity: Number, totalAmount: Number, status: String,
    sourceDistributor: mongoose.Schema.Types.ObjectId, assignedInstaller: mongoose.Schema.Types.ObjectId,
    leadId: mongoose.Schema.Types.ObjectId, opportunityId: mongoose.Schema.Types.ObjectId,
    projectId: mongoose.Schema.Types.ObjectId, installationDate: Date, completionDate: Date,
    commissionAmount: Number, commissionStatus: String, notes: String,
  }, { timestamps: true });

  const HubCommSchema = new mongoose.Schema({
    commissionNo: String, orderId: mongoose.Schema.Types.ObjectId,
    distributorId: mongoose.Schema.Types.ObjectId, installerId: mongoose.Schema.Types.ObjectId,
    amount: Number, type: String, status: String, period: String,
    paidDate: Date, paidMethod: String, transactionRef: String, notes: String,
  }, { timestamps: true });

  const HubTplSchema = new mongoose.Schema({
    name: String, code: String, description: String,
    entityType: String, action: String, isActive: Boolean,
    nodes: [{
      name: String, order: Number, approvalType: String,
      approvers: [{ type: String, userId: mongoose.Schema.Types.ObjectId, role: String, department: String, partnerType: String, partnerEntityId: String }],
    }],
  }, { timestamps: true });

  HubDB.model('Distributor', HubDistSchema);
  HubDB.model('Installer', HubInstSchema);
  HubDB.model('Lead', HubLeadSchema);
  HubDB.model('Opportunity', HubOppSchema);
  HubDB.model('Order', HubOrderSchema);
  HubDB.model('Commission', HubCommSchema);
  HubDB.model('ApprovalTemplate', HubTplSchema);

  // ─── SmartSolar Schema（inline，避免 ESM 导入问题）───────────────────────────
  const LEVEL = { bronze: 0, silver: 5000, gold: 20000, diamond: 50000 };

  const SS = {
    Partner: mongoose.models.Partner || mongoose.model('Partner', new mongoose.Schema({
      code: { type: String, unique: true, sparse: true, index: true },
      name: { type: String, required: true },
      type: { type: String, enum: ['distributor', 'installer'], required: true },
      parentPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
      level: { type: String, enum: Object.keys(LEVEL), default: 'bronze' },
      status: { type: String, enum: ['pending', 'active', 'suspended', 'terminated'], default: 'active' },
      contactPerson: String, phone: String, email: String, address: String, region: String, serviceRegions: [String],
      legalPerson: String, taxId: String, businessLicense: String, establishmentDate: Date,
      teamSize: Number, coverageRadius: Number,
      serviceTypes: [{ type: String, enum: ['pv', 'storage', 'ev_charger', 'hybrid'] }],
      specializedTypes: [{ type: String, enum: ['residential', 'commercial', 'industrial'] }],
      totalInstallations: { type: Number, default: 0 }, completedInstallations: { type: Number, default: 0 },
      totalCapacity: { type: Number, default: 0 }, rating: { type: Number, default: 5, min: 1, max: 5 }, onTimeRate: { type: Number, default: 100 },
      qualifications: [{ name: String, number: String, issueDate: Date, expireDate: Date, issuingAuthority: String, fileUrl: String, status: { type: String, enum: ['valid', 'expiring', 'expired'], default: 'valid' } }],
      totalPoints: { type: Number, default: 0 }, availablePoints: { type: Number, default: 0 },
      monthlyQuota: { type: Number, default: 0 }, annualTarget: { type: Number, default: 0 }, annualAchieved: { type: Number, default: 0 }, quotaAchieved: { type: Number, default: 0 }, commissionRate: { type: Number, default: 5 },
      creditLimit: { type: Number, default: 0 }, creditUsed: { type: Number, default: 0 },
      bankAccount: { bankName: String, accountName: String, accountNumber: String },
      description: String,
    }, { timestamps: true })),

    Lead: mongoose.models.Lead || mongoose.model('Lead', new mongoose.Schema({
      leadNo: { type: String, required: true, unique: true, index: true },
      source: String, sourcePartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
      referrerCustomerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
      customerName: String, customerPhone: String, customerAddress: String, region: String,
      propertyType: { type: String, enum: ['residential', 'commercial', 'industrial'] },
      roofType: String, monthlyBill: Number, interestProducts: [String], budgetRange: String,
      status: { type: String, enum: ['new', 'contacted', 'qualified', 'quoted', 'converted', 'lost'], default: 'new', index: true },
      assignedPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' }, assignedPartnerType: String,
      expectedCloseDate: Date, lostReason: String, notes: String,
    }, { timestamps: true })),

    Opportunity: mongoose.models.Opportunity || mongoose.model('Opportunity', new mongoose.Schema({
      oppNo: { type: String, required: true, unique: true, index: true },
      leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' }, title: { type: String, required: true },
      customerName: String, customerPhone: String,
      assignedPartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
      productType: { type: String, enum: ['pv', 'storage', 'ev_charger', 'hybrid'] },
      systemCapacity: Number, estimatedAmount: { type: Number, default: 0 }, probability: { type: Number, default: 20 },
      stage: { type: String, enum: ['discovery', 'site_survey', 'design', 'quotation', 'negotiation', 'contract', 'won', 'lost'], default: 'discovery', index: true },
      expectedCloseDate: Date, actualCloseDate: Date, lostReason: String,
      orderId: { type: mongoose.Schema.Types.ObjectId }, notes: String,
    }, { timestamps: true })),

    Order: mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
      orderNo: { type: String, required: true, unique: true, index: true },
      customerName: String, customerPhone: String, customerAddress: String, region: String,
      productType: { type: String, enum: ['pv', 'storage', 'ev_charger', 'hybrid'] },
      productModel: String, quantity: { type: Number, default: 1 }, totalAmount: { type: Number, default: 0 },
      status: { type: String, enum: ['pending', 'confirmed', 'shipped', 'installed', 'completed', 'cancelled'], default: 'pending', index: true },
      sourcePartnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
      assignedInstallerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
      leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
      opportunityId: { type: mongoose.Schema.Types.ObjectId, ref: 'Opportunity' },
      projectId: mongoose.Schema.Types.ObjectId,
      installationDate: Date, completionDate: Date,
      commissionAmount: { type: Number, default: 0 }, commissionStatus: { type: String, enum: ['pending', 'calculated', 'paid'], default: 'pending' },
      workOrderId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkOrder' },
      notes: String,
    }, { timestamps: true })),

    Commission: mongoose.models.Commission || mongoose.model('Commission', new mongoose.Schema({
      commissionNo: { type: String, required: true, unique: true, index: true },
      orderId: mongoose.Schema.Types.ObjectId,
      distributorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
      installerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner' },
      amount: { type: Number, default: 0 }, type: String,
      status: { type: String, enum: ['pending', 'approved', 'paid', 'rejected'], default: 'pending' },
      period: { type: String, index: true }, paidDate: Date, paidMethod: String, transactionRef: String, notes: String,
    }, { timestamps: true })),

    ApprovalTemplate: mongoose.models.ApprovalTemplate || mongoose.model('ApprovalTemplate', new mongoose.Schema({
      name: String, code: { type: String, unique: true, index: true }, description: String,
      entityType: String, action: String, isActive: { type: Boolean, default: true },
      nodes: [{ name: String, order: Number, approvalType: String, approvers: { type: [mongoose.Schema.Types.Mixed], default: [] } }],
    }, { timestamps: true })),
  };

  function log(m) { console.log(`  ${m}`); }
  function err(m) { console.error(`  ❌ ${m}`); }

  // ── Distributor → Partner ────────────────────────────────────────────────────
  console.log('\n📦 Distributor → Partner...');
  const HubDist = HubDB.model('Distributor');
  let dMig = 0, dSkip = 0;
  for (const d of await HubDist.find().lean()) {
    try {
      if (await SS.Partner.findOne({ code: d.code })) { dSkip++; continue; }
      const newId = new mongoose.Types.ObjectId();
      idMap.set(d._id.toString(), newId);
      await SS.Partner.create({
        _id: newId, code: d.code, name: d.companyName, type: 'distributor',
        parentPartnerId: d.parentDistributor ? idMap.get(d.parentDistributor.toString()) || null : null,
        level: d.level === 'province' ? 'gold' : d.level === 'city' ? 'silver' : d.level === 'district' ? 'bronze' : 'bronze',
        status: d.status || 'active', contactPerson: d.contactName, phone: d.contactPhone,
        email: d.email, address: d.address, region: d.region, legalPerson: d.legalPerson,
        commissionRate: d.commissionRate || 5, creditLimit: d.creditLimit || 0, creditUsed: d.creditUsed || 0,
        annualTarget: d.annualTarget || 0, annualAchieved: d.annualAchieved || 0,
        bankAccount: d.bankInfo ? { bankName: d.bankInfo.bankName, accountName: d.bankInfo.accountName, accountNumber: d.bankInfo.accountNumber } : undefined,
        qualifications: (d.certifications || []).map(c => ({ name: c.certType, number: c.certNo, issueDate: c.issueDate, expireDate: c.expiryDate, issuingAuthority: c.issuingAuthority, fileUrl: c.attachment, status: c.status || 'valid' })),
      });
      dMig++;
    } catch (e) { if (e.code === 11000) dSkip++; else err(`${d.code}: ${e.message}`); dSkip++; }
  }
  log(`${dMig} 新增, ${dSkip} 已存在`);

  // ── Installer → Partner ────────────────────────────────────────────────────
  console.log('\n📦 Installer → Partner...');
  const HubInst = HubDB.model('Installer');
  let iMig = 0, iSkip = 0;
  for (const i of await HubInst.find().lean()) {
    try {
      if (await SS.Partner.findOne({ code: i.code })) { iSkip++; continue; }
      const newId = new mongoose.Types.ObjectId();
      idMap.set(i._id.toString(), newId);
      await SS.Partner.create({
        _id: newId, code: i.code, name: i.companyName || i.name, type: 'installer',
        parentPartnerId: i.boundDistributor ? idMap.get(i.boundDistributor.toString()) || null : null,
        level: 'bronze', status: i.status || 'active', contactPerson: i.name, phone: i.phone,
        email: i.email, address: i.address, region: i.region,
        serviceTypes: i.serviceTypes || [], teamSize: i.teamSize, coverageRadius: i.coverageRadius,
        totalInstallations: i.totalInstallations || 0, completedInstallations: i.completedInstallations || 0,
        rating: i.rating || 5, onTimeRate: i.onTimeRate || 100,
        qualifications: (i.certifications || []).map(c => ({ name: c.certType, number: c.certNo, issueDate: c.issueDate, expireDate: c.expiryDate, issuingAuthority: c.issuingAuthority, fileUrl: c.attachment, status: c.status || 'valid' })),
      });
      iMig++;
    } catch (e) { if (e.code === 11000) iSkip++; else err(`${i.code}: ${e.message}`); iSkip++; }
  }
  log(`${iMig} 新增, ${iSkip} 已存在`);

  // ── Lead ────────────────────────────────────────────────────────────────────
  console.log('\n📦 Lead...');
  const HubLead = HubDB.model('Lead');
  let lMig = 0, lSkip = 0;
  for (const l of await HubLead.find().lean()) {
    try {
      if (await SS.Lead.findOne({ leadNo: l.leadNo })) { lSkip++; continue; }
      await SS.Lead.create({
        leadNo: l.leadNo, source: l.source,
        sourcePartnerId: l.sourceDistributor ? idMap.get(l.sourceDistributor.toString()) : l.sourceInstaller ? idMap.get(l.sourceInstaller.toString()) : null,
        customerName: l.customerName, customerPhone: l.customerPhone, customerAddress: l.customerAddress,
        region: l.region, propertyType: l.propertyType, roofType: l.roofType, monthlyBill: l.monthlyBill,
        interestProducts: l.interestProducts, budgetRange: l.budgetRange, status: l.status,
        assignedPartnerId: l.assignedTo ? idMap.get(l.assignedTo.toString()) : null,
        assignedPartnerType: l.assignedToType, expectedCloseDate: l.expectedCloseDate, lostReason: l.lostReason, notes: l.notes,
        createdAt: l.createdAt, updatedAt: l.updatedAt,
      });
      lMig++;
    } catch (e) { if (e.code === 11000) lSkip++; else err(`${l.leadNo}: ${e.message}`); lSkip++; }
  }
  log(`${lMig} 新增, ${lSkip} 已存在`);

  // ── Opportunity ────────────────────────────────────────────────────────────
  console.log('\n📦 Opportunity...');
  const HubOpp = HubDB.model('Opportunity');
  let oMig = 0, oSkip = 0;
  for (const o of await HubOpp.find().lean()) {
    try {
      if (await SS.Opportunity.findOne({ oppNo: o.oppNo })) { oSkip++; continue; }
      await SS.Opportunity.create({
        oppNo: o.oppNo, leadId: o.leadId ? idMap.get(o.leadId.toString()) : null,
        title: o.title, customerName: o.customerName, customerPhone: o.customerPhone,
        assignedPartnerId: o.assignedDistributor ? idMap.get(o.assignedDistributor.toString()) : o.assignedInstaller ? idMap.get(o.assignedInstaller.toString()) : null,
        productType: o.productType, systemCapacity: o.systemCapacity, estimatedAmount: o.estimatedAmount,
        probability: o.probability, stage: o.stage, expectedCloseDate: o.expectedCloseDate,
        actualCloseDate: o.actualCloseDate, lostReason: o.lostReason, notes: o.notes,
        createdAt: o.createdAt, updatedAt: o.updatedAt,
      });
      oMig++;
    } catch (e) { if (e.code === 11000) oSkip++; else err(`${o.oppNo}: ${e.message}`); oSkip++; }
  }
  log(`${oMig} 新增, ${oSkip} 已存在`);

  // ── Order ──────────────────────────────────────────────────────────────────
  console.log('\n📦 Order...');
  const HubOrder = HubDB.model('Order');
  let ordMig = 0, ordSkip = 0;
  for (const o of await HubOrder.find().lean()) {
    try {
      if (await SS.Order.findOne({ orderNo: o.orderNo })) { ordSkip++; continue; }
      await SS.Order.create({
        orderNo: o.orderNo, customerName: o.customerName, customerPhone: o.customerPhone,
        customerAddress: o.customerAddress, region: o.region, productType: o.productType,
        productModel: o.productModel, quantity: o.quantity, totalAmount: o.totalAmount, status: o.status,
        sourcePartnerId: o.sourceDistributor ? idMap.get(o.sourceDistributor.toString()) : null,
        assignedInstallerId: o.assignedInstaller ? idMap.get(o.assignedInstaller.toString()) : null,
        leadId: o.leadId ? idMap.get(o.leadId.toString()) : null,
        opportunityId: o.opportunityId ? idMap.get(o.opportunityId.toString()) : null,
        installationDate: o.installationDate, completionDate: o.completionDate,
        commissionAmount: o.commissionAmount, commissionStatus: o.commissionStatus, notes: o.notes,
        createdAt: o.createdAt, updatedAt: o.updatedAt,
      });
      ordMig++;
    } catch (e) { if (e.code === 11000) ordSkip++; else err(`${o.orderNo}: ${e.message}`); ordSkip++; }
  }
  log(`${ordMig} 新增, ${ordSkip} 已存在`);

  // ── Commission ─────────────────────────────────────────────────────────────
  console.log('\n📦 Commission...');
  const HubComm = HubDB.model('Commission');
  let cMig = 0, cSkip = 0;
  for (const c of await HubComm.find().lean()) {
    try {
      if (await SS.Commission.findOne({ commissionNo: c.commissionNo })) { cSkip++; continue; }
      await SS.Commission.create({
        commissionNo: c.commissionNo,
        orderId: c.orderId ? idMap.get(c.orderId.toString()) : null,
        distributorId: c.distributorId ? idMap.get(c.distributorId.toString()) : null,
        installerId: c.installerId ? idMap.get(c.installerId.toString()) : null,
        amount: c.amount, type: c.type, status: c.status, period: c.period,
        paidDate: c.paidDate, paidMethod: c.paidMethod, transactionRef: c.transactionRef, notes: c.notes,
        createdAt: c.createdAt, updatedAt: c.updatedAt,
      });
      cMig++;
    } catch (e) { if (e.code === 11000) cSkip++; else err(`${c.commissionNo}: ${e.message}`); cSkip++; }
  }
  log(`${cMig} 新增, ${cSkip} 已存在`);

  // ── ApprovalTemplate ───────────────────────────────────────────────────────
  console.log('\n📦 ApprovalTemplate...');
  const HubTpl = HubDB.model('ApprovalTemplate');
  let tMig = 0, tSkip = 0;
  for (const t of await HubTpl.find().lean()) {
    try {
      if (await SS.ApprovalTemplate.findOne({ code: t.code })) { tSkip++; continue; }
      await SS.ApprovalTemplate.create({
        code: t.code, name: t.name, description: t.description,
        entityType: t.entityType, action: t.action, isActive: t.isActive !== false,
        nodes: (t.nodes || []).map(n => ({
          name: n.name, order: n.order, approvalType: n.approvalType,
          approvers: (n.approvers || []).map(a => ({ type: a.type, userId: a.userId, role: a.role, department: a.department, partnerType: a.partnerType, partnerEntityId: a.partnerEntityId })),
        })),
        createdAt: t.createdAt, updatedAt: t.updatedAt,
      });
      tMig++;
    } catch (e) { if (e.code === 11000) tSkip++; else err(`${t.code}: ${e.message}`); tSkip++; }
  }
  log(`${tMig} 新增, ${tSkip} 已存在`);

  console.log('\n✅ 迁移完成！');
  console.log(`   ID 映射: ${idMap.size} 条`);
  for (const [k, v] of idMap.entries()) {
    console.log(`   Hub ${k} → SS ${v.toString()}`);
  }

  await mongoose.disconnect();
  await HubDB.close();
}

main().catch(e => { console.error('\n❌ 迁移失败:', e.message); process.exit(1); });
