// Kimi (Moonshot AI) API client for SmartSolar
const apiKey = process.env.KIMI_API_KEY;
const baseURL = 'https://api.moonshot.cn/v1';
const model = 'moonshot-v1-8k';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function kimiChat(messages: ChatMessage[]): Promise<string> {
  if (!apiKey) {
    throw new Error('KIMI_API_KEY not configured');
  }

  const response = await fetch(`${baseURL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.7 }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Kimi API error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function analyzeFault(
  faultDescription: string,
  equipmentType: string,
  equipmentBrand: string,
  equipmentModel: string,
  stationName: string,
  alertMessages?: string[]
): Promise<string> {
  if (!apiKey) {
    return '⚠️ Kimi API 未配置（环境变量 KIMI_API_KEY 未设置），请联系管理员。';
  }

  const alertContext = alertMessages?.length
    ? `相关告警信息：\n${alertMessages.map((a, i) => `${i + 1}. ${a}`).join('\n')}`
    : '（无可用告警信息）';

  const systemPrompt = `你是光储电站运维故障诊断专家，擅长分析光伏、储能、充电桩等设备的故障原因并给出处理建议。

分析规则：
1. 根据故障描述、设备型号、品牌信息分析可能原因
2. 按可能性从高到低列出3-5个可能原因
3. 每个原因给出：概率评估（高/中/低）、典型表现、建议处理步骤
4. 涉及高压电气设备时，特别提醒安全注意事项
5. 如需远程诊断，给出数据调取建议
6. 回复格式清晰，使用 Markdown，便于移动端阅读
7. 保持回复在 600 字以内

请严格按照以下格式回复（不要改变格式）：

## 🔍 故障分析

**设备信息：** {设备品牌} {设备型号}（{设备类型}）
**电站：** {电站名称}
**故障描述：** {故障描述}

### 可能原因（按概率排序）

1. **原因名称**（概率: 高/中/低）
   - 典型表现：...
   - 处理步骤：...
   - 所需工具/备件：...

2. **...**（共3-5个）

### ⚡ 安全提醒
[如有高压电气风险，在此特别提醒]

### 📊 远程诊断建议
[建议调取哪些数据/参数辅助判断]`;

  const userMessage = `设备类型：${equipmentType}
设备品牌：${equipmentBrand || '未知'}
设备型号：${equipmentModel || '未知'}
电站名称：${stationName || '未知'}
故障描述：${faultDescription}
${alertContext}`;

  try {
    return await kimiChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ]);
  } catch (err: any) {
    return `❌ AI 分析失败：${err.message}`;
  }
}
