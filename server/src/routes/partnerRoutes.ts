import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { Partner, PartnerUser, PointTransaction, PointRedemption, PointRule, WorkOrder, PartnerTransfer, LEVEL_THRESHOLDS, LEVEL_MULTIPLIERS } from '../models/index.js';

const router = Router();
const PARTNER_JWT_SECRET = process.env.PARTNER_JWT_SECRET || 'smartsolar_partner_secret';
const PARTNER_JWT_EXPIRES = '30d';

// ─── 渠道商登录 ───────────────────────────────────────────────────────────────
router.post('/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.json({ success: false, message: '请输入用户名和密码' });
    }

    const user = await PartnerUser.findOne({ username, status: 'active' }).populate('partnerId');
    if (!user) {
      return res.json({ success: false, message: '用户名或密码错误' });
    }

    // 检查渠道商状态
    const partner = (user as any).partnerId;
    if (!partner || partner.status !== 'active') {
      return res.json({ success: false, message: '账号已被禁用，请联系管理员' });
    }

    const isValid = await bcrypt.compare(password, user.password).catch(() => false);
    if (!isValid && password !== 'partner123') { // 演示密码
      return res.json({ success: false, message: '用户名或密码错误' });
    }

    // 更新登录时间
    user.lastLoginAt = new Date();
    await (user as any).save();

    const token = jwt.sign(
      { sub: user._id, partnerId: partner._id, username: user.username, name: user.name, role: user.role },
      PARTNER_JWT_SECRET,
      { expiresIn: PARTNER_JWT_EXPIRES }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        name: user.name,
        role: user.role,
        partner: {
          id: partner._id,
          name: partner.name,
          type: partner.type,
          level: partner.level,
          totalPoints: partner.totalPoints,
          availablePoints: partner.availablePoints,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 渠道商中间件 ─────────────────────────────────────────────────────────────
function partnerAuth(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: '未登录' });
  }
  try {
    const decoded = jwt.verify(auth.slice(7), PARTNER_JWT_SECRET) as any;
    req.partnerUser = decoded;
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token无效' });
  }
}

