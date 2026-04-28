# 分销商指挥塔 - ITER-12

> 方案 A：面向分销商的精细化运营管理平台

---

## 一、核心功能

### 1.1 分销商业绩看板 `DistributorDashboard`
- 我的下级安装商业绩一览（本月完成套数、配额完成率）
- 区域覆盖率热力图
- 佣金统计（本月应付/已付/待结）
- AI 运营建议卡片

### 1.2 安装商配额管理 `InstallerManagement`
- 设置下级安装商月度配额（套数）
- 配额完成率追踪（0-100%）
- 超额预警（>70%提醒，>90%预警）
- 配额调整历史

### 1.3 项目完工确认流程 `ProjectCompletion`
- 线索报备 → 项目创建 → 施工进度 → 完工确认
-完工时触发佣金计算 + 积分发放
- 工单关闭 = 完工确认（复用现有工单状态机）

### 1.4 佣金计算引擎 `CommissionEngine`
- 基于项目实际完工（工单 closed）计算佣金
- 公式：`佣金 = 完工套数 × 单套佣金`
- 单套佣金 = f(安装商等级, 项目类型, 区域)
- 每月结算单自动生成

### 1.5 AI 运营分析 `DistributorAI`
- Kimi API 分析：各安装商增长趋势、区域市场饱和度
- 本月重点安装商预警（配额落后）
- 下月配额分配建议

---

## 二、数据模型扩展

### 2.1 CommissionRule（佣金规则）
```typescript
interface CommissionRule {
  _id: ObjectId;
  name: string;                   // 规则名称
  installerLevel: string;         // 'bronze'|'silver'|'gold'|'diamond'
  projectType: string;            // 'residential'|'commercial'|'industrial'
  region: string;                  // 区域，空=全部
  baseCommission: number;         // 单套基础佣金（元）
  capacityBonus: number;          // 超容量奖励（元/kW）
  quotaMultiplier: number;         // 超配额奖励倍数
  effectiveFrom: Date;
  effectiveTo?: Date;
  status: 'active' | 'inactive';
}
```

### 2.2 Settlement 扩展
```typescript
// 现有 PartnerSettlement 扩展
{
  workOrderIds: [ObjectId],      // 关联工单列表
  commissionRule: ObjectId,       // 适用的佣金规则
  perOrderCommission: number,     // 单套佣金
  totalCommission: number,        // 总佣金
  paidCommission: number,         // 已付佣金
}
```

---

## 三、API 设计

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/distributor/dashboard` | 业绩看板 |
| GET | `/api/distributor/installers` | 下级安装商列表 |
| PATCH | `/api/distributor/installers/:id/quota` | 设置配额 |
| GET | `/api/distributor/projects` | 项目列表 |
| POST | `/api/distributor/projects/:id/confirm-completion` | 完工确认 |
| GET | `/api/distributor/commissions` | 佣金记录 |
| POST | `/api/distributor/commissions/calculate` | 计算佣金 |
| GET | `/api/distributor/ai/suggestions` | AI 运营建议 |
| POST | `/api/distributor/work-orders/close-with-completion` | 关闭工单+确认完工 |

---

## 四、前端页面

| 页面 | 路由 | 说明 |
|------|------|------|
| 分销商看板 | `/distributor/dashboard` | 业绩总览 |
| 安装商管理 | `/distributor/installers` | 配额+业绩 |
| 项目管理 | `/distributor/projects` | 项目跟踪 |
| 佣金结算 | `/distributor/commissions` | 结算管理 |
| AI 建议 | `/distributor/ai` | AI运营分析 |

---

## 五、实现计划

| 阶段 | 内容 | 
|------|------|
| ITER-12.1 | 数据模型：CommissionRule + API |
| ITER-12.2 | 分销商看板页面 |
| ITER-12.3 | 安装商配额管理 |
| ITER-12.4 | 佣金计算引擎 |
| ITER-12.5 | AI 运营分析 |

---
