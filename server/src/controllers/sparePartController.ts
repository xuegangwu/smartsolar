import { Request, Response } from 'express';
import { SparePart, SparePartConsume, WorkOrder } from '../models/index.js';

export const sparePartController = {
  // ─── Spare Parts ─────────────────────────────────────────────────────────
  getAll: async (req: Request, res: Response) => {
    const { warehouse, keyword } = req.query;
    const filter: any = {};
    if (warehouse) filter.warehouse = warehouse;
    if (keyword) filter.name = { $regex: keyword, $options: 'i' };
    const parts = await SparePart.find(filter).sort({ name: 1 });
    res.json({ success: true, data: parts });
  },

  getById: async (req: Request, res: Response) => {
    const part = await SparePart.findById(req.params.id);
    if (!part) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: part });
  },

  create: async (req: Request, res: Response) => {
    const part = new SparePart(req.body);
    await part.save();
    res.json({ success: true, data: part });
  },

  update: async (req: Request, res: Response) => {
    const part = await SparePart.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!part) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: part });
  },

  delete: async (req: Request, res: Response) => {
    await SparePart.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  },

  // ─── Consume ──────────────────────────────────────────────────────────────
  consume: async (req: Request, res: Response) => {
    const { sparePartId, workOrderId, technicianId, quantity } = req.body;
    const part = await SparePart.findById(sparePartId);
    if (!part) return res.status(404).json({ success: false, message: '备件不存在' });
    if (part.quantity < quantity) {
      return res.status(400).json({ success: false, message: `库存不足，当前库存: ${part.quantity}` });
    }
    part.quantity -= quantity;
    await part.save();
    const record = new SparePartConsume({ sparePartId, workOrderId, technicianId, quantity });
    await record.save();
    res.json({ success: true, data: { part, record } });
  },

  // ─── Records ──────────────────────────────────────────────────────────────
  getConsumeRecords: async (req: Request, res: Response) => {
    const { sparePartId } = req.query;
    const filter: any = {};
    if (sparePartId) filter.sparePartId = sparePartId;
    const records = await SparePartConsume.find(filter)
      .populate('sparePartId', 'name model')
      .populate('workOrderId', 'orderNo title')
      .populate('technicianId', 'name')
      .sort({ createdAt: -1 })
      .limit(200);
    res.json({ success: true, data: records });
  },

  // ─── Stats ────────────────────────────────────────────────────────────────
  getStats: async (req: Request, res: Response) => {
    const [total, lowStock, outOfStock, totalValue] = await Promise.all([
      SparePart.countDocuments(),
      SparePart.countDocuments({ $expr: { $lte: ['$quantity', '$safeStock'] } }),
      SparePart.countDocuments({ quantity: 0 }),
      SparePart.aggregate([
        { $project: { value: { $multiply: ['$quantity', '$unitCost'] } } },
        { $group: { _id: null, total: { $sum: '$value' } } },
      ]),
    ]);
    res.json({
      success: true,
      data: {
        total,
        lowStock,
        outOfStock,
        totalValue: totalValue[0]?.total || 0,
      },
    });
  },
};
