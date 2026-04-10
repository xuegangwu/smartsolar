import { Request, Response } from 'express';
import { InspectionPlan, InspectionRecord, Station, Equipment } from '../models/index.js';

export const inspectionController = {
  // ─── Plans ─────────────────────────────────────────────────────────────────
  getPlans: async (req: Request, res: Response) => {
    const { stationId, enabled } = req.query;
    const filter: any = {};
    if (stationId) filter.stationId = stationId;
    if (enabled !== undefined) filter.enabled = enabled === 'true';

    const plans = await InspectionPlan.find(filter)
      .populate('stationId', 'name')
      .populate('equipmentId', 'name type')
      .sort({ nextRunAt: 1 });
    res.json({ success: true, data: plans });
  },

  getPlanById: async (req: Request, res: Response) => {
    const plan = await InspectionPlan.findById(req.params.id)
      .populate('stationId', 'name location')
      .populate('equipmentId', 'name type brand');
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, data: plan });
  },

  createPlan: async (req: Request, res: Response) => {
    const plan = new InspectionPlan(req.body);
    await plan.save();
    const populated = await InspectionPlan.findById(plan._id)
      .populate('stationId', 'name')
      .populate('equipmentId', 'name');
    res.json({ success: true, data: populated });
  },

  updatePlan: async (req: Request, res: Response) => {
    const plan = await InspectionPlan.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('stationId', 'name')
      .populate('equipmentId', 'name');
    if (!plan) return res.status(404).json({ success: false, message: 'Plan not found' });
    res.json({ success: true, data: plan });
  },

  deletePlan: async (req: Request, res: Response) => {
    await InspectionPlan.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  },

  // ─── Records ────────────────────────────────────────────────────────────────
  getRecords: async (req: Request, res: Response) => {
    const { planId, inspectorId } = req.query;
    const filter: any = {};
    if (planId) filter.planId = planId;
    if (inspectorId) filter.inspectorId = inspectorId;

    const records = await InspectionRecord.find(filter)
      .populate('planId', 'name stationId')
      .populate('inspectorId', 'name phone')
      .sort({ signedAt: -1 })
      .limit(200);
    res.json({ success: true, data: records });
  },

  createRecord: async (req: Request, res: Response) => {
    const record = new InspectionRecord(req.body);
    await record.save();
    const populated = await InspectionRecord.findById(record._id)
      .populate('planId', 'name')
      .populate('inspectorId', 'name phone');
    res.json({ success: true, data: populated });
  },

  // ─── Statistics ────────────────────────────────────────────────────────────
  getStats: async (req: Request, res: Response) => {
    const { stationId } = req.query;
    const filter: any = {};
    if (stationId) filter.stationId = stationId;

    const [totalPlans, enabledPlans, totalRecords, recentRecords] = await Promise.all([
      InspectionPlan.countDocuments(filter),
      InspectionPlan.countDocuments({ ...filter, enabled: true }),
      InspectionRecord.countDocuments(filter),
      InspectionRecord.countDocuments({
        ...filter,
        signedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),
    ]);

    res.json({
      success: true,
      data: { totalPlans, enabledPlans, totalRecords, recentRecords },
    });
  },
};
