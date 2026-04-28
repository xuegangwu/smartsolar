import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { PartnerNotification, Partner, PartnerUser } from '../models/index.js';

const router = Router();

function partnerAuth(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ success: false, message: '未登录' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.PARTNER_JWT_SECRET || 'smartsolar_secret_key_change_in_production') as any;
    req.partnerUser = decoded;
    next();
  } catch { return res.status(401).json({ success: false, message: 'Token无效' }); }
}

// ─── 通知中心：我的通知列表 ─────────────────────────────────────────────────
router.get('/', partnerAuth, async (req: any, res) => {
  try {
    const { partnerId } = req.partnerUser;
    const { unreadOnly, limit } = req.query;

    const filter: any = { recipientPartnerId: partnerId };
    if (unreadOnly === 'true') filter.isRead = false;

    const notifications = await PartnerNotification.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit) || 50)
      .lean();

    const unreadCount = await PartnerNotification.countDocuments({ recipientPartnerId: partnerId, isRead: false });

    res.json({ success: true, data: notifications, unreadCount });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 标记已读 ──────────────────────────────────────────────────────────────
router.patch('/:id/read', partnerAuth, async (req: any, res) => {
  try {
    const { partnerId } = req.partnerUser;
    const notif = await PartnerNotification.findOneAndUpdate(
      { _id: req.params.id, recipientPartnerId: partnerId },
      { isRead: true, readAt: new Date() },
      { new: true },
    );
    if (!notif) return res.status(404).json({ success: false, message: '通知不存在' });
    res.json({ success: true, data: notif });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 全部标记已读 ───────────────────────────────────────────────────────────
router.patch('/read-all', partnerAuth, async (req: any, res) => {
  try {
    const { partnerId } = req.partnerUser;
    await PartnerNotification.updateMany(
      { recipientPartnerId: partnerId, isRead: false },
      { isRead: true, readAt: new Date() },
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 删除通知 ────────────────────────────────────────────────────────────────
router.delete('/:id', partnerAuth, async (req: any, res) => {
  try {
    const { partnerId } = req.partnerUser;
    await PartnerNotification.deleteOne({ _id: req.params.id, recipientPartnerId: partnerId });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 获取未读数（轻量接口）──────────────────────────────────────────────────
router.get('/unread-count', partnerAuth, async (req: any, res) => {
  try {
    const { partnerId } = req.partnerUser;
    const count = await PartnerNotification.countDocuments({ recipientPartnerId: partnerId, isRead: false });
    res.json({ success: true, unreadCount: count });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
