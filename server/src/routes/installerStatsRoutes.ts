import { Router } from 'express';
import { auth, requireRole } from '../middleware/auth.js';
import { InstallerStats, Partner } from '../models/index.js';

const router = Router();

// GET /api/installer-stats  - 获取所有安装商业绩（管理员）
router.get('/', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { installerId, month, year, sort } = req.query;

    // 如果指定了安装商，返回该安装商所有月份数据
    if (installerId) {
      const filter: any = { installerId };
      if (month) filter.month = month as string;
      if (year) {
        filter.month = { $regex: `^${year}-` };
      }

      const stats = await InstallerStats.find(filter)
        .populate('installerId', 'name region level')
        .sort({ month: -1 })
        .lean();

      return res.json({ success: true, data: stats });
    }

    // 否则返回各安装商最新一条汇总
    const stats = await InstallerStats.aggregate([
      // 先按 installerId 分组，取每个安装商最新月份
      { $sort: { month: -1 } },
      { $group: {
        _id: '$installerId',
        latestMonth: { $first: '$month' },
        latest: { $first: '$$ROOT' },
      }},
      { $replaceRoot: { newRoot: '$latest' } },
      { $sort: sort === 'capacity' ? { totalCapacity: -1 } : { totalInstallations: -1 } },
    ]);

    // 填充安装商基本信息
    const installerIds = stats.map((s: any) => s.installerId);
    const partners = await Partner.find({ _id: { $in: installerIds } }).lean();
    const partnerMap: any = {};
    partners.forEach((p: any) => { partnerMap[p._id.toString()] = p; });

    const result = stats.map((s: any) => ({
      ...s,
      installer: partnerMap[s.installerId?.toString()] || {},
    }));

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/installer-stats/summary  - 安装商业绩汇总（管理员）
router.get('/summary', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const allTime = await InstallerStats.aggregate([
      { $group: {
        _id: null,
        totalInstallations: { $sum: '$totalInstallations' },
        totalCapacity: { $sum: '$totalCapacity' },
        totalWorkOrders: { $sum: '$workOrderCount' },
      }},
    ]);

    const byLevel = await Partner.aggregate([
      { $match: { type: 'installer' } },
      { $group: {
        _id: '$level',
        count: { $sum: 1 },
        totalInstallations: { $sum: '$totalInstallations' },
        totalCapacity: { $sum: '$totalCapacity' },
      }},
    ]);

    const byMonth = await InstallerStats.aggregate([
      { $group: {
        _id: '$month',
        installations: { $sum: '$totalInstallations' },
        capacity: { $sum: '$totalCapacity' },
      }},
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]);

    res.json({
      success: true,
      data: {
        allTime: allTime[0] || { totalInstallations: 0, totalCapacity: 0, totalWorkOrders: 0 },
        byLevel,
        byMonth: byMonth.reverse(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/installer-stats/trend  - 趋势数据（每月装机量/安装量）
router.get('/trend', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { months = 12 } = req.query;
    const trend = await InstallerStats.aggregate([
      { $group: {
        _id: '$month',
        installations: { $sum: '$totalInstallations' },
        capacity: { $sum: '$totalCapacity' },
        workOrders: { $sum: '$workOrderCount' },
      }},
      { $sort: { _id: 1 } },
      { $limit: Number(months) },
    ]);

    res.json({ success: true, data: trend });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
