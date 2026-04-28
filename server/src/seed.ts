/**
 * SmartSolar Seed Script
 * 运行方式: npx tsx src/seed.ts
 * 会清空并重建所有集合
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

async function seed() {
  // Reuse existing Memory Server if available (for dev with running server)
  const existingUri = process.env.MONGO_URI || process.env.MONGO_MEMORY_SERVER_URI;
  let memServer: MongoMemoryServer | null = null;
  let uri: string;

  if (existingUri) {
    uri = existingUri;
    console.log('📦 Connecting to existing MongoDB:', uri.slice(0, 50), '\n');
  } else {
    memServer = await MongoMemoryServer.create();
    uri = memServer.getUri();
    console.log('📦 Created new memory MongoDB:', uri.slice(0, 50), '\n');
  }

  await mongoose.connect(uri);

  // ── 清空所有集合 ──────────────────────────────────────────────────────────────
  const models = [
    'Station', 'EquipmentCategory', 'Equipment',
    'WorkOrder', 'Alert', 'InspectionPlan', 'SparePart', 'Personnel',
    'Partner', 'PartnerUser', 'Project', 'Milestone', 'ProjectDoc',
    'InstallerStats', 'PointRule', 'PointTransaction', 'PointRedemption',
    'Notification',
  ];
  for (const name of models) {
    try {
      await mongoose.connection.collections[name.toLowerCase() + 's']?.drop();
      console.log(`   Dropped: ${name}`);
    } catch {}
  }

  // ── 1. 电站 ──────────────────────────────────────────────────────────────────
  const stations = [
    {
      name: '苏州工业园光储充一体化',
      type: 'solar_storage',
      status: 'online',
      installedCapacity: 5000,
      peakPower: 4200,
      capacity: 2000, // kWh 储能
      owner: '苏州新能源有限公司',
      contact: '张工 138-0000-0001',
      location: { address: '江苏省苏州市工业园区星湖街328号', lat: 31.2989, lng: 120.6853 },
      gridConnectionDate: '2022-06-15',
    },
    {
      name: '无锡储能电站',
      type: 'storage',
      status: 'online',
      installedCapacity: 0,
      peakPower: 1600,
      capacity: 4000,
      owner: '无锡储能科技有限公司',
      contact: '李工 139-0000-0002',
      location: { address: '江苏省无锡市新吴区太湖大道888号', lat: 31.5747, lng: 120.2925 },
      gridConnectionDate: '2023-01-20',
    },
    {
      name: '杭州光储一体化电站',
      type: 'solar_storage',
      status: 'maintenance',
      installedCapacity: 7500,
      peakPower: 6800,
      capacity: 3000,
      owner: '杭州光储有限公司',
      contact: '王工 137-0000-0003',
      location: { address: '浙江省杭州市滨江区江南大道1000号', lat: 30.2741, lng: 120.1551 },
      gridConnectionDate: '2022-09-01',
    },
  ];

  const { Station } = await import('./models/index.js');
  const { EquipmentCategory } = await import('./models/index.js');
  const { Equipment } = await import('./models/index.js');
  const { WorkOrder } = await import('./models/index.js');
  const { Alert } = await import('./models/index.js');
  const { Technician, Personnel } = await import('./models/index.js');

  const createdStations = await Station.insertMany(stations);
  console.log(`✅ Inserted ${createdStations.length} stations\n`);

  // ── 2. 设备类型 + 设备台账 ───────────────────────────────────────────────────
  const suzhouId = createdStations[0]._id;
  const wuxiId = createdStations[1]._id;
  const hangzhouId = createdStations[2]._id;

  const categories = [
    { stationId: suzhouId, name: '光伏组串A区', type: 'solar' },
    { stationId: suzhouId, name: '光伏组串B区', type: 'solar' },
    { stationId: suzhouId, name: '储能电池簇', type: 'battery' },
    { stationId: suzhouId, name: '储能变流器PCS', type: 'pcs' },
    { stationId: suzhouId, name: '充电桩', type: 'ev_charger' },
    { stationId: wuxiId, name: '储能电池簇', type: 'battery' },
    { stationId: wuxiId, name: '储能变流器PCS', type: 'pcs' },
    { stationId: hangzhouId, name: '光伏组串', type: 'solar' },
    { stationId: hangzhouId, name: '储能电池', type: 'battery' },
  ];
  const createdCats = await EquipmentCategory.insertMany(categories);
  console.log(`✅ Inserted ${createdCats.length} equipment categories\n`);

  const equipments = [
    { stationId: suzhouId, categoryId: createdCats[0]._id, name: '华为组串式逆变器SUN2000-185KTL-A1', type: 'solar', brand: '华为', model: 'SUN2000-185KTL', serialNumber: 'HW20220615001', ratedPower: 185, status: 'online', installationDate: new Date('2022-06-15'), warrantyExpire: new Date('2027-06-15') },
    { stationId: suzhouId, categoryId: createdCats[0]._id, name: '华为组串式逆变器SUN2000-185KTL-A2', type: 'solar', brand: '华为', model: 'SUN2000-185KTL', serialNumber: 'HW20220615002', ratedPower: 185, status: 'online', installationDate: new Date('2022-06-15'), warrantyExpire: new Date('2027-06-15') },
    { stationId: suzhouId, categoryId: createdCats[1]._id, name: '华为组串式逆变器SUN2000-185KTL-B1', type: 'solar', brand: '华为', model: 'SUN2000-185KTL', serialNumber: 'HW20220615003', ratedPower: 185, status: 'offline', installationDate: new Date('2022-06-15'), warrantyExpire: new Date('2027-06-15') },
    { stationId: suzhouId, categoryId: createdCats[2]._id, name: '宁德时代电池簇PACK-01', type: 'battery', brand: '宁德时代', model: 'CATL-BMS-200', serialNumber: 'CATL202200501', ratedPower: 500, status: 'online', installationDate: new Date('2022-06-15'), warrantyExpire: new Date('2027-06-15') },
    { stationId: suzhouId, categoryId: createdCats[3]._id, name: '阳光电源储能变流器PCS-500', type: 'pcs', brand: '阳光电源', model: 'PCS-500', serialNumber: 'SPE202200601', ratedPower: 500, status: 'online', installationDate: new Date('2022-06-15'), warrantyExpire: new Date('2027-06-15') },
    { stationId: suzhouId, categoryId: createdCats[4]._id, name: '特来电120kW直流充电桩CH-01', type: 'ev_charger', brand: '特来电', model: 'TELD-DC120', serialNumber: 'TELD202200701', ratedPower: 120, status: 'online', installationDate: new Date('2022-06-15'), warrantyExpire: new Date('2027-06-15') },
    { stationId: wuxiId, categoryId: createdCats[5]._id, name: '比亚迪刀片电池簇PACK-W1', type: 'battery', brand: '比亚迪', model: 'BYD-Blade-400', serialNumber: 'BYD202300101', ratedPower: 800, status: 'online', installationDate: new Date('2023-01-20'), warrantyExpire: new Date('2028-01-20') },
    { stationId: wuxiId, categoryId: createdCats[6]._id, name: '科华恒盛储能变流器PCS-800', type: 'pcs', brand: '科华恒盛', model: 'PCS-800', serialNumber: 'KH202300102', ratedPower: 800, status: 'online', installationDate: new Date('2023-01-20'), warrantyExpire: new Date('2028-01-20') },
    { stationId: hangzhouId, categoryId: createdCats[7]._id, name: '隆基Hi-MO 5光伏组件LP-185-02', type: 'solar', brand: '隆基绿能', model: 'Hi-MO 5', serialNumber: 'LONGI202209001', ratedPower: 550, status: 'maintenance', installationDate: new Date('2022-09-01'), warrantyExpire: new Date('2027-09-01') },
  ];
  const createdEquipments = await Equipment.insertMany(equipments);
  console.log(`✅ Inserted ${createdEquipments.length} equipments\n`);

  // ── 3. 运维人员 (Personnel) ────────────────────────────────────────────────
  const personnel = [
    // 这3个对应 AuthUser 的账号（authId = 用户ID）
    { authId: '1', name: '系统管理员', phone: '138-0000-0001', role: 'admin', organization: '集团总部', status: 'active', workStatus: 'available', skills: ['系统管理'] },
    { authId: '2', name: '运维主值', phone: '138-0000-0002', role: 'operator', organization: '集团总部', status: 'active', workStatus: 'available', skills: ['监控', '调度'] },
    { authId: '3', name: '张伟', phone: '138-1111-0001', role: 'technician', organization: '华东区域', status: 'active', workStatus: 'available', skills: ['光伏', '储能', '充电桩'] },
    // 以下为纯技术人员档案（无登录账号）
    { name: '李强', phone: '139-2222-0002', role: 'technician', organization: '华东区域', status: 'active', workStatus: 'busy', skills: ['储能', 'PCS'] },
    { name: '王鹏', phone: '137-3333-0003', role: 'technician', organization: '华北区域', status: 'active', workStatus: 'available', skills: ['光伏', '通讯'] },
    { name: '赵亮', phone: '136-4444-0004', role: 'technician', organization: '华北区域', status: 'active', workStatus: 'offline', skills: ['充电桩', '电气'] },
  ];
  const createdPersonnel = await Personnel.insertMany(personnel);
  console.log(`✅ Inserted ${createdPersonnel.length} personnel\n`);

  // 保存技术人员ID（用于工单派发）
  const techIds = {
    张伟: createdPersonnel[2]._id,   // authId='3' 的张伟
    李强: createdPersonnel[3]._id,
    王鹏: createdPersonnel[4]._id,
    赵亮: createdPersonnel[5]._id,
  };

  // ── 4. 工单 ──────────────────────────────────────────────────────────────────
  const workOrders = [
    {
      orderNo: 'WO20260409001',
      stationId: createdStations[0]._id,
      equipmentId: createdEquipments[2]._id, // 华为逆变器B1（离线）
      title: '华为逆变器B1通讯中断',
      description: '苏州站光伏组串B区华为逆变器SUN2000-185KTL与EMS通讯中断，数据停止上报30分钟，需要现场检查通讯模块和网线配置。',
      type: 'fault',
      priority: 'urgent',
      status: 'processing',
      assigneeId: techIds.张伟,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      orderNo: 'WO20260408002',
      stationId: createdStations[2]._id,
      equipmentId: createdEquipments[8]._id, // 隆基组件
      title: '隆基组件定期巡检',
      description: '杭州站光伏组件季度巡检，检查组件表面清洁度、支架紧固情况、接线盒温度。',
      type: 'inspection',
      priority: 'normal',
      status: 'closed',
      assigneeId: techIds.王鹏,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
    },
    {
      orderNo: 'WO20260407003',
      stationId: createdStations[0]._id,
      equipmentId: createdEquipments[4]._id, // PCS
      title: 'PCS功率模块预防性维护',
      description: '储能变流器PCS-500运行满一年，进行预防性维护：清洁滤网、检查IGBT温度、校准功率模块。',
      type: 'maintenance',
      priority: 'important',
      status: 'assigned',
      assigneeId: techIds.李强,
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
  ];
  const createdOrders = await WorkOrder.insertMany(workOrders);
  console.log(`✅ Inserted ${createdOrders.length} work orders\n`);

  // ── 5. 告警 ──────────────────────────────────────────────────────────────────
  const alerts = [
    { stationId: createdStations[0]._id, equipmentId: createdEquipments[2]._id, level: 'critical', code: 'COMM_001', message: '华为逆变器SUN2000-185KTL-B1通讯中断超过30分钟', acknowledged: false },
    { stationId: createdStations[0]._id, equipmentId: createdEquipments[4]._id, level: 'minor', code: 'TEMP_002', message: 'PCS-500 IGBT温度偏高：65°C（阈值60°C）', acknowledged: true, acknowledgedAt: new Date() },
    { stationId: createdStations[2]._id, equipmentId: createdEquipments[8]._id, level: 'major', code: 'PERF_003', message: '隆基组件组串2发电效率下降15%', acknowledged: false },
    { stationId: createdStations[1]._id, equipmentId: createdEquipments[6]._id, level: 'minor', code: 'SOC_004', message: '比亚迪电池簇SOC校准提示', acknowledged: true },
    { stationId: createdStations[0]._id, equipmentId: createdEquipments[0]._id, level: 'major', code: 'GRID_005', message: '电网电压波动：逆变器限制输出功率10%', acknowledged: false },
  ];
  const createdAlerts = await Alert.insertMany(alerts);
  console.log(`✅ Inserted ${createdAlerts.length} alerts\n`);

  // ── Partners（分销商 + 安装商）────────────────────────────────────────────────
  const { Partner, PartnerUser, Project, InstallerStats, PROJECT_PHASES, Notification } = await import('./models/index.js');
  const bcrypt = await import('bcrypt');

  const distPartner = await Partner.create({
    name: '华东新能源分销有限公司', type: 'distributor', level: 'gold',
    region: '华东', address: '上海市浦东新区张江高科技园区',
    contactPerson: '李明辉', phone: '138-1700-0001', status: 'active',
    totalPoints: 28500, availablePoints: 14200,
  });

  const installer1 = await Partner.create({
    name: '南京光腾光伏安装有限公司', type: 'installer', level: 'silver',
    region: '华东', address: '南京市栖霞区经开区',
    contactPerson: '张伟强', phone: '138-1700-0002', status: 'active',
    parentPartnerId: distPartner._id,
    totalPoints: 8200, availablePoints: 5600,
    totalInstallations: 47, totalCapacity: 235000,
    staffCount: 28, serviceRegions: ['南京市', '镇江市', '扬州市'],
    specializedTypes: ['residential', 'commercial'],
    businessLicense: '91320114MA1XXXXXXXX',
    rating: 4.7,
  });

  const installer2 = await Partner.create({
    name: '苏州绿能电气安装有限公司', type: 'installer', level: 'bronze',
    region: '华东', address: '苏州市工业园区星湖街328号',
    contactPerson: '王建林', phone: '138-1700-0003', status: 'active',
    parentPartnerId: distPartner._id,
    totalPoints: 3400, availablePoints: 2100,
    totalInstallations: 18, totalCapacity: 90000,
    staffCount: 12, serviceRegions: ['苏州市', '无锡市', '常州市'],
    specializedTypes: ['residential'],
    businessLicense: '91320594MA1XXXXXXXX',
    rating: 4.5,
  });

  const installer3 = await Partner.create({
    name: '杭州晴天光储安装有限公司', type: 'installer', level: 'gold',
    region: '华东', address: '杭州市滨江区江南大道388号',
    contactPerson: '陈志远', phone: '138-1700-0004', status: 'active',
    totalPoints: 22000, availablePoints: 18500,
    totalInstallations: 126, totalCapacity: 630000,
    staffCount: 55, serviceRegions: ['杭州市', '宁波市', '温州市', '嘉兴市'],
    specializedTypes: ['residential', 'commercial', 'industrial'],
    businessLicense: '91330108MA2XXXXXXXX',
    rating: 4.9,
  });

  // PartnerUser（渠道商账号）
  await PartnerUser.create({ partnerId: distPartner._id, username: 'dist_admin', password: await bcrypt.hash('partner123', 10), name: '李明辉', role: 'owner' });
  await PartnerUser.create({ partnerId: installer1._id, username: 'nj_installer', password: await bcrypt.hash('partner123', 10), name: '张伟强', role: 'owner' });
  await PartnerUser.create({ partnerId: installer2._id, username: 'sz_installer', password: await bcrypt.hash('partner123', 10), name: '王建林', role: 'owner' });
  await PartnerUser.create({ partnerId: installer3._id, username: 'hz_installer', password: await bcrypt.hash('partner123', 10), name: '陈志远', role: 'owner' });
  console.log(`✅ Inserted 1 distributor + 3 installers + 4 partner users\n`);

  // ── Projects（项目建设）────────────────────────────────────────────────────
  const projects = [
    {
      name: '苏州工业园光储充一体化项目', code: 'PJ202604-001', type: 'solar_storage',
      location: { address: '江苏省苏州市工业园区星湖街328号' }, capacity: 2000,
      owner: { name: '苏州星湖新能源有限公司', contact: '赵海涛', phone: '139-0620-0001' },
      installerPartnerId: installer2._id,
      phase: '施工建设', progress: 65,
      planStartDate: new Date('2026-02-01'), planEndDate: new Date('2026-06-30'),
      budget: 1200, actualCost: 780,
      phases: PROJECT_PHASES.map((p, i) => ({
        name: p, status: i < 3 ? 'completed' : i === 3 ? 'in_progress' : 'pending', progress: i < 3 ? 100 : i === 3 ? 65 : 0,
      })),
      status: 'in_progress',
    },
    {
      name: '南京商厦BIPV光伏改造项目', code: 'PJ202604-002', type: 'solar',
      location: { address: '江苏省南京市鼓楼区中山北路188号' }, capacity: 500,
      owner: { name: '南京商厦股份有限公司', contact: '周慧敏', phone: '139-0620-0002' },
      installerPartnerId: installer1._id,
      phase: '设备采购', progress: 35,
      planStartDate: new Date('2026-03-15'), planEndDate: new Date('2026-08-15'),
      budget: 350, actualCost: 120,
      phases: PROJECT_PHASES.map((p, i) => ({
        name: p, status: i < 2 ? 'completed' : i === 2 ? 'in_progress' : 'pending', progress: i < 2 ? 100 : i === 2 ? 35 : 0,
      })),
      status: 'in_progress',
    },
    {
      name: '杭州未来社区光储一体化项目', code: 'PJ202604-003', type: 'solar_storage',
      location: { address: '浙江省杭州市滨江区江南大道388号' }, capacity: 3500,
      owner: { name: '杭州未来社区开发有限公司', contact: '陈志强', phone: '139-0620-0003' },
      installerPartnerId: installer3._id,
      phase: '设计审批', progress: 20,
      planStartDate: new Date('2026-04-01'), planEndDate: new Date('2026-12-31'),
      budget: 2800, actualCost: 560,
      phases: PROJECT_PHASES.map((p, i) => ({
        name: p, status: i < 1 ? 'completed' : i === 1 ? 'in_progress' : 'pending', progress: i < 1 ? 100 : i === 1 ? 20 : 0,
      })),
      status: 'in_progress',
    },
    {
      name: '无锡分布式光伏发电项目', code: 'PJ202604-004', type: 'solar',
      location: { address: '江苏省无锡市新吴区太湖大道888号' }, capacity: 800,
      owner: { name: '无锡太湖科技园管理委员会', contact: '吴晓峰', phone: '139-0620-0004' },
      phase: '完工移交', progress: 100,
      planStartDate: new Date('2025-10-01'), planEndDate: new Date('2026-03-31'),
      budget: 560, actualCost: 545,
      phases: PROJECT_PHASES.map(p => ({ name: p, status: 'completed', progress: 100 })),
      status: 'completed', actualEndDate: new Date('2026-03-28'),
    },
  ];
  const createdProjects = await Project.insertMany(projects);
  console.log(`✅ Inserted ${createdProjects.length} projects\n`);

  // ── InstallerStats（月度业绩）───────────────────────────────────────────────
  const months = ['2026-01', '2026-02', '2026-03', '2026-04'];
  const statsData = [];
  for (const inst of [installer1, installer2, installer3]) {
    for (const month of months) {
      const isRecent = month === '2026-04';
      statsData.push({
        installerId: inst._id, month,
        totalInstallations: isRecent ? Math.floor(Math.random() * 5) + 1 : Math.floor(Math.random() * 8) + 2,
        totalCapacity: isRecent ? Math.floor(Math.random() * 20000) + 5000 : Math.floor(Math.random() * 30000) + 10000,
        workOrderCount: isRecent ? Math.floor(Math.random() * 8) + 2 : Math.floor(Math.random() * 12) + 3,
        qualityScore: (4 + Math.random()).toFixed(2),
        complaintCount: Math.floor(Math.random() * 3),
      });
    }
  }
  await InstallerStats.insertMany(statsData);
  console.log(`✅ Inserted ${statsData.length} installer stats records\n`);

  // ── Notifications（通知）────────────────────────────────────────────────────
  const notifications = [
    { type: 'system', title: '系统已升级到 v1.2.0', content: '本次更新：新增项目建设管理、安装商管理模块，优化了工单处理流程。', read: false, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { type: 'alert', title: '南京商厦项目设备采购阶段延迟', content: '因供应商交期调整，南京商厦BIPV项目设备采购阶段预计延期3天。', read: false, createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000) },
    { type: 'system', title: '苏州工业园项目施工进度更新', content: '苏州工业园光储充一体化项目已完成基础施工，进入设备安装阶段，当前进度65%。', read: true, createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    { type: 'system', title: '积分体系上线公告', content: '渠道商积分体系正式上线，工单完成后自动赚取积分，可用于兑换商城礼品。', read: true, createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
    { type: 'system', title: '无锡分布式项目并网验收通过', content: '无锡分布式光伏发电项目已通过电网公司并网验收，正式投入运行！', read: false, createdAt: new Date(Date.now() - 30 * 60 * 1000) },
  ];
  const createdNotifications = await Notification.insertMany(notifications);
  console.log(`✅ Inserted ${createdNotifications.length} notifications\n`);

  // ── 汇总 ─────────────────────────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Seed 完成！数据汇总：');
  console.log(`   电站:    ${createdStations.length} 个`);
  console.log(`   设备类型: ${createdCats.length} 个`);
  console.log(`   设备台账: ${createdEquipments.length} 条`);
  console.log(`   运维人员: ${createdPersonnel.length} 人`);
  console.log(`   工单:    ${createdOrders.length} 个`);
  console.log(`   告警:    ${createdAlerts.length} 条`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 启动客户端: cd ../client && npm run dev');
  console.log('   访问地址: http://localhost:3004 (admin / admin)\n');

  await mongoose.disconnect();
  if (memServer) await memServer.stop();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
