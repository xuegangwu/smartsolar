# SmartSolar AI Phase 1：设备健康分 + 预测性告警

> 设计版本：v1.0
> 目标：上线第一个 AI-Native 功能，为后续智能运维打好数据基础

---

## 目标

上线 **设备健康分（0-100分）** + **预测性告警** 功能：
- 每台设备每日自动计算健康分
- 分数低于阈值时自动触发预警工单
- 管理层可在 Dashboard 直观看到全场站健康状态

---

## 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                        EMS 系统                              │
│   (数据采集：光伏组串功率、BMS温度、PCS效率、弃光/弃电统计)     │
└──────────────────┬──────────────────────────────────────────┘
                   │ MQTT / Polling
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              SmartSolar Backend (Express)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │  实时遥测    │  │  健康分引擎   │  │  预测告警引擎     │   │
│  │  Telemetry  │→ │  HealthScore │→ │  PredictiveAlert  │   │
│  │  Service    │  │  (每日批处理) │  │  (每日批处理)      │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘   │
│         │                                    │               │
│         ▼                                    ▼               │
│  ┌─────────────┐                    ┌───────────────────┐  │
│  │ TimescaleDB │                    │  自动创建工单      │  │
│  │ (时序数据)  │                    │  WorkOrder        │  │
│  └─────────────┘                    └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              SmartSolar Frontend (React)                     │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────────┐   │
│  │ 健康分看板   │  │ 设备详情页   │  │  AI 运维助手      │   │
│  │ HealthPanel │  │ (评分+原因)  │  │  (对话式查询)     │   │
│  └─────────────┘  └──────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 一、数据模型扩展

### 1.1 Telemetry（时序遥测数据）—— 新建

```typescript
// 设备实时遥测，每5分钟入库一条
interface Telemetry {
  _id: ObjectId;
  stationId: ObjectId;          // 关联电站
  equipmentId: ObjectId;        // 关联设备

  // 光伏组串
  pvPower?: number;              // 当前功率 kW
  pvEfficiency?: number;        // 转换效率 %
  pvTemperature?: number;        // 组件温度 ℃

  // 储能BMS
  batterySOC?: number;           // 荷电状态 %
  batterySOH?: number;           // 健康状态 %
  batteryTemp?: number;          // 电池温度 ℃
  batteryVoltage?: number;       // 总电压 V
  batteryCurrent?: number;       // 充放电电流 A

  // PCS变流器
  pcsPower?: number;            // 当前功率 kW
  pcsEfficiency?: number;        // 变流效率 %
  pcsTemperature?: number;      // 运行温度 ℃

  // 电网
  gridPower?: number;           // 并网功率 kW
  gridFrequency?: number;       // 电网频率 Hz

  // 统计类
  dailyYield?: number;           // 今日发电量 kWh
  dailyCurtailment?: number;    // 今日弃光量 kWh

  timestamp: Date;              // 采集时间
}
```

**存储策略：**
- 使用 TimescaleDB（或 PostgreSQL + TimescaleDB 插件）
- 自动按时间分区（1个月一个 chunk）
- 保留 2 年数据，压缩旧数据

### 1.2 HealthScore（设备健康分）—— 新建

```typescript
interface HealthScore {
  _id: ObjectId;
  stationId: ObjectId;
  equipmentId: ObjectId;

  score: number;                // 0-100 健康分
  grade: 'A' | 'B' | 'C' | 'D'; // 等级

  // 分项得分
  factors: {
    powerScore: number;         // 功率得分 (0-100)
    efficiencyScore: number;    // 效率得分 (0-100)
    tempScore: number;          // 温度得分 (0-100)
    stabilityScore: number;     // 稳定性得分 (0-100)
  };

  // 问题诊断
  issues: HealthIssue[];        // 当前存在的问题

  trend: 'rising' | 'stable' | 'declining'; // 趋势
  comparedToLastWeek: number;   // 与上周相比变化（+/-分）

  calculatedAt: Date;           // 计算时间
}

interface HealthIssue {
  code: string;                 // 问题代码
  description: string;          // 问题描述
  severity: 'critical' | 'warning' | 'info';
  suggestion: string;           // 改善建议
}
```

### 1.3 PredictiveAlert（预测性告警）—— 新建

