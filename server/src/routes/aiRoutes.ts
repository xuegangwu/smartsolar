import { Router } from 'express';
import { auth } from '../middleware/auth.js';
import { buildContext, handleAIChat } from '../services/aiCopilotService.js';

const router = Router();

// ─── POST /api/ai/chat ────────────────────────────────────────────────────────
router.post('/ai/chat', auth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: '消息不能为空' });
    }

    const context = await buildContext();
    const reply = await handleAIChat(message, context);

    res.json({ success: true, data: { reply } });
  } catch (err: any) {
    console.error('[AI Chat]', err);
    res.status(500).json({ success: false, message: 'AI 服务暂时不可用，请稍后再试' });
  }
});

// ─── GET /api/ai/capabilities ─────────────────────────────────────────────────
router.get('/ai/capabilities', auth, async (req, res) => {
  res.json({
    success: true,
    data: {
      features: [
        '数据统计查询（电站、设备、工单数量）',
        '告警与预测预警查询',
        '设备健康分分析',
        '运维报告生成（开发中）',
      ],
      model: 'Rule-based AI (Phase 1)',
      version: '1.0',
    },
  });
});

export { router as aiRoutes };
