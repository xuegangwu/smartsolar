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
    const body = req.body as any;
    const station = new Station(body);
    await station.save();

    // Auto-create EquipmentCategory + Equipment records from the equipment[] array
    if (body.equipment && Array.isArray(body.equipment)) {
      // Group by type -> one category per type
      const typeMap: Record<string, string> = {
        pv: 'solar',
        battery: 'battery',
        pcs: 'pcs',
        meter: 'meter',
        ev_charger: 'ev_charger',
        grid: 'grid',
      };
      const labelMap: Record<string, string> = {
        pv: '光伏',
        battery: '储能',
        pcs: '变流器',
        meter: '电表',
        ev_charger: '充电桩',
        grid: '电网',
      };

      // Create one category per unique type
      const typeSet = new Set<string>();
      for (const eq of body.equipment) {
        if (eq.count > 0) typeSet.add(eq.type);
      }

      const catMap: Record<string, any> = {};
      for (const t of typeSet) {
        const catType = typeMap[t] || t;
        const label = labelMap[t] || t;
        const cat = await EquipmentCategory.create({
          stationId: station._id,
          name: `${label}分类`,
          type: catType,
        });
        catMap[t] = cat;
      }

      // Create Equipment records per item, respecting count
      for (const eq of body.equipment) {
        if (eq.count <= 0) continue;
        const cat = catMap[eq.type];
        if (!cat) continue;
        const catType = typeMap[eq.type] || eq.type;

        for (let i = 1; i <= eq.count; i++) {
          const nameSuffix = eq.count === 1 ? '' : `-${i}`;
          await Equipment.create({
            stationId: station._id,
            categoryId: cat._id,
            name: `${eq.name}${nameSuffix}`,
            type: catType,
            ratedPower: eq.power,
            status: 'online',
          });
        }
      }
    }

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
