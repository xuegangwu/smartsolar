import { Request, Response } from 'express';
import { InspectionTemplate } from '../models/index.js';

export const inspectionTemplateController = {
  getAll: async (req: Request, res: Response) => {
    const { equipmentType } = req.query;
    const filter: any = {};
    if (equipmentType) filter.equipmentType = equipmentType;
    const templates = await InspectionTemplate.find(filter).sort({ name: 1 });
    res.json({ success: true, data: templates });
  },

  getById: async (req: Request, res: Response) => {
    const t = await InspectionTemplate.findById(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: '模板不存在' });
    res.json({ success: true, data: t });
  },

  create: async (req: Request, res: Response) => {
    const t = new InspectionTemplate(req.body);
    await t.save();
    res.json({ success: true, data: t });
  },

  update: async (req: Request, res: Response) => {
    const t = await InspectionTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!t) return res.status(404).json({ success: false, message: '模板不存在' });
    res.json({ success: true, data: t });
  },

  delete: async (req: Request, res: Response) => {
    const t = await InspectionTemplate.findByIdAndDelete(req.params.id);
    if (!t) return res.status(404).json({ success: false, message: '模板不存在' });
    res.json({ success: true });
  },
};
