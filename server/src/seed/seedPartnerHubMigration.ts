/**
 * PartnerHub → SmartSolar 数据迁移脚本
 * 
 * 使用方法:
 *   cd server && npx tsx src/seed/seedPartnerHubMigration.ts
 * 
 * 迁移内容:
 *   Distributor → Partner (type='distributor')
 *   Installer   → Partner (type='installer')
 *   Lead        → Lead (合并版本)
 * 
 * 前提:
 *   PartnerHub MongoDB URI 已配置在 MONGODB_HUB_URI 环境变量
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

// ══════════════════════════════════════════════════════════════
// 工具函数
// ══════════════════════════════════════════════════════════════

function log(msg: string) { console.log(`  ${msg}`); }
function err(msg: string) { console.error(`  ❌ ${msg}`); }

// 通用对象迁移函数
async function migrateCollection<
  S extends mongoose.Document,
  T extends mongoose.Document
>(
  hubCollection: string,
  smartSolarCollection: string,
  transform: (doc: any) => any,
  options: {
    idMap?: Map<string, mongoose.Types.ObjectId>;
    targetField?: string;   // 用于建立 ID 映射的字段名
    filter?: (doc: any) => boolean;
  } = {}
): Promise<{ migrated: number; skipped: number }> {
  const { idMap: map, targetField, filter } = options;
  const hubModel = HubDB.model<S>(hubCollection);
  const targetModel = DB.model<T>(smartSolarCollection);

  let docs = await hubModel.find(filter || {}).lean();
  if (filter) docs = docs.filter(filter);

  let migrated = 0, skipped = 0;

  for (const doc of docs) {
    try {
      // 检查是否已存在（按 code 或 unique index）
      const existing = targetField
        ? await targetModel.findOne({ [targetField]: (doc as any)[targetField] })
        : await targetModel.findOne({ code: (doc as any).code });
      if (existing) { skipped++; continue; }

      const transformed = transform(doc);
      if (map && (doc as any)._id) {
        const newId = new mongoose.Types.ObjectId();
        map.set((doc as any)._id.toString(), newId);
      }
      await targetModel.create(transformed);
      migrated++;
    } catch (e: any) {
      err(`${hubCollection} ${(doc as any)._id || (doc as any).code}: ${e.message}`);
      skipped++;
    }
  }

  return { migrated, skipped };
}

// ══════════════════════════════════════════════════════════════
// 迁移：Distributor → Partner
// ══════════════════════════════════════════════════════════════

async function migrateDistributors(): Promise<void> {
  console.log('\n📦 迁移 Distributor → Partner (type=distributor)...');

  const { migrated, skipped } = await migrateCollection(
    'Distributor', 'Partner',
    (d: any) => ({
      code: d.code,
      name: d.companyName,
      type: 'distributor',
      parentPartnerId: d.parentDistributor
        ? idMap.get(d.parentDistributor.toString()) || null
        : null,
      level: d.level === 'province' ? 'gold'
           : d.level === 'city' ? 'silver'
           : d.level === 'district' ? 'bronze'
           : 'bronze',
      status: d.status,
      contactPerson: d.contactName,
      phone: d.contactPhone,
      email: d.email,
      address: d.address,
      region: d.region,
      legalPerson: d.legalPerson,
      commissionRate: d.commissionRate,
      creditLimit: d.creditLimit || 0,
      creditUsed: d.creditUsed || 0,
      annualTarget: d.annualTarget || 0,
      annualAchieved: d.annualAchieved || 0,
      bankAccount: d.bankInfo ? {
        bankName: d.bankInfo.bankName,
        accountName: d.bankInfo.accountName,
        accountNumber: d.bankInfo.accountNumber,
      } : undefined,
      qualifications: (d.certifications || []).map((c: any) => ({
        name: c.certType,
        number: c.certNo,
        issueDate: c.issueDate,
        expireDate: c.expiryDate,
        issuingAuthority: c.issuingAuthority,
        fileUrl: c.attachment,
        status: c.status || 'valid',
      })),
    }),
    { idMap, targetField: 'code' }
  );

  log(`Distributor: ${migrated} 新增, ${skipped} 已存在/跳过`);
}

// ══════════════════════════════════════════════════════════════
// 迁移：Installer → Partner
// ══════════════════════════════════════════════════════════════

async function migrateInstallers(): Promise<void> {
  console.log('\n📦 迁移 Installer → Partner (type=installer)...');

  const { migrated, skipped } = await migrateCollection(
    'Installer', 'Partner',
    (i: any) => ({
      code: i.code,
      name: i.companyName || i.name,
      type: 'installer',
      parentPartnerId: i.boundDistributor
        ? idMap.get(i.boundDistributor.toString()) || null
        : null,
      level: 'bronze',  // 安装商默认铜牌，后续按积分计算
      status: i.status,
      contactPerson: i.name,
      phone: i.phone,
      email: i.email,
      address: i.address,
      region: i.region,
      serviceTypes: i.serviceTypes || [],
      specializedTypes: i.serviceTypes || [],
      teamSize: i.teamSize || i.certification?.teamSize,
      coverageRadius: i.coverageRadius,
      totalInstallations: i.totalInstallations || 0,
      completedInstallations: i.completedInstallations || 0,
      totalCapacity: 0,
      rating: i.rating || 5,
      onTimeRate: i.onTimeRate || 100,
      qualifications: (i.certifications || []).map((c: any) => ({
        name: c.certType,
        number: c.certNo,
        issueDate: c.issueDate,
        expireDate: c.expiryDate,
        issuingAuthority: c.issuingAuthority,
        fileUrl: c.attachment,
        status: c.status || 'valid',
      })),
    }),
    { idMap, targetField: 'code' }
  );

  log(`Installer: ${migrated} 新增, ${skipped} 已存在/跳过`);
}

// ══════════════════════════════════════════════════════════════
// 迁移：Lead（完整版，从 PartnerHub）
// ══════════════════════════════════════════════════════════════

async function migrateLeads(): Promise<void> {
  console.log('\n📦 迁移 Lead → Lead（PartnerHub 完整版）...');

  const HubLead = HubDB.model('Lead');
  const SmartLead = DB.model('Lead');

  const hubLeads = await HubLead.find().lean();
  let migrated = 0, skipped = 0;

  for (const l of hubLeads) {
    try {
      const existing = await SmartLead.findOne({ leadNo: l.leadNo });
      if (existing) { skipped++; continue; }

      await SmartLead.create({
        leadNo: l.leadNo,
        source: l.source,
        sourcePartnerId: l.sourceDistributor
          ? idMap.get(l.sourceDistributor.toString())
          : l.sourceInstaller
            ? idMap.get(l.sourceInstaller.toString())
            : null,
        referrerCustomerId: l.referrerId
          ? idMap.get(l.referrerId.toString())
          : null,
        customerName: l.customerName,
        customerPhone: l.customerPhone,
        customerAddress: l.customerAddress,
        region: l.region,
        propertyType: l.propertyType,
        roofType: l.roofType,
        monthlyBill: l.monthlyBill,
        interestProducts: l.interestProducts,
        budgetRange: l.budgetRange,
        status: l.status,
        assignedPartnerId: l.assignedTo
          ? idMap.get(l.assignedTo.toString())
          : null,
        assignedPartnerType: l.assignedToType,
        expectedCloseDate: l.expectedCloseDate,
        lostReason: l.lostReason,
        notes: l.notes,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      });
      migrated++;
    } catch (e: any) {
      err(`Lead ${l.leadNo}: ${e.message}`);
      skipped++;
    }
  }

  log(`Lead: ${migrated} 新增, ${skipped} 已存在/跳过`);
}

// ══════════════════════════════════════════════════════════════
// 迁移：Opportunity
// ══════════════════════════════════════════════════════════════

async function migrateOpportunities(): Promise<void> {
  console.log('\n📦 迁移 Opportunity...');

  const HubOpp = HubDB.model('Opportunity');
  const SmartOpp = DB.model('Opportunity');

  const opps = await HubOpp.find().lean();
  let migrated = 0, skipped = 0;

  for (const o of opps) {
    try {
      const existing = await SmartOpp.findOne({ oppNo: o.oppNo });
      if (existing) { skipped++; continue; }

      await SmartOpp.create({
        oppNo: o.oppNo,
        leadId: o.leadId ? idMap.get(o.leadId.toString()) : null,
        title: o.title,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        assignedPartnerId: o.assignedDistributor
          ? idMap.get(o.assignedDistributor.toString())
          : o.assignedInstaller
            ? idMap.get(o.assignedInstaller.toString())
            : null,
        productType: o.productType,
        systemCapacity: o.systemCapacity,
        estimatedAmount: o.estimatedAmount,
        probability: o.probability,
        stage: o.stage,
        expectedCloseDate: o.expectedCloseDate,
        actualCloseDate: o.actualCloseDate,
        competitor: o.competitor,
        lostReason: o.lostReason,
        orderId: o.orderId,
        notes: o.notes,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      });
      migrated++;
    } catch (e: any) {
      err(`Opportunity ${o.oppNo}: ${e.message}`);
      skipped++;
    }
  }

  log(`Opportunity: ${migrated} 新增, ${skipped} 已存在/跳过`);
}

// ══════════════════════════════════════════════════════════════
// 迁移：Order
// ══════════════════════════════════════════════════════════════

async function migrateOrders(): Promise<void> {
  console.log('\n📦 迁移 Order...');

  const HubOrder = HubDB.model('Order');
  const SmartOrder = DB.model('Order');

  const orders = await HubOrder.find().lean();
  let migrated = 0, skipped = 0;

  for (const o of orders) {
    try {
      const existing = await SmartOrder.findOne({ orderNo: o.orderNo });
      if (existing) { skipped++; continue; }

      await SmartOrder.create({
        orderNo: o.orderNo,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        customerAddress: o.customerAddress,
        region: o.region,
        productType: o.productType,
        productModel: o.productModel,
        quantity: o.quantity,
        totalAmount: o.totalAmount,
        status: o.status,
        sourcePartnerId: o.sourceDistributor
          ? idMap.get(o.sourceDistributor.toString())
          : null,
        assignedInstallerId: o.assignedInstaller
          ? idMap.get(o.assignedInstaller.toString())
          : null,
        leadId: o.leadId ? idMap.get(o.leadId.toString()) : null,
        opportunityId: o.opportunityId,
        projectId: o.projectId,
        installationDate: o.installationDate,
        completionDate: o.completionDate,
        commissionAmount: o.commissionAmount,
        commissionStatus: o.commissionStatus,
        notes: o.notes,
        createdAt: o.createdAt,
        updatedAt: o.updatedAt,
      });
      migrated++;
    } catch (e: any) {
      err(`Order ${o.orderNo}: ${e.message}`);
      skipped++;
    }
  }

  log(`Order: ${migrated} 新增, ${skipped} 已存在/跳过`);
}

// ══════════════════════════════════════════════════════════════
// 迁移：User → PartnerUser（认证体系）
// ══════════════════════════════════════════════════════════════

async function migrateUsers(): Promise<void> {
  console.log('\n📦 迁移 User → PartnerUser...');

  const HubUser = HubDB.model('User');
  const SmartPartnerUser = DB.model('PartnerUser');

  const users = await HubUser.find().lean();
  let migrated = 0, skipped = 0;

  for (const u of users) {
    try {
      const existing = await SmartPartnerUser.findOne({ username: u.username });
      if (existing) { skipped++; continue; }

      // 找到关联的 Partner（新 ID）
      let partnerId = u.partnerId
        ? idMap.get(u.partnerId.toString())
        : u.distributorId
          ? idMap.get(u.distributorId.toString())
          : null;

      await SmartPartnerUser.create({
        partnerId,
        username: u.username,
        password: u.passwordHash || u.password || '$2b$10$placeholder',  // PartnerHub bcrypt 不兼容，用占位符
        name: u.name || u.username,
        phone: u.phone,
        email: u.email,
        role: u.role === 'admin' ? 'admin'
            : u.role === 'distributor' ? 'distributor'
            : u.role === 'installer' ? 'owner'
            : u.role || 'staff',
        status: u.status === 'active' ? 'active' : 'disabled',
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      });
      migrated++;
    } catch (e: any) {
      err(`User ${u.username}: ${e.message}`);
      skipped++;
    }
  }

  log(`User → PartnerUser: ${migrated} 新增, ${skipped} 已存在/跳过`);
}

// ══════════════════════════════════════════════════════════════
// 执行迁移
// ══════════════════════════════════════════════════════════════

async function main() {
  console.log('═'.repeat(60));
  console.log('PartnerHub → SmartSolar 数据迁移');
  console.log('═'.repeat(60));

  try {
    // 顺序很重要：Partner 先迁移（其他实体依赖它）
    await migrateDistributors();   // Distributor → Partner (distributor)
    await migrateInstallers();     // Installer → Partner (installer)
    await migrateUsers();          // User → PartnerUser（依赖 Partner 映射）
    await migrateLeads();          // Lead（依赖 Partner 映射）
    await migrateOpportunities();  // Opportunity（依赖 Lead 映射）
    await migrateOrders();         // Order（依赖 Partner 映射）

    console.log('\n✅ 迁移完成！');
    console.log('\n📋 ID 映射表（Hub ObjectId → SmartSolar ObjectId）:');
    console.log(`   共 ${idMap.size} 条映射`);
    console.log('\n⚠️  注意事项:');
    console.log('   1. PartnerUser 的密码已设为占位符，需管理员重置');
    console.log('   2. 迁移完成后建议执行 seedPartners 补充演示账号');
    console.log('   3. 下一步：合并 Lead/Opportunity/Order 模型定义');
  } catch (e: any) {
    console.error('\n❌ 迁移失败:', e.message);
  } finally {
    await mongoose.disconnect();
    await HubDB.close();
  }
}

main();