```typescript
interface PredictiveAlert {
  _id: ObjectId;
  stationId: ObjectId;
  equipmentId: ObjectId;

  alertCode: string;            // 如 'BATTERY_OVERHEAT_RISK'
  alertLevel: 'critical' | 'major' | 'minor';

  // 预测信息
  predictedFailureTime?: Date;  // 预计故障时间
  failureProbability: number;   // 故障概率 0-1
  confidenceLevel: number;      // 预测置信度 0-1

  // 原因分析
  rootCauseAnalysis: string;   // AI 根因分析结论
  evidence: string[];          // 支撑证据列表

  // 状态
  status: 'active' | 'acknowledged' | 'resolved' | 'false_alarm';

  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}
```

---

## 二、健康分计算逻辑

### 2.1 计算公式

```
综合健康分 = 功率得分×30% + 效率得分×30% + 温度得分×20% + 稳定性得分×20%
```

### 2.2 各维度评分规则

#### 功率得分（以光伏组串为例）

| 指标 | 规则 |
|------|------|
| 实际功率/额定功率 | < 50% → 0分；50-80% → 50-80分；80-100% → 80-100分 |
| 组串一致性 | 最高/最低组串功率比 > 1.5 → 扣20分 |
| 弃光率 | > 5% → 扣10分；> 10% → 扣30分 |

#### 效率得分

| 设备类型 | 指标 | 评分规则 |
|---------|------|---------|
| 光伏组件 | 转换效率 | < 15% → 0分；15-18% → 60分；> 20% → 100分 |
| PCS | 变流效率 | < 90% → 0分；90-95% → 70分；> 98% → 100分 |
| 储能BMS | 充放电效率 | < 80% → 0分；80-90% → 60分；> 95% → 100分 |

#### 温度得分

| 温度范围 | 得分 |
|---------|------|
| 组件温度 > 85℃ | 0分（热斑风险） |
| 组件温度 65-85℃ | 60-80分 |
| 组件温度 < 65℃ | 100分 |
| BMS温度 > 50℃ | 0分（热失控风险） |
| BMS温度 40-50℃ | 50-70分 |
| BMS温度 < 40℃ | 100分 |

#### 稳定性得分

| 指标 | 评分规则 |
|------|---------|
| 近7天告警次数 | 每1次告警扣5分 |
| 功率波动方差 | 方差 > 20% → 扣20分 |
| 通讯中断次数 | 每中断1次扣10分 |

### 2.3 等级划分

| 等级 | 分值范围 | 颜色 | 含义 |
|------|---------|------|------|
| A | 90-100 | 🟢 绿色 | 优秀，无需关注 |
| B | 75-89 | 🔵 蓝色 | 良好，建议观察 |
| C | 60-74 | 🟡 黄色 | 一般，需要关注 |
| D | < 60 | 🔴 红色 | 较差，需要维护 |

---

## 三、预测性告警逻辑

### 3.1 预测场景

| 场景 | 预测模型 | 预警提前量 |
|------|---------|-----------|
| 光伏组件热斑 | 温度趋势外推 + 功率衰减检测 | 3-7天 |
| 储能电池热失控 | BMS温度趋势 + SOC循环次数 | 1-3天 |
| PCS效率衰减 | 效率历史对比 + 负载率分析 | 7-14天 |
| 逆变器故障 | 功率波动 + 电网异常记录 | 1-5天 |

### 3.2 根因分析（Rule-Based + AI）

第一版本采用 **规则引擎 + 专家规则**，不依赖 ML 模型：

```typescript
// 示例：电池热失控预测规则
function predictBatteryOverheat(equipment: Equipment, history: Telemetry[]): PredictiveAlert | null {
  const recentTemps = history.map(h => h.batteryTemp).filter(Boolean);
  const avgTemp = mean(recentTemps);
  const tempTrend = linearTrend(recentTemps); // 温度上升趋势

  const recentSOC = history.map(h => h.batterySOC);
  const socCycles = countSOCycles(recentSOC); // 充放电循环次数

  // 热失控风险判断
  if (avgTemp > 45 && tempTrend > 0.5 && socCycles > 100) {
    return {
      alertCode: 'BATTERY_OVERHEAT_RISK',
      alertLevel: 'critical',
      failureProbability: 0.85,
      confidenceLevel: 0.9,
      rootCauseAnalysis: `近7天电池平均温度${avgTemp.toFixed(1)}℃，呈上升趋势；充放电循环${socCycles}次，SOH已衰减至${equipment.soh}%`,
      evidence: [
        `当前电池温度${recentTemps[recentTemps.length-1]}℃，超过安全阈值45℃`,
        `过去72小时温度上升趋势明显（+${(tempTrend*72).toFixed(1)}℃）`,
        `电池已完成${socCycles}次充放电循环，接近设计寿命`
      ]
    };
  }
  return null;
}
```

