import { Request, Response } from 'express';
import { WorkOrder, SparePart, SparePartConsume, Notification, Alert, Personnel } from '../models/index.js';

// 生成工单号
function generateOrderNo(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WO${dateStr}${random}`;
}

export const workOrderController = {
  getAll: async (req: Request, res: Response) => {
    const { stationId, equipmentId, status, priority, type, assigneeId } = req.query;
    const filter: any = {};
    if (stationId) filter.stationId = stationId;
    if (equipmentId) filter.equipmentId = equipmentId;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (type) filter.type = type;
    if (assigneeId) filter.assigneeId = assigneeId;

    const workOrders = await WorkOrder.find(filter)
      .populate('stationId', 'name location')
      .populate('equipmentId', 'name type brand')
      .populate('assigneeId', 'name phone role skills workStatus')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: workOrders });
  },

  getById: async (req: Request, res: Response) => {
    const workOrder = await WorkOrder.findById(req.params.id)
      .populate('stationId', 'name location contact')
      .populate('equipmentId', 'name type brand model serialNumber')
      .populate('assigneeId', 'name phone role skills workStatus organization');
    if (!workOrder) return res.status(404).json({ success: false, message: 'Work order not found' });
    res.json({ success: true, data: workOrder });
  },

  create: async (req: Request, res: Response) => {
    const data = { ...req.body, orderNo: generateOrderNo() };
    data.handlingSteps = [{
      step: '创建工单',
      operator: '系统',
      at: new Date(),
      note: `工单号：${generateOrderNo()}`,
    }];
    const workOrder = new WorkOrder(data);
    await workOrder.save();
    const populated = await WorkOrder.findById(workOrder._id)
      .populate('stationId', 'name')
      .populate('assigneeId', 'name');

    // 发送站内通知
    try {
      await new Notification({
        type: 'workorder',
        level: data.priority === 'urgent' ? 'critical' : data.priority === 'important' ? 'warning' : 'info',
        title: `📋 新工单：${data.title}`,
        message: `电站：${(populated?.stationId as any)?.name || '—'} · 类型：${data.type} · 优先级：${data.priority}`,
        relatedId: workOrder._id as any,
        relatedType: 'workorder',
      }).save();
    } catch {}

    res.json({ success: true, data: populated });
  },

  update: async (req: Request, res: Response) => {
    const prev = await WorkOrder.findById(req.params.id);
    const workOrder = await WorkOrder.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('stationId', 'name')
      .populate('equipmentId', 'name')
      .populate('assigneeId', 'name phone role skills workStatus');
    if (!workOrder) return res.status(404).json({ success: false, message: 'Work order not found' });

    // 通知：派发给技术人员
    if (req.body.assigneeId && prev && prev.assigneeId?.toString() !== req.body.assigneeId) {
      try {
        await new Notification({
          type: 'workorder',
          level: 'warning',
          title: `📋 工单已派发给你：${workOrder.title}`,
          message: `工单已派发，请及时处理`,
          relatedId: workOrder._id as any,
          relatedType: 'workorder',
        }).save();
      } catch {}
    }

    res.json({ success: true, data: workOrder });
  },

  // 状态变更（简化状态机）
  updateStatus: async (req: Request, res: Response) => {
    const { status } = req.body;
    const workOrder = await WorkOrder.findById(req.params.id);
    if (!workOrder) return res.status(404).json({ success: false, message: 'Work order not found' });

    const validTransitions: Record<string, string[]> = {
      created: ['assigned'],
      assigned: ['accepted'],
      accepted: ['processing'],
      processing: ['accepted_check'],
      accepted_check: ['closed'],
      closed: [],
    };

    if (!validTransitions[workOrder.status]?.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid transition: ${workOrder.status} → ${status}`,
      });
    }

    const prevStatus = workOrder.status;
    const prev = await WorkOrder.findById(req.params.id).select('+handlingSteps');
    workOrder.status = status;
    // 时间戳
    if (status === 'assigned') workOrder.assignedAt = new Date();
    if (status === 'accepted') workOrder.acceptedAt = new Date();
    if (status === 'closed') {
      workOrder.closedAt = new Date();
      workOrder.completedAt = new Date();

      // ── 触发积分赚取（安装商）─────────────────────────────────────
      if ((workOrder as any).partnerId) {
        try {
          const { Equipment } = await import('../models/index.js');
          const equipment = await Equipment.findById(workOrder.equipmentId).lean();
          const capacity = equipment ? (equipment.ratedPower || 0) : 0;
          const { Partner, PointTransaction, LEVEL_MULTIPLIERS } = await import('../models/index.js');
          const partner = await Partner.findById((workOrder as any).partnerId);
          if (partner && partner.status === 'active') {
            const { PointRule } = await import('../models/index.js');
            const rule = await PointRule.findOne({ trigger: 'work_order_close', enabled: true }).lean();
            if (rule) {
              const basePoints = rule.basePointsPerUnit * (capacity || 1);
              const multiplier = LEVEL_MULTIPLIERS[partner.level] || 1.0;
              const actualPoints = Math.floor(basePoints * multiplier);
              partner.totalPoints += actualPoints;
              partner.availablePoints += actualPoints;
              const newLevel = (() => {
                const LEVEL_THRESHOLDS: Record<string, number> = { bronze: 0, silver: 5000, gold: 20000, diamond: 50000 };
                if (partner.totalPoints >= LEVEL_THRESHOLDS.diamond) return 'diamond';
                if (partner.totalPoints >= LEVEL_THRESHOLDS.gold) return 'gold';
                if (partner.totalPoints >= LEVEL_THRESHOLDS.silver) return 'silver';
                return 'bronze';
              })();
              if (newLevel !== partner.level) partner.level = newLevel;
              await partner.save();
              await PointTransaction.create({
                partnerId: partner._id,
                type: 'earn',
                amount: actualPoints,
                balance: partner.availablePoints,
                description: `完成工单：${workOrder.title}（${capacity}kW）`,
                workOrderId: workOrder._id,
                multiplier,
              });
              console.log(`[Points] Partner ${partner.name} earned ${actualPoints} points for WO ${workOrder.orderNo}`);
            }
          }
        } catch (e) {
          console.error('[Points] Failed to award points:', e);
        }
      }
    }

    // 如果状态变更，记录操作时间线
    if (status && status !== prev?.status) {
      const STEP_LABELS: Record<string, string> = {
        created: '创建工单', assigned: '派发给技术员', accepted: '技术员接单',
        processing: '开始处理', accepted_check: '提交验收', closed: '工单关闭',
      };
      const operatorName = prev?.assigneeId
        ? ((await Personnel.findById(prev.assigneeId))?.name || '未知')
        : '运维人员';
      (workOrder as any).handlingSteps = prev?.handlingSteps || [];
      (workOrder as any).handlingSteps.push({
        step: STEP_LABELS[status] || status,
        operator: operatorName,
        at: new Date(),
      });
    }

    // 操作时间线记录
    const STEP_LABELS: Record<string, string> = {
      created: '创建工单', assigned: '派发给技术员', accepted: '技术员接单',
      processing: '开始处理', accepted_check: '提交验收', closed: '工单关闭',
    };
    const operatorName = workOrder.assigneeId
      ? ((await Personnel.findById(workOrder.assigneeId))?.name || '未知')
      : '系统';
    workOrder.handlingSteps = workOrder.handlingSteps || [];
    workOrder.handlingSteps.push({
      step: STEP_LABELS[status] || status,
      operator: operatorName,
      at: new Date(),
    });

    // 自动扣减备件库存 + 低库存告警
    if (status === 'closed' && workOrder.spareParts && workOrder.spareParts.length > 0) {
      for (const sp of workOrder.spareParts) {
        try {
          const part = await SparePart.findById(sp.sparePartId);
          if (part && part.quantity >= sp.quantity) {
            part.quantity -= sp.quantity;
            await part.save();
            await new SparePartConsume({
              sparePartId: sp.sparePartId,
              workOrderId: workOrder._id,
              quantity: sp.quantity,
            }).save();
            // 低库存告警
            if (part.safeStock && part.quantity <= part.safeStock) {
              await new Alert({
                stationId: (workOrder as any).stationId,
                code: 'LOW_STOCK',
                level: part.quantity === 0 ? 'critical' : 'warning',
                message: `备件库存不足：${part.name}（剩余 ${part.quantity} ${part.unit || '件'}，安全库存 ${part.safeStock}）`,
                relatedId: part._id as any,
                relatedType: 'sparepart',
              }).save();
            }
          }
        } catch {}
      }
    }
    await workOrder.save();

    // 发送通知（状态变更时）
    const STATUS_TEXT: Record<string, string> = {
      assigned: '已派发', accepted: '已接单', processing: '处理中',
      accepted_check: '待验收', closed: '已完成',
    };
    try {
      await new Notification({
        type: 'workorder',
        level: status === 'closed' ? 'info' : 'warning',
        title: `📋 工单${STATUS_TEXT[status] || status}：${workOrder.title}`,
        message: `状态变更：${STATUS_TEXT[prevStatus]} → ${STATUS_TEXT[status] || status}`,
        relatedId: workOrder._id as any,
        relatedType: 'workorder',
      }).save();
    } catch {}

    const populated = await WorkOrder.findById(workOrder._id)
      .populate('stationId', 'name')
      .populate('equipmentId', 'name')
      .populate('assigneeId', 'name phone role skills workStatus');
    res.json({ success: true, data: populated });
  },

  delete: async (req: Request, res: Response) => {
    await WorkOrder.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  },
};
