import { Request, Response } from 'express';
import { Station, EquipmentCategory, Equipment } from '../models/index.js';

// ─── Station ───────────────────────────────────────────────────────────────────
export const stationController = {
  getAll: async (req: Request, res: Response) => {
    const stations = await Station.find().sort({ createdAt: -1 });
    res.json({ success: true, data: stations });
  },

  getById: async (req: Request, res: Response) => {
    const station = await Station.findById(req.params.id);
    if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
    // Attach categories
    const categories = await EquipmentCategory.find({ stationId: station._id });
    const stationData = station.toObject();
    res.json({ success: true, data: { ...stationData, categories } });
  },

  create: async (req: Request, res: Response) => {
    const station = new Station(req.body);
    await station.save();
    res.json({ success: true, data: station });
  },

  update: async (req: Request, res: Response) => {
    const station = await Station.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
    res.json({ success: true, data: station });
  },

  delete: async (req: Request, res: Response) => {
    const station = await Station.findByIdAndDelete(req.params.id);
    if (!station) return res.status(404).json({ success: false, message: 'Station not found' });
    // Cascade delete categories and equipment
    await EquipmentCategory.deleteMany({ stationId: station._id });
    await Equipment.deleteMany({ stationId: station._id });
    res.json({ success: true });
  },
};

// ─── EquipmentCategory ──────────────────────────────────────────────────────────
export const categoryController = {
  getByStation: async (req: Request, res: Response) => {
    const categories = await EquipmentCategory.find({ stationId: req.params.stationId });
    res.json({ success: true, data: categories });
  },

  create: async (req: Request, res: Response) => {
    const category = new EquipmentCategory(req.body);
    await category.save();
    res.json({ success: true, data: category });
  },

  update: async (req: Request, res: Response) => {
    const category = await EquipmentCategory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, data: category });
  },

  delete: async (req: Request, res: Response) => {
    await EquipmentCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  },
};

// ─── Equipment ─────────────────────────────────────────────────────────────────
export const equipmentController = {
  getAll: async (req: Request, res: Response) => {
    const { stationId, categoryId, status, keyword } = req.query;
    const filter: any = {};
    if (stationId) filter.stationId = stationId;
    if (categoryId) filter.categoryId = categoryId;
    if (status) filter.status = status;
    if (keyword) filter.name = { $regex: keyword, $options: 'i' };

    const equipments = await Equipment.find(filter)
      .populate('stationId', 'name')
      .populate('categoryId', 'name')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: equipments });
  },

  getById: async (req: Request, res: Response) => {
    const equipment = await Equipment.findById(req.params.id)
      .populate('stationId', 'name location')
      .populate('categoryId', 'name');
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, data: equipment });
  },

  create: async (req: Request, res: Response) => {
    const equipment = new Equipment(req.body);
    await equipment.save();
    res.json({ success: true, data: equipment });
  },

  update: async (req: Request, res: Response) => {
    const equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!equipment) return res.status(404).json({ success: false, message: 'Equipment not found' });
    res.json({ success: true, data: equipment });
  },

  delete: async (req: Request, res: Response) => {
    await Equipment.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  },

  getByStation: async (req: Request, res: Response) => {
    const categories = await EquipmentCategory.find({ stationId: req.params.stationId });
    const categoryIds = categories.map(c => c._id);
    const equipments = await Equipment.find({ categoryId: { $in: categoryIds } })
      .populate('categoryId', 'name type');
    res.json({ success: true, data: { categories, equipments } });
  },
};