### 3.3 自动创建工单

当预测告警为 `critical` 且 `failureProbability > 0.8` 时：

```typescript
// 自动创建预警工单
const workOrder = await workOrderApi.create({
  stationId: alert.stationId,
  equipmentId: alert.equipmentId,
  title: `【AI预警】${equipment.name} - ${alert.alertCode}`,
  description: `${alert.rootCauseAnalysis}\n\n📊 故障概率：${(alert.failureProbability * 100).toFixed(0)}%\n⏰ 预计故障时间：${alert.predictedFailureTime?.toLocaleString() || '待评估'}`,
  type: 'fault',
  priority: 'important',
  status: 'created',
  tags: ['AI预警', '预测性维护'],
  relatedAlertId: alert._id
});
```

---

## 四、前端页面设计

### 4.1 健康分 Dashboard（新页面）

入口：`/health` 或 Dashboard 内嵌 Tab

**布局：**

```
┌──────────────────────────────────────────────────────────────┐
│  🏥 设备健康分                                          [刷新] │
├──────────────────────────────────────────────────────────────┤
│  全场站综合   │  A级(32台)  │  B级(45台)  │  C级(12台)  │ D级(3台) │
│     82.5      │      🟢      │      🔵     │      🟡     │    🔴    │
│   较上周+2.1  │             │            │            │         │
├──────────────────────────────────────────────────────────────┤
│ [地图] [列表]  ← 切换视图                                      │
├────────────────────────────┬─────────────────────────────────┤
│                            │                                 │
│   📍 场站地图（Leaflet）    │    🔴 TOP问题设备              │
│   颜色标记每个场站健康度    │    1. 苏州站 #3储能电池  评分42 │
│                            │       ⚠️ 温度过高，建议检查冷却 │
│                            │    2. 工业园 #5光伏组串  评分55 │
│                            │       📉 功率衰减 15%          │
│                            │    3. ...                        │
│                            │                                 │
└────────────────────────────┴─────────────────────────────────┘
```

### 4.2 设备详情页（扩展）

在现有设备详情页增加"健康分析"Tab：

```
┌──────────────────────────────────────────────────────────────┐
│  ☀️ 苏州站 #1 光伏组串                         [设备详情] [健康分析] │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   综合评分：78/100  🔵 良好                                    │
│   ──────────────────────────────────────                     │
│   功率得分  ████████████████████░░░  82/100                  │
│   效率得分  ██████████████████░░░░░  75/100                  │
│   温度得分  ████████████████████░░░  85/100                  │
│   稳定性    ████████████░░░░░░░░░░  65/100 ⚠️              │
│                                                              │
│   ──────────────────────────────────────                     │
│   📉 7日趋势：[图表]  ↓ 下降中                                │
│   ──────────────────────────────────────                     │
│   ⚠️ 当前问题：                                              │
│   1. 近7天功率衰减 12%（正常 < 5%）                          │
│      → 建议：检查组件表面清洁度，或检测 PID 效应              │
│   2. 组串#3与组串#7功率差超过 20%                            │
│      → 建议：检测组串#3的阴影遮挡或组件损坏                    │
│                                                              │
│   🤖 AI 建议：                                               │
│   "基于历史数据预测，该设备在 [日期] 前效率将降至 70% 以下，  │
│    建议在 [日期] 前安排巡检，预计维护成本约 ¥800"            │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 4.3 AI 运维助手（对话式）

入口：Dashboard 侧边悬浮按钮 或 独立 `/ai` 页面

**能力：**
- 自然语言查询设备状态
- 生成运维报告
- 智能问答

**示例对话：**

```
用户：过去一周效率低于80%的电站有哪些？
AI  ：
┌─────────────────────────────────────────┐
│ 🔍 查询结果：过去 7 天平均效率 < 80% 的电站
│
│ 1. 苏州工业园站     78.2%   ⚠️ 建议关注
│ 2. 徐州铜山站       76.5%   ⚠️ 需要巡检
│ 3. 杭州余杭站       74.1%   🔴 需要处理
│
│ 📊 平均效率：76.9%
│ 📅 数据时间：2026-04-05 至 2026-04-12
└─────────────────────────────────────────┘

