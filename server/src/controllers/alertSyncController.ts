import { Request, Response } from 'express';
import { Alert, Notification } from '../models/index.js';

/**
 * EMS → SmartSolar 告警同步接口
 * EMS 产生的告警，通过此接口同步到 SmartSolar
 *
 * POST /api/ems-sync/alerts
 * Body: { stationId, equipmentId?, level, code, message, sourceAlertId? }
 */
export const alertSyncController = {
  // 接收 EMS 推送的告警
  syncAlert: async (req: Request, res: Response) => {
    try {
      const { stationId, equipmentId, level, code, message, sourceAlertId } = req.body;

      if (!stationId || !level || !message) {
        return res.status(400).json({ success: false, message: '缺少必要字段: stationId, level, message' });
      }

      // 去重：如果 sourceAlertId 已存在则更新，否则创建
      if (sourceAlertId) {
        const existing = await Alert.findOne({ sourceAlertId: String(sourceAlertId) });
        if (existing) {
          existing.level = level;
          existing.message = message;
          existing.acknowledged = false; // 同步时重置为未确认
          await existing.save();
          return res.json({ success: true, data: existing, synced: true });
        }
      }

      const alert = new Alert({
        stationId,
        equipmentId,
        level,
        code,
        message,
        sourceAlertId,
        acknowledged: false,
      });
      await alert.save();

      // 发送站内告警通知
      try {
        const levelLabel = level === 'critical' ? '🔴 严重' : level === 'warning' ? '⚠️ 警告' : 'ℹ️ 信息';
        await new Notification({
          type: 'alert',
          level: level === 'critical' ? 'critical' : level === 'warning' ? 'warning' : 'info',
          title: `${levelLabel} 告警：${message}`,
          message: `电站：${stationId} · 告警码：${code || '—'}`,
          relatedId: alert._id as any,
          relatedType: 'alert',
        }).save();
      } catch {}

      return res.json({ success: true, data: alert, synced: true });
    } catch (err: any) {
      console.error('[alertSync] syncAlert error:', err.message);
      return res.status(500).json({ success: false, message: err.message });
    }
  },

  // 批量同步（EMS 批量推送）
  syncBatch: async (req: Request, res: Response) => {
    try {
      const { alerts } = req.body;
      if (!Array.isArray(alerts)) {
        return res.status(400).json({ success: false, message: 'alerts 必须是数组' });
      }

      const results = [];
      for (const item of alerts) {
        try {
          if (item.sourceAlertId) {
            const existing = await Alert.findOne({ sourceAlertId: String(item.sourceAlertId) });
            if (existing) {
              existing.level = item.level;
              existing.message = item.message;
              existing.acknowledged = false;
              await existing.save();
              results.push({ ...existing.toObject(), synced: true });
              continue;
            }
          }
          const alert = new Alert({
            stationId: item.stationId,
            equipmentId: item.equipmentId,
            level: item.level,
            code: item.code,
            message: item.message,
            sourceAlertId: item.sourceAlertId,
            acknowledged: false,
          });
          await alert.save();
          results.push({ ...alert.toObject(), synced: true });
        } catch (e: any) {
          results.push({ error: e.message, item });
        }
      }

      return res.json({ success: true, data: results, total: alerts.length });
    } catch (err: any) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};
