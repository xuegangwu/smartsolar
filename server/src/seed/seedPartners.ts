import { Partner, PartnerUser, PointRule } from '../models/index.js';
import bcrypt from 'bcrypt';

export async function seedPartners() {
  // 积分规则
  const rules = [
    { name: '光伏安装积分', trigger: 'work_order_close', equipmentType: 'solar', basePointsPerUnit: 10, unit: 'kW', enabled: true, remark: '每kW装机容量得10分' },
    { name: '储能安装积分', trigger: 'work_order_close', equipmentType: 'battery', basePointsPerUnit: 15, unit: 'kWh', enabled: true, remark: '每kWh储能容量得15分' },
    { name: '充电桩安装积分', trigger: 'work_order_close', equipmentType: 'ev_charger', basePointsPerUnit: 50, unit: '台', enabled: true, remark: '每台充电桩得50分' },
    { name: '混合系统安装积分', trigger: 'work_order_close', equipmentType: 'mixed', basePointsPerUnit: 20, unit: 'kW', enabled: true, remark: '每kW装机容量得20分' },
  ];

  for (const rule of rules) {
    await PointRule.findOneAndUpdate({ name: rule.name }, rule, { upsert: true, new: true });
  }
  console.log('[Seed] PointRules seeded');

  // 演示渠道商
  const password = await bcrypt.hash('partner123', 10);

  // 根分销商（无上级）
  const dist = await Partner.findOneAndUpdate(
    { name: '华东新能源分销有限公司' },
    {
      name: '华东新能源分销有限公司',
      type: 'distributor',
      level: 'gold',
      totalPoints: 28000,
      availablePoints: 12500,
      phone: '021-88888888',
      address: '上海市浦东新区张江高科技园区',
      contactPerson: '李明',
      region: '华东',
      status: 'active',
    },
    { upsert: true, new: true }
  );

  await PartnerUser.findOneAndUpdate(
    { username: 'dist_admin' },
    { partnerId: dist._id, username: 'dist_admin', password, name: '李明', role: 'distributor', status: 'active' },
    { upsert: true, new: true }
  );

  // 二级安装商（挂在分销商下）
  const installers = [
    { name: '苏州绿能安装服务有限公司', level: 'silver', totalPoints: 8500, availablePoints: 6200, region: '华东', phone: '0512-66666666' },
    { name: '杭州阳光安装工程有限公司', level: 'bronze', totalPoints: 3200, availablePoints: 1800, region: '华东', phone: '0571-77777777' },
    { name: '南京光伏安装有限公司', level: 'gold', totalPoints: 22000, availablePoints: 9800, region: '华东', phone: '025-55555555' },
  ];

  for (const inst of installers) {
    const installer = await Partner.findOneAndUpdate(
      { name: inst.name },
      { ...inst, type: 'installer', parentId: dist._id, contactPerson: '张三', address: '待填写', status: 'active' },
      { upsert: true, new: true }
    );

    await PartnerUser.findOneAndUpdate(
      { username: `inst_${installers.indexOf(inst)}` },
      { partnerId: installer._id, username: `inst_${installers.indexOf(inst)}`, password, name: '安装商负责人', role: 'owner', status: 'active' },
      { upsert: true, new: true }
    );
  }

  console.log('[Seed] Partners seeded: 1 distributor + 3 installers');
  console.log('[Seed] Demo login: dist_admin / partner123');
}
