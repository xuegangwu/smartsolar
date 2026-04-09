import { Request, Response } from 'express';
import { Alert } from '../models/index.js';

export const alertController = {
  getAll: async (req: Request, res: Response) => {
    const { stationId, level, acknowledged, limit = 100 } = req.query;
    const filter: any = {};
    if (stationId) filter.stationId = stationId;
    if (level) filter.level = level;
    if (acknowledged !== undefined) filter.acknowledged = acknowledged === 'true';

    const alerts = await Alert.find(filter)
      .populate('stationId', 'name')
      .populate('equipmentId', 'name type')
      .populate('acknowledgedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.json({ success: true, data: alerts });
  },

  acknowledge: async (req: Request, res: Response) => {
    const alert = await Alert.findByIdAndUpdate(
      req.params.id,
      { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: req.body.technicianId || null },
      { new: true }
    );
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found' });
    res.json({ success: true, data: alert });
  },

  acknowledgeBatch: async (req: Request, res: Response) => {
    const { ids, technicianId } = req.body;
    await Alert.updateMany(
      { _id: { $in: ids } },
      { acknowledged: true, acknowledgedAt: new Date(), acknowledgedBy: technicianId || null }
    );
    res.json({ success: true });
  },

  getStats: async (req: Request, res: Response) => {
    const { stationId, startDate, endDate } = req.query;
    const filter: any = {};
    if (stationId) filter.stationId = stationId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate as string);
      if (endDate) filter.createdAt.$lte = new Date(endDate as string);
    }

    const [total, critical, major, minor, unacknowledged] = await Promise.all([
      Alert.countDocuments(filter),
      Alert.countDocuments({ ...filter, level: 'critical' }),
      Alert.countDocuments({ ...filter, level: 'major' }),
      Alert.countDocuments({ ...filter, level: 'minor' }),
      Alert.countDocuments({ ...filter, acknowledged: false }),
    ]);

    res.json({
      success: true,
      data: { total, critical, major, minor, unacknowledged },
    });
  },
};
