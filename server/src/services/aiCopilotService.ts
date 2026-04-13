import { Equipment, Station, WorkOrder, Alert } from '../models/index.js';
import { HealthScore, PredictiveAlert } from '../models/healthScore.js';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── 上下文收集 ─────────────────────────────────────────────────────────────
export async function buildContext(): Promise<string> {
  const stations = await Station.find().select('name type capacity status').lean();
  const equipCount = await Equipment.countDocuments();
  const woCount = await WorkOrder.countDocuments({ status: { $nin: ['closed'] } });
  const alertStats = await Alert.aggregate([
    { $match: { acknowledged: false } },
    { $group: { _id: '$level', count: { $sum: 1 } } },
  ]);

  const healthScores = await HealthScore.find().lean();
  const avgScore = healthScores.length
    ? Math.round(healthScores.reduce((s, h) => s + h.score, 0) / healthScores.length)
    : 'N/A';
  const gradeA = healthScores.filter(h => h.grade === 'A').length;
  const gradeD = healthScores.filter(h => h.grade === 'D').length;

  const recentAlerts = await PredictiveAlert.find({ status: 'active' })
    .populate('stationId', 'name')
    .populate('equipmentId', 'name')
    .sort({ alertLevel: -1 })
    .limit(5)
    .lean();

  return JSON.stringify({
    summary: {
      stations: stations.length,
      equipCount,
      openWorkOrders: woCount,
      avgHealthScore: avgScore,
      gradeA,
      gradeD,
      unacknowledgedAlerts: Object.fromEntries(alertStats.map(a => [a._id, a.count])),
    },
    stations: stations.slice(0, 10),
    recentPredictiveAlerts: recentAlerts.map(a => ({
      code: a.alertCode,
      level: a.alertLevel,
      station: (a.stationId as any)?.name,
      equipment: (a.equipmentId as any)?.name,
      probability: a.failureProbability,
    })),
  }, null, 2);
}

