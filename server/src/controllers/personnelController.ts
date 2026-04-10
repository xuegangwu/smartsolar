import { Request, Response } from 'express';
import { Personnel } from '../models/index.js';

export const personnelController = {
  // GET /api/personnel
  getAll: async (req: Request, res: Response) => {
    const { role, status, stationId } = req.query;
    const filter: any = {};
    if (role) filter.role = role;
    if (status) filter.status = status;
    if (stationId) filter.stationIds = stationId;

    const personnel = await Personnel.find(filter)
      .populate('stationIds', 'name')
      .sort({ role: 1, name: 1 });
    res.json({ success: true, data: personnel });
  },

  // GET /api/personnel/:id
  getById: async (req: Request, res: Response) => {
    const p = await Personnel.findById(req.params.id)
      .populate('stationIds', 'name');
    if (!p) return res.status(404).json({ success: false, message: '人员不存在' });
    res.json({ success: true, data: p });
  },

  // POST /api/personnel
  create: async (req: Request, res: Response) => {
    // 检查 authId 是否已存在
    if (req.body.authId) {
      const existing = await Personnel.findOne({ authId: req.body.authId });
      if (existing) {
        return res.status(400).json({ success: false, message: '该账号已关联人员档案' });
      }
    }
    const p = new Personnel(req.body);
    await p.save();
    const populated = await Personnel.findById(p._id).populate('stationIds', 'name');
    res.json({ success: true, data: populated });
  },

  // PUT /api/personnel/:id
  update: async (req: Request, res: Response) => {
    const p = await Personnel.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('stationIds', 'name');
    if (!p) return res.status(404).json({ success: false, message: '人员不存在' });
    res.json({ success: true, data: p });
  },

  // DELETE /api/personnel/:id
  delete: async (req: Request, res: Response) => {
    const p = await Personnel.findByIdAndDelete(req.params.id);
    if (!p) return res.status(404).json({ success: false, message: '人员不存在' });
    res.json({ success: true });
  },

  // PUT /api/personnel/:id/work-status
  updateWorkStatus: async (req: Request, res: Response) => {
    const { workStatus, currentTaskId } = req.body;
    const p = await Personnel.findByIdAndUpdate(
      req.params.id,
      { workStatus, currentTaskId: currentTaskId || null },
      { new: true }
    );
    if (!p) return res.status(404).json({ success: false, message: '人员不存在' });
    res.json({ success: true, data: p });
  },

  // GET /api/personnel/technicians (只返回可派工的技术员)
  getTechnicians: async (req: Request, res: Response) => {
    const { stationId } = req.query;
    const filter: any = { role: 'technician', status: 'active' };
    if (stationId) filter.stationIds = stationId;

    const technicians = await Personnel.find(filter)
      .populate('stationIds', 'name')
      .sort({ name: 1 });
    res.json({ success: true, data: technicians });
  },
};