用户：帮我生成苏州站本周运维周报
AI  ：
┌─────────────────────────────────────────┐
│ 📋 苏州工业园光储示范站 运维周报
│ 报告周期：2026-04-06 至 2026-04-12
│
│ 📈 发电情况
│   本周发电量：12,345 kWh（环比 +5.2%）
│   平均效率：82.3%（目标 80%）
│   设备可用率：98.5%
│
│ ⚠️ 告警统计
│   告警总数：23 次（环比 -15%）
│   重大告警：2 次（已处理）
│   预测告警：1 次（电池温度偏高）
│
│ 📝 工单情况
│   新开工单：5 个（4 已完成，1 处理中）
│   平均响应时间：2.3 小时
│   平均处理时间：4.1 小时
│
│ 🤖 AI 建议
│   下周天气以晴天为主，建议安排光伏组件清洗，
│   预计可提升发电量 3-5%。
└─────────────────────────────────────────┘
```

---

## 五、技术实现计划

### 阶段 1.1：数据基础（1周）
- [ ] 部署 TimescaleDB（可复用现有 MongoDB 机器）
- [ ] 新建 Telemetry 数据模型 + 采集服务
- [ ] 对接 EMS 数据源（MQTT 或轮询）
- [ ] 基础 Dashboard（实时功率、发电量显示）

### 阶段 1.2：健康分计算（1周）
- [ ] HealthScore 数据模型
- [ ] 健康分计算服务（每日 CRON 任务）
- [ ] 前端健康分 Dashboard
- [ ] 设备详情页健康分析 Tab

### 阶段 1.3：预测告警 + AI 助手（1-2周）
- [ ] PredictiveAlert 数据模型
- [ ] 预测规则引擎实现（5个核心场景）
- [ ] 自动创建预警工单逻辑
- [ ] AI 运维助手对话界面
- [ ] 自然语言周报生成

### 总工期：3-4 周

---

## 六、技术注意事项

### 6.1 TimescaleDB 部署

```bash
# Docker 部署
docker run -d \
  --name timescaledb \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=smartsolar \
  -e POSTGRES_DB=smartsolar_ts \
  timescale/timescaledb:latest-pg16

# 创建超表
CREATE TABLE telemetry (
  time        TIMESTAMPTZ NOT NULL,
  station_id  TEXT NOT NULL,
  equipment_id TEXT NOT NULL,
  pv_power    DOUBLE PRECISION,
  pv_efficiency DOUBLE PRECISION,
  battery_soc DOUBLE PRECISION,
  battery_temp DOUBLE PRECISION,
  PRIMARY KEY (time, station_id, equipment_id)
);

SELECT create_hypertable('telemetry', 'time', if_not_exists => TRUE);
```

### 6.2 健康分计算 CRON

```typescript
// server/src/jobs/calculateHealthScores.ts
import cron from 'node-cron';

cron.schedule('0 2 * * *', async () => {
  // 每日凌晨 2 点计算健康分
  console.log('[HealthScore] Starting daily calculation...');
  const stations = await Station.find();
  for (const station of stations) {
    const equipments = await Equipment.find({ stationId: station._id });
    for (const equip of equipments) {
      const score = await calculateHealthScore(equip);
      await HealthScore.findOneAndUpdate(
        { equipmentId: equip._id },
        { ...score, calculatedAt: new Date() },
        { upsert: true }
      );
    }
  }
  console.log('[HealthScore] Calculation complete.');
});
```

### 6.3 AI 助手接入

推荐使用 **MiniMax** 或 **Deepseek** API：

```typescript
// server/src/services/aiCopilot.ts
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: 'https://api.minimax.chat/v1', // 或其他 provider
});

export async function chatWithCopilot(userMessage: string, context: any) {
  const systemPrompt = `你是 SmartSolar 的 AI 运维助手。
SmartSolar 是一个光储电站运维管理平台。
当前用户询问以下数据：${JSON.stringify(context)}

请用中文回答，数据要准确。`;

  const response = await client.chat.completions.create({
    model: 'MiniMax-Text-01',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ],
  });

  return response.choices[0].message.content;
}
```

---

## 七、API 扩展

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/telemetry | 遥测数据列表 |
| GET | /api/telemetry/:equipmentId | 单设备历史遥测 |
| GET | /api/health-scores | 全场站健康分 |
| GET | /api/health-scores/:equipmentId | 单设备健康分详情 |
| GET | /api/health-scores/:equipmentId/history | 健康分历史趋势 |
| GET | /api/predictive-alerts | 预测性告警列表 |
| POST | /api/ai/chat | AI 助手对话 |

---

> 设计人：Javis 🤖
> 日期：2026-04-12