// ─── 处理用户消息 ─────────────────────────────────────────────────────────────
export async function handleAIChat(
  userMessage: string,
  context: string,
): Promise<string> {
  const msg = userMessage.toLowerCase().trim();

  // ── 统计类查询 ──────────────────────────────────────────────────────────
  if (msg.includes('有多少') || msg.includes('统计') || msg.includes('概览')) {
    const data = JSON.parse(context);
    const s = data.summary;
    return `📊 **SmartSolar 数据概览**

- 🏭 电站总数：**${s.stations}** 个
- ⚙️ 接入设备：**${s.equipCount}** 台
- 📋 待处理工单：**${s.openWorkOrders}** 个
- 🏥 设备健康分平均：**${s.avgHealthScore}** 分
- ✅ A级设备：**${s.gradeA}** 台
- 🔴 D级设备（需关注）：**${s.gradeD}** 台
- ⚠️ 未确认告警：${Object.keys(s.unacknowledgedAlerts).map(k => `**${k}: ${s.unacknowledgedAlerts[k]}**`).join(' / ') || '无'}
`;
  }

  // ── 告警查询 ────────────────────────────────────────────────────────────
  if (msg.includes('告警') || msg.includes('预警')) {
    const data = JSON.parse(context);
    const alerts = data.recentPredictiveAlerts;
    if (!alerts || alerts.length === 0) return '✅ 目前没有活跃的预测性告警，设备运行正常。';

    const emoji: Record<string, string> = { critical: '🔴', major: '🟠', minor: '🟡' };
    return `⚠️ **活跃预测告警（${alerts.length}条）**\n\n` +
      alerts.map((a: any) =>
        `${emoji[a.level] || '⚪'} **[${a.level.toUpperCase()}]** ${a.code}\n` +
        `   📍 ${a.station || '未知电站'} / ${a.equipment || '未知设备'}\n` +
        `   📊 故障概率：**${(a.failureProbability * 100).toFixed(0)}%**`
      ).join('\n\n');
  }

  // ── 工单查询 ────────────────────────────────────────────────────────────
  if (msg.includes('工单')) {
    const open = await WorkOrder.find({ status: { $nin: ['closed'] } })
      .populate('stationId', 'name')
      .populate('equipmentId', 'name')
      .sort({ priority: 1, createdAt: -1 })
      .limit(5)
      .lean();

    if (open.length === 0) return '✅ 目前没有待处理的工单。';

    const prio: Record<string, string> = { urgent: '🔴紧急', important: '🟠重要', normal: '🔵一般' };
    return `📋 **待处理工单（${open.length}条）**\n\n` +
      open.map((w: any) =>
        `${prio[w.priority] || ''} **${w.title}**\n` +
        `   📍 ${(w.stationId as any)?.name || '—'} · ${w.type}\n` +
        `   🕐 ${new Date(w.createdAt).toLocaleDateString('zh-CN')}`
      ).join('\n\n');
  }

  // ── 设备健康分 ──────────────────────────────────────────────────────────
  if (msg.includes('健康') || msg.includes('评分') || msg.includes('等级')) {
    const poor = await HealthScore.find()
      .populate('stationId', 'name')
      .populate('equipmentId', 'name')
      .sort({ score: 1 })
      .limit(5)
      .lean();

    if (!poor || poor.length === 0) return '暂无健康分数据，请先确保设备已接入遥测数据。';

    const gradeEmoji: Record<string, string> = { A: '🟢', B: '🔵', C: '🟡', D: '🔴' };
    return `🏥 **健康分最低的设备**\n\n` +
      poor.map((h: any) =>
        `${gradeEmoji[h.grade] || '⚪'} **${h.grade}级 ${h.score}分** — ${(h.equipmentId as any)?.name || '未知设备'}\n` +
        `   📍 ${(h.stationId as any)?.name || '—'}\n` +
        `   ${h.issues?.[0] ? '⚠️ ' + h.issues[0].description.slice(0, 40) : ''}`
      ).join('\n\n');
  }

  // ── 报告生成 ───────────────────────────────────────────────────────────
  if (msg.includes('报告') || msg.includes('周报') || msg.includes('日报')) {
    const stations = await Station.find().select('name _id').lean();
    const healthScores = await HealthScore.find().lean();
    const healthStats = {
      total: healthScores.length,
      avgScore: healthScores.length ? Math.round(healthScores.reduce((s: number, h: any) => s + h.score, 0) / healthScores.length) : 0,
      gradeA: healthScores.filter((h: any) => h.grade === 'A').length,
      gradeB: healthScores.filter((h: any) => h.grade === 'B').length,
      gradeC: healthScores.filter((h: any) => h.grade === 'C').length,
      gradeD: healthScores.filter((h: any) => h.grade === 'D').length,
    };
    const woOpen = await WorkOrder.countDocuments({ status: { $nin: ['closed'] } });
    const alertStats = await Alert.aggregate([
      { $match: { acknowledged: false } },
      { $group: { _id: '$level', count: { $sum: 1 } } },
    ]);
    const alertsObj = Object.fromEntries(alertStats.map((a: any) => [a._id, a.count]));
    const gradeD = healthStats.gradeC + healthStats.gradeD;

    const period = msg.includes('周') ? '本周' : '今日';
    return `📋 **SmartSolar ${period}运维报告**\n\n` +
      `🏭 **场站概况**\n` +
      `   接入电站：${stations.length} 个  ·  接入设备：${healthStats.total} 台\n\n` +
      `🏥 **设备健康**\n` +
      `   综合健康分：${healthStats.avgScore} / 100  ·  A级：${healthStats.gradeA} 台  ·  D级：${gradeD} 台\n\n` +
      `⚠️ **告警统计**\n` +
      `   严重：${alertsObj.critical || 0}  ·  重要：${alertsObj.major || 0}  ·  一般：${alertsObj.minor || 0}\n\n` +
      `📋 **工单情况**\n` +
      `   待处理工单：${woOpen} 个\n\n` +
      `🤖 **AI 建议**\n` +
      `   ${gradeD > 0 ? `⚠️ 有 ${gradeD} 台设备健康等级为 C/D，建议优先巡检。` : '✅ 各设备健康状况良好，继续保持。'}\n` +
      `   ${(alertsObj.critical || 0) > 0 ? `🔴 有 ${alertsObj.critical} 个严重告警未处理，请尽快处理。` : '✅ 无严重告警，系统运行正常。'}\n\n` +
      `💡 如需完整报告，请访问「导出」页面生成下载版。`;
  }

  // ── 帮助 ────────────────────────────────────────────────────────────────
  if (msg.includes('帮助') || msg.includes('能做什么') || msg.includes('help')) {
    return `🤖 **SmartSolar AI 运维助手**

我可以帮你：

📊 **数据查询**
- "有多少电站？"
- "待处理工单有哪些？"
- "设备健康分如何？"

⚠️ **告警查询**
- "有哪些告警？"
- "活跃的预测预警"

🏥 **健康分析**
- "健康分最低的设备"
- "哪些设备需要关注？"

📋 **报告生成**
- "生成苏州站本周周报"

试试问我！`;
  }

  // ── 默认 ────────────────────────────────────────────────────────────────
  return `我理解了你的问题：「**${userMessage}**」\n\n` +
    `我可以帮你查询电站、工单、告警和设备健康分。\n` +
    `试试问：「有多少电站？」或「有哪些告警？」`;
}