// ─── 获取渠道商信息 ───────────────────────────────────────────────────────────
router.get('/me', partnerAuth, async (req: any, res) => {
  try {
    const partner = await Partner.findById(req.partnerUser.partnerId);
    if (!partner) return res.status(404).json({ success: false, message: '渠道商不存在' });
    res.json({ success: true, data: partner });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 获取渠道商 Dashboard 统计 ────────────────────────────────────────────────
router.get('/dashboard', partnerAuth, async (req: any, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;
    const partner = await Partner.findById(partnerId);
    if (!partner) return res.status(404).json({ success: false });

    // 积分流水（最近）
    const transactions = await PointTransaction.find({ partnerId })
      .sort({ createdAt: -1 }).limit(20).lean();

    // 待处理兑换
    const pendingRedemptions = await PointRedemption.find({ partnerId, status: 'pending' }).lean();

    // 下级安装商（如果是分销商）
    const subPartners = await Partner.find({ parentId: partnerId }).lean();

    // 等级进度
    const currentLevel = partner.level;
    const currentThreshold = LEVEL_THRESHOLDS[currentLevel as keyof typeof LEVEL_THRESHOLDS] || 0;
    const nextLevel = currentLevel === 'diamond' ? null :
      (currentLevel === 'gold' ? 'diamond' : currentLevel === 'silver' ? 'gold' : 'silver');
    const nextThreshold = nextLevel ? LEVEL_THRESHOLDS[nextLevel] : null;

    // 工单统计（该渠道商关联的工单，通过 WorkOrder 的 partnerId 或其他字段，这里简化为全部工单的统计）
    // 实际项目中工单应该关联到安装商
    const totalWorkOrders = await WorkOrder.countDocuments().lean();
    const openWorkOrders = await WorkOrder.countDocuments({ status: { $nin: ['closed'] } }).lean();

    res.json({
      success: true,
      data: {
        partner: {
          id: partner._id,
          name: partner.name,
          type: partner.type,
          level: partner.level,
          totalPoints: partner.totalPoints,
          availablePoints: partner.availablePoints,
          region: partner.region,
          status: partner.status,
        },
        levelProgress: {
          current: currentLevel,
          currentThreshold,
          nextLevel,
          nextThreshold,
          progress: nextThreshold
            ? Math.min(100, Math.round(((partner.totalPoints - currentThreshold) / (nextThreshold - currentThreshold)) * 100))
            : 100,
        },
        stats: {
          totalWorkOrders,
          openWorkOrders,
          subPartners: subPartners.length,
          pendingRedemptions: pendingRedemptions.length,
        },
        recentTransactions: transactions.slice(0, 10),
        subPartners: subPartners.map((p: any) => ({ id: p._id, name: p.name, level: p.level, totalPoints: p.totalPoints })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 渠道商 CRUD（管理员用）───────────────────────────────────────────────────

// 获取所有渠道商
router.get('/', async (req, res) => {
  try {
    const { type, level, status } = req.query;
    const filter: any = {};
    if (type) filter.type = type;
    if (level) filter.level = level;
    if (status) filter.status = status;

    const partners = await Partner.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: partners });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 创建渠道商（同时创建登录账号）
router.post('/', async (req, res) => {
  try {
    const { name, type, phone, address, contactPerson, region, description, username, password, userName } = req.body;
    if (!name || !type) {
      return res.json({ success: false, message: '名称和类型必填' });
    }

    const partner = await Partner.create({ name, type, phone, address, contactPerson, region, description });

    // 如果提供了用户名，创建渠道商账号
    if (username) {
      const hashed = await bcrypt.hash(password || 'partner123', 10);
      await PartnerUser.create({
        partnerId: partner._id,
        username,
        password: hashed,
        name: userName || name,
        role: 'owner',
      });
    }

    res.json({ success: true, data: partner });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// ─── 安装商专属 API ─────────────────────────────────────────────────────────
// GET /api/partners/installer/stations  - 获取安装商名下的电站
router.get('/installer/stations', partnerAuth, async (req: any, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;
    const stations = await (await import('../models/index.js')).Station
      .find({ installerPartnerId: partnerId })
      .lean();
    res.json({ success: true, data: stations });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/partners/installer/work-orders  - 获取安装商的工单
router.get('/installer/work-orders', partnerAuth, async (req: any, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;
    const { status } = req.query;
    const filter: any = { partnerId };
    if (status) filter.status = status;

    const workOrders = await (await import('../models/index.js')).WorkOrder
      .find(filter)
      .populate('stationId', 'name location')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: workOrders });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/partners/installer/dashboard  - 安装商工作台
router.get('/installer/dashboard', partnerAuth, async (req: any, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;
    const partner = await (await import('../models/index.js')).Partner.findById(partnerId).lean();
    if (!partner) return res.status(404).json({ success: false, message: '安装商不存在' });

    // 电站数量
    const stations = await (await import('../models/index.js')).Station.find({ installerPartnerId: partnerId }).lean();

    // 工单统计
    const totalWorkOrders = await (await import('../models/index.js')).WorkOrder.countDocuments({ partnerId });
    const openWorkOrders = await (await import('../models/index.js')).WorkOrder.countDocuments({ partnerId, status: { $nin: ['closed'] } });
    const myWorkOrders = await (await import('../models/index.js')).WorkOrder
      .find({ partnerId })
      .populate('stationId', 'name')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // 积分
    const transactions = await (await import('../models/index.js')).PointTransaction
      .find({ partnerId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    res.json({
      success: true,
      data: {
        partner: {
          id: partner._id, name: partner.name, type: partner.type,
          level: partner.level, totalPoints: partner.totalPoints,
          availablePoints: partner.availablePoints,
          totalInstallations: partner.totalInstallations || 0,
          totalCapacity: partner.totalCapacity || 0,
          region: partner.region, status: partner.status,
        },
        stats: {
          totalStations: stations.length,
          totalWorkOrders,
          openWorkOrders,
        },
        recentWorkOrders: myWorkOrders,
        recentTransactions: transactions.slice(0, 10),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/partners/installer/stations/:id  - 安装商认领/更新电站
router.put('/installer/stations/:id', partnerAuth, async (req: any, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;
    const station = await (await import('../models/index.js')).Station.findById(req.params.id);
    if (!station) return res.status(404).json({ success: false, message: '电站不存在' });
    station.installerPartnerId = partnerId;
    await station.save();
    res.json({ success: true, data: station });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 安装商归属分配（放在 /:id 之前，避免被误匹配）──────────────────────────────
router.put('/:id/assign', async (req, res) => {
  try {
    const { parentId, reason } = req.body;
    const installer = await Partner.findById(req.params.id);
    if (!installer) return res.status(404).json({ success: false, message: '安装商不存在' });
    if (installer.type !== 'installer') return res.status(400).json({ success: false, message: '只有安装商可以分配归属' });
    if (parentId) {
      const dist = await Partner.findById(parentId);
      if (!dist) return res.status(404).json({ success: false, message: '分销商不存在' });
      if (dist.type !== 'distributor') return res.status(400).json({ success: false, message: '归属对象必须是分销商' });
      if (dist.status !== 'active') return res.status(400).json({ success: false, message: '分销商状态已禁用' });
    }
    const fromDistributorId = installer.parentId;
    await PartnerTransfer.create({
      installerId: installer._id,
      fromDistributorId: fromDistributorId || undefined,
      toDistributorId: parentId || undefined,
      reason: reason || '',
    });
    installer.parentId = parentId || null;
    await installer.save();
    res.json({ success: true, data: installer });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/installers/:distributorId', async (req, res) => {
  try {
    const installers = await Partner.find({ parentId: req.params.distributorId, type: 'installer' })
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: installers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/transfers', async (req, res) => {
  try {
    const { installerId } = req.query;
    const filter: any = {};
    if (installerId) filter.installerId = installerId;
    const transfers = await PartnerTransfer.find(filter)
      .populate('installerId', 'name')
      .populate('fromDistributorId', 'name')
      .populate('toDistributorId', 'name')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();
    res.json({ success: true, data: transfers });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});



// ─── 积分规则 ─────────────────────────────────────────────────────────────────

router.get('/rules/points', async (req, res) => {
  try {
    const rules = await PointRule.find({}).lean();
    res.json({ success: true, data: rules });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/rules/points', async (req, res) => {
  try {
    const { name, trigger, equipmentType, basePointsPerUnit, unit, enabled, remark } = req.body;
    const rule = await PointRule.create({ name, trigger, equipmentType, basePointsPerUnit, unit, enabled, remark });
    res.json({ success: true, data: rule });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 积分流水 ──────────────────────────────────────────────────────────────────

router.get('/points/transactions', partnerAuth, async (req: any, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;
    const { limit = 50 } = req.query;
    const txns = await PointTransaction.find({ partnerId })
      .sort({ createdAt: -1 }).limit(Number(limit)).lean();
    res.json({ success: true, data: txns });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 积分兑换 ─────────────────────────────────────────────────────────────────

router.get('/redemptions', partnerAuth, async (req: any, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;
    const redemptions = await PointRedemption.find({ partnerId }).sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: redemptions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/redemptions', partnerAuth, async (req: any, res) => {
  try {
    const partnerId = req.partnerUser.partnerId;
    const { itemName, pointsCost, shippingAddress, contactPhone } = req.body;

    const partner = await Partner.findById(partnerId);
    if (!partner || partner.availablePoints < pointsCost) {
      return res.json({ success: false, message: '积分不足' });
    }

    const redemption = await PointRedemption.create({
      partnerId,
      itemName,
      pointsCost,
      shippingAddress,
      contactPhone,
      status: 'pending',
    });

    // 冻结积分（扣除可用积分）
    partner.availablePoints -= pointsCost;
    await partner.save();

    // 记录流水
    await PointTransaction.create({
      partnerId,
      type: 'redeem',
      amount: -pointsCost,
      balance: partner.availablePoints,
      description: `兑换：${itemName}`,
    });

    res.json({ success: true, data: redemption });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 积分赚取（工单关闭时触发）───────────────────────────────────────────────
// POST /api/partners/points/earn
router.post('/points/earn', async (req, res) => {
  try {
    const { workOrderId, partnerId, equipmentType, capacity, description } = req.body;

    if (!workOrderId || !partnerId) {
      return res.json({ success: false, message: '缺少参数' });
    }

    const partner = await Partner.findById(partnerId);
    if (!partner || partner.status !== 'active') {
      return res.json({ success: false, message: '渠道商无效' });
    }

    // 查询积分规则
    const rule = await PointRule.findOne({ trigger: 'work_order_close', enabled: true }).lean();
    if (!rule) {
      return res.json({ success: false, message: '未配置积分规则' });
    }

    const basePoints = rule.basePointsPerUnit * (capacity || 1);
    const multiplier = LEVEL_MULTIPLIERS[partner.level] || 1.0;
    const actualPoints = Math.floor(basePoints * multiplier);

    partner.totalPoints += actualPoints;
    partner.availablePoints += actualPoints;

    // 自动升降级
    const newLevel = (() => {
      if (partner.totalPoints >= LEVEL_THRESHOLDS.diamond) return 'diamond';
      if (partner.totalPoints >= LEVEL_THRESHOLDS.gold) return 'gold';
      if (partner.totalPoints >= LEVEL_THRESHOLDS.silver) return 'silver';
      return 'bronze';
    })();
    const levelChanged = newLevel !== partner.level;
    if (levelChanged) {
      partner.level = newLevel;
    }

    await partner.save();

    await PointTransaction.create({
      partnerId,
      type: 'earn',
      amount: actualPoints,
      balance: partner.availablePoints,
      description: description || `完成工单 ${workOrderId}`,
      workOrderId,
      multiplier,
    });

    res.json({
      success: true,
      data: {
        actualPoints,
        newLevel: partner.level,
        levelChanged,
        totalPoints: partner.totalPoints,
        availablePoints: partner.availablePoints,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 兑换管理（管理员）─────────────────────────────────────────────────────────

router.get('/admin/redemptions', async (req, res) => {
  try {
    const { status } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    const redemptions = await PointRedemption.find(filter)
      .populate('partnerId', 'name level')
      .sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: redemptions });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.patch('/admin/redemptions/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const redemption = await PointRedemption.findById(req.params.id);
    if (!redemption) return res.status(404).json({ success: false, message: '不存在' });

    if (status === 'rejected') {
      // 拒绝：返还积分
      const partner = await Partner.findById(redemption.partnerId);
      if (partner) {
        partner.availablePoints += redemption.pointsCost;
        await partner.save();
        await PointTransaction.create({
          partnerId: partner._id,
          type: 'adjust',
          amount: redemption.pointsCost,
          balance: partner.availablePoints,
          description: `兑换拒绝退款：${redemption.itemName}`,
        });
      }
    }

    redemption.status = status;
    redemption.handledAt = new Date();
    await redemption.save();

    res.json({ success: true, data: redemption });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});


// 获取单个渠道商
router.get('/:id', async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id).lean();
    if (!partner) return res.status(404).json({ success: false, message: '不存在' });
    const users = await PartnerUser.find({ partnerId: partner._id }).select('-password').lean();
    const stats = await PointTransaction.aggregate([
      { $match: { partnerId: partner._id } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } },
    ]);
    res.json({ success: true, data: { ...partner, users, pointStats: stats } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 更新渠道商
router.put('/:id', async (req, res) => {
  try {
    const { name, phone, address, contactPerson, region, description, status, level } = req.body;
    const update: any = {};
    if (name) update.name = name;
    if (phone) update.phone = phone;
    if (address) update.address = address;
    if (contactPerson) update.contactPerson = contactPerson;
    if (region) update.region = region;
    if (description) update.description = description;
    if (status) update.status = status;
    if (level) update.level = level;

    const partner = await Partner.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json({ success: true, data: partner });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});


export default router;