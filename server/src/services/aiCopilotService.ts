import { Equipment, Station, WorkOrder, Alert } from '../models/index.js';
import { HealthScore, PredictiveAlert } from '../models/healthScore.js';
import { kimiChat } from './kimiService.js';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
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

  // ── 报告生成（走 Kimi）────────────────────────────────────────────────
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

    const period = msg.includes('周') ? '本周' : '今日';

    // 如果配置了 Kimi API，用 LLM 生成自然语言报告
    if (process.env.KIMI_API_KEY) {
      try {
        const reportPrompt = `你是光储电站运维报告生成专家。请根据以下数据，为"SmartSolar智能运维平台"生成一份专业的${period}运维报告摘要（200字以内，用中文，Markdown格式）。

数据如下：
- 接入电站：${stations.length} 个
- 接入设备：${healthScores.length} 台
- 平均健康分：${healthStats.avgScore}/100（A级${healthStats.gradeA}台 / B级${healthStats.gradeB}台 / C级${healthStats.gradeC}台 / D级${healthStats.gradeD}台）
- 待处理工单：${woOpen} 个
- 未确认告警：严重${alertsObj.critical||0}个 / 重要${alertsObj.major||0}个 / 一般${alertsObj.minor||0}个

请生成一份专业的运维报告摘要，包含：运行概况、健康分析、告警分析、工单情况、AI综合建议。`;
        const aiReply = await kimiChat([
          { role: 'system', content: '你是一个专业的光储电站运维助手，擅长生成简洁专业的运营报告。' },
          { role: 'user', content: reportPrompt },
        ]);
        return `📋 **SmartSolar ${period}运维报告（AI生成）**\n\n${aiReply}\n\n💡 如需完整报告，请访问「导出」页面生成下载版。`;
      } catch {
        // Kimi 出错时回退到模板
      }
    }

    const gradeD = healthStats.gradeC + healthStats.gradeD;
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

  // ── Kimi Fallback（规则匹配不上时）────────────────────────────────────
  if (process.env.KIMI_API_KEY) {
    try {
      const data = JSON.parse(context);
      const fallbackPrompt = `你是SmartSolar智能运维平台的AI助手。以下是当前系统数据：

${context}

用户问："${userMessage}"

请根据上面的系统数据，用中文回答用户的问题。如果数据不足，请基于常见运维知识给出建议。
回答要简洁、专业，Markdown格式，200字以内。`;

      const reply = await kimiChat([
        { role: 'system', content: '你是光储电站运维平台的AI助手，基于系统真实数据回答用户问题。' },
        { role: 'user', content: fallbackPrompt },
      ]);
      return reply;
    } catch {
      // Kimi 也失败了，走默认回复
    }
  }

  // ── 默认 ────────────────────────────────────────────────────────────────
  return `我理解了你的问题：「**${userMessage}**」\n\n` +
    `我可以帮你查询电站、工单、告警和设备健康分。\n` +
    `试试问：「有多少电站？」或「有哪些告警？」`;
}

// ─── 维护建议生成（Kimi）────────────────────────────────────────────────────
export async function generateMaintenanceSuggestion(equipmentId: string): Promise<string> {
  const equip = await Equipment.findById(equipmentId)
    .populate('stationId', 'name')
    .lean();
  if (!equip) throw new Error('设备不存在');

  const score = await HealthScore.findOne({ equipmentId })
    .sort({ calculatedAt: -1 })
    .lean();

  if (!process.env.KIMI_API_KEY) {
    // 无 Kimi 时返回基于规则的简单建议
    const gradeEmoji: Record<string, string> = { A: '🟢', B: '🔵', C: '🟡', D: '🔴' };
    const grade = score?.grade || 'B';
    const topIssue = score?.issues?.[0];
    return `🏥 **${(equip as any).name} 维护建议**\n\n` +
      `${gradeEmoji[grade]} 健康等级：**${grade}级（${score?.score || '?'}分）**\n` +
      `📍 电站：${((equip as any).stationId as any)?.name || '—'}\n\n` +
      `⚠️ 主要问题：${topIssue ? topIssue.description + '\n建议：' + topIssue.suggestion : '暂无'}\n\n` +
      `💡 请安排技术人员现场检查，优先处理等级为 D 的设备。`;
  }

  const systemPrompt = `你是光储电站运维维护专家。根据设备信息和健康分数据，生成专业、可操作的维护建议。

输出要求（Markdown格式，300字以内）：
1. 问题总结（一句话）
2. 建议措施（按优先级排序，3-5条）
3. 所需工具/备件
4. 预计维护时长
5. 安全注意事项（如涉及高压电气）`;

  const input = `
设备名称：${(equip as any).name}
设备类型：${equip.type}
品牌：${equip.brand || '未知'}
型号：${equip.model || '未知'}
额定功率：${equip.ratedPower || '?'} kW
所在电站：${((equip as any).stationId as any)?.name || '未知'}
健康分：${score?.score || '暂无'}/100（${score?.grade || '?'}级）
趋势：${score?.trend === 'rising' ? '上升↗' : score?.trend === 'declining' ? '下降↘' : '稳定→'}
主要问题：${score?.issues?.map((i: any) => i.description).join('；') || '暂无详细数据'}
建议：${score?.issues?.map((i: any) => i.suggestion).join('；') || '暂无'}
`;

  try {
    return await kimiChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: input },
    ]);
  } catch (err: any) {
    throw new Error(`维护建议生成失败：${err.message}`);
  }
}
