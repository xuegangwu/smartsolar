import { Router } from 'express';
import { Notification } from '../models/index.js';

const router = Router();

// GET /api/notifications - list notifications
router.get('/', async (req, res) => {
  try {
    const { userId = 'admin', limit = 50, offset = 0 } = req.query;
    const query: any = { userId };
    const total = await Notification.countDocuments(query);
    const items = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(Number(offset))
      .limit(Number(limit));
    const unread = await Notification.countDocuments({ ...query, read: false });
    res.json({ success: true, data: items, total, unread });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// PUT /api/notifications/read - mark all/none as read
router.put('/read', async (req, res) => {
  try {
    const { userId = 'admin', ids } = req.body;
    if (ids && ids.length > 0) {
      await Notification.updateMany({ _id: { $in: ids }, userId }, { read: true });
    } else {
      await Notification.updateMany({ userId, read: false }, { read: true });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    await Notification.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (err: any) {
    res.json({ success: false, message: err.message });
  }
});

export default router;
