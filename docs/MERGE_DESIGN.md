# SmartSolar + PartnerHub 合并设计

> 合并愿景：统一的光储行业管理平台 —— 销售 + 运维全链路

---

## 一、现状分析

### 1.1 两个系统对比

| 维度 | SmartSolar | PartnerHub |
|------|-----------|-----------|
| **定位** | 光储运维平台（O&M） | 渠道销售管理平台 |
| **前端** | React + Vite SPA（smartsolar.solaripple.com） | Next.js（hub.solaripple.com） |
| **后端** | Express + Mongoose（port 3004） | Next.js API Routes（port 3000） |
| **数据库** | MongoDB `smartsolar` | 独立 MongoDB（待确认） |
| **核心实体** | Partner/WorkOrder/Inspection/Equipment/Alert | Lead/Opportunity/Order/Commission/Distributor |
| **认证** | JWT（Partner + Admin） | JWT（User） |
| **迭代** | ITER-1 到 ITER-12 | Phase 1-4 路线图 |

### 1.2 PartnerHub 独有的能力（需要合并）
- **销售漏斗**：Lead → Opportunity → Order → Commission
- **审批引擎**：ApprovalTemplate + ApprovalInstance（通用审批流）
- **价格政策**：PricePolicy（产品定价 + 折扣）
- **促销体系**：Promotion / RebateRule
- **资质管理**：CertificationAlert（证书到期预警）
- **地区/ Territory 管理**

### 1.3 SmartSolar 独有的能力（保留）
- **设备台账**：Equipment + EquipmentCategory
- **实时数据**：EMS SSE 实时拓扑
- **健康预测**：HealthScore + PredictiveAlert
- **AI 运维助手**：AICopilot + Kimi API
- **巡检计划**：InspectionPlan + InspectionRecord
- **备件仓库**：SparePart + SparePartConsume
- **运维工单**：WorkOrder（运维阶段）
- **SSE/拓扑图**：StationTopology

### 1.4 功能重叠（需统一）
- **Partner 模型**：
  - SmartSolar：`Partner`（含 distributor/installer 两种 type）
  - PartnerHub：`Distributor` + `Installer`（独立模型）
  - 解决：统一到 SmartSolar 的 Partner 模型（扩展必要字段）
- **Lead 模型**：
  - SmartSolar：`Lead`（简单版）
  - PartnerHub：`Lead`（完整版，含 source/assignedTo/propertyType/budgetRange）
  - 解决：合并两个 Lead 模型，以 PartnerHub 版本为主
- **用户认证**：两套 JWT 体系 → 统一

---

## 二、合并目标

### 2.1 统一数据层
```
SmartSolar MongoDB（单一数据库）
├── Partner（合并后的统一 Partner 模型）
├── PartnerUser（统一用户）
├── Lead（合并后完整版）
├── Opportunity      ← 新增（PartnerHub）
├── Order             ← 新增（PartnerHub）
├── Commission        ← 新增（PartnerHub）
├── ApprovalTemplate  ← 新增（PartnerHub）
├── ApprovalInstance  ← 新增（PartnerHub）
├── WorkOrder（运维工单，Order 完工后创建）
├── Station / Equipment / Alert / Inspection...
└── [PartnerHub 旧模型逐步废弃]
```

### 2.2 统一认证
- 单一 JWT，分角色访问不同模块
- 角色：admin / manager / distributor / installer / technician
- 统一登录页，自动根据 role 跳转

### 2.3 统一前端
```
smartsolar.solaripple.com（单一 React SPA）
├── /login                    — 统一登录
├── /dashboard                — 综合仪表盘
├── /channels                 — 渠道管理（PartnerHub 的 distributors/installers）
├── /leads                    — 线索管理（合并后）
├── /opportunities            — 商机管理（新增）
├── /orders                   — 订单管理（新增）
├── /commissions              — 佣金管理（新增）
├── /approvals                — 审批中心（新增）
├── /stations / equipment     — 运维：电站/设备
├── /work-orders / inspection — 运维：工单/巡检
├── /spare-parts              — 运维：备件仓库
├── /health                   — 运维：健康分
├── /ai                       — AI 助手
├── /distributor/*            — 分销商指挥塔（已有）
└── /partner-portal/*         — 渠道商门户（已有）
```

---

## 三、合并策略

### Phase 1：后端合并（API 统一）⏳
**目标**：一个 Express API 服务，同时服务 SmartSolar 和 PartnerHub 的所有端点

**步骤 1.1**：建立共享数据库
- 将 PartnerHub 的 MongoDB 数据迁移到 SmartSolar 的 `smartsolar` 数据库
- PartnerHub 的 collection 逐步 alias 到新模型名称

**步骤 1.2**：统一 Partner 模型（最关键）
```typescript
// 统一 Partner 模型（合并 Distributor + Installer）
{
  _id: ObjectId,
  type: 'distributor' | 'installer',   // 原 SmartSolar 的 type 字段
  // === Distributor 字段（来自 PartnerHub）===
  code: string,                         // 唯一编码
  legalPerson: string,                  // 法人
  contactPhone: string,
  email: string,
  level: 'province' | 'city' | 'district' | 'bronze' | 'silver' | 'gold' | 'diamond',
  region: string,
  certification: { /* 营业执照/税务登记 */ },
  certifications: [{ /* 资质证书 */ }],
  parentPartnerId: ObjectId,            // 上级分销商（原 parentDistributor）
  boundDistributor: ObjectId,            // 绑定的分销商（installer 专属）
  // === Installer 额外字段（来自 PartnerHub）===
  serviceTypes: ['pv', 'storage', 'ev_charger', 'hybrid'],  // 服务类型
  teamSize: number,
  coverageRadius: number,
  // === SmartSolar 原有字段 ===
  monthlyQuota: number,
  quotaAchieved: number,
  totalPoints: number,
  availablePoints: number,
  rating: number,
  // === 保留 ===
  status: 'pending' | 'active' | 'suspended' | 'terminated',
  createdAt/updatedAt
}
```

**步骤 1.3**：合并 Lead 模型
```typescript
// 合并后的 Lead 模型（以 PartnerHub 版本为主）
{
  _id: ObjectId,
  leadNo: string,                        // 线索编号
  source: string,                        // 来源
  sourcePartnerId: ObjectId,              // 来源渠道商（原 sourceDistributor/sourceInstaller）
  referrerCustomerId: ObjectId,           // 转介绍客户
  customerName: string,
  customerPhone: string,
  customerAddress: string,
  region: string,
  propertyType: 'residential' | 'commercial' | 'industrial',
  roofType: string,
  monthlyBill: number,
  interestProducts: ['pv', 'storage', 'ev_charger', 'hybrid'],
  budgetRange: string,
  status: 'new' | 'contacted' | 'qualified' | 'quoted' | 'converted' | 'lost',
  assignedPartnerId: ObjectId,           // 分配给哪个渠道商
  assignedPartnerType: 'distributor' | 'installer',
  expectedCloseDate: Date,
  lostReason: string,
  // 合并 PartnerHub 的阶段字段
  opportunityId: ObjectId,               // 转换后的商机
  notes: string,
  createdAt/updatedAt
}
```

**步骤 1.4**：新增 Opportunity 和 Order 模型
```typescript
// Opportunity 商机
{
  _id: ObjectId,
  oppNo: string,
  leadId: ObjectId,
  title: string,
  customerName: string,
  customerPhone: string,
  assignedPartnerId: ObjectId,
  productType: 'pv' | 'storage' | 'ev_charger' | 'hybrid',
  systemCapacity: number,
  estimatedAmount: number,
  probability: number,
  stage: 'discovery' | 'site_survey' | 'design' | 'quotation' | 'negotiation' | 'contract' | 'won' | 'lost',
  expectedCloseDate: Date,
  actualCloseDate: Date,
  orderId: ObjectId,                     // 关联订单
  notes: string
}

// Order 订单（核心销售单）
{
  _id: ObjectId,
  orderNo: string,
  customerName/Phone/Address/Region,
  productType/ProductModel/Quantity/TotalAmount,
  status: 'pending' | 'confirmed' | 'shipped' | 'installed' | 'completed' | 'cancelled',
  leadId: ObjectId,
  opportunityId: ObjectId,
  sourcePartnerId: ObjectId,             // 来源渠道商（分销商）
  assignedInstallerId: ObjectId,          // 安装商
  projectId: ObjectId,                    // 关联的 SmartSolar 项目
  installationDate: Date,
  completionDate: Date,
  // 佣金相关
  commissionAmount: number,
  commissionStatus: 'pending' | 'calculated' | 'paid',
  // WorkOrder 关联（完工后自动生成）
  workOrderId: ObjectId,                  // 对应的运维工单
  createdAt/updatedAt
}
```

**步骤 1.5**：新增审批引擎
```typescript
// ApprovalTemplate（审批模板）
{
  _id: ObjectId,
  name: string,
  code: string,                          // unique: 'ORDER_APPROVE' / 'COMMISSION_PAY' / 'INSTALLER_PROMOTE'
  entityType: 'order' | 'commission' | 'partner' | 'settlement',
  action: string,
  nodes: [{                               // 审批节点（会签/或签）
    name: string,
    order: number,
    approvalType: 'all' | 'any',
    approvers: [{
      type: 'user' | 'role' | 'partner',
      userId: ObjectId,
      role: string,
      partnerType: 'distributor' | 'installer',
      partnerEntityId: ObjectId
    }]
  }]
}

// ApprovalInstance（审批实例）
{
  _id: ObjectId,
  templateId: ObjectId,
  entityType: string,
  entityId: ObjectId,
  currentNode: number,
  status: 'pending' | 'approved' | 'rejected',
  history: [{
    nodeIndex: number,
    approverId: ObjectId,
    decision: 'approve' | 'reject',
    comment: string,
    decidedAt: Date
  }]
}
```

**步骤 1.6**：新增 Commission 结算模型
```typescript
{
  _id: ObjectId,
  commissionNo: string,
  orderId: ObjectId,
  distributorId: ObjectId,                // 分销商
  installerId: ObjectId,                  // 安装商
  amount: number,
  type: 'sales' | 'installation' | 'referral' | 'override',
  status: 'pending' | 'approved' | 'paid' | 'rejected',
  period: string,                         // '2026-04'
  approvalId: ObjectId,                   // 关联审批实例
  paidDate: Date,
  paidMethod: string,
  transactionRef: string,
  createdAt/updatedAt
}
```

### Phase 2：前端合并（路由 + 页面）
**目标**：所有功能在 SmartSolar React SPA 内访问

**步骤 2.1**：统一路由结构
- 在 SmartSolar `App.tsx` 中添加 PartnerHub 原有的页面路由
- 新增 `/channels`（渠道商列表，含 distributor + installer）
- 新增 `/opportunities`（商机管理）
- 新增 `/orders`（订单管理）
- 新增 `/commissions`（佣金管理）
- 新增 `/approvals`（审批中心）
- 新增 `/price-policies`（价格政策）
- 新增 `/cert-alerts`（资质预警）

**步骤 2.2**：迁移 PartnerHub 页面
- PartnerHub 的页面组件迁移到 SmartSolar 的 `client/src/pages/`
- 复用 SmartSolar 的 Layout 和认证机制
- 分阶段迁移，每次迁移后验证功能正常

**步骤 2.3**：PartnerHub 废弃
- PartnerHub（Next.js app）逐步减少新功能开发
- Phase 2 完成后，PartnerHub 进入只读/维护模式

### Phase 3：工作流串联
**目标**：销售 → 运维 全链路打通

```
Lead（线索）
  ↓ 转换
Opportunity（商机）
  ↓ 赢单
Order（订单）
  ↓ 完工
WorkOrder（运维工单）← SmartSolar 已有
  ↓ 安装完成
Commission（佣金结算）← 自动计算
  ↓ 审批通过
PartnerSettlement（积分/佣金发放）
```

**关键串联点**：
- Order 状态变为 `completed` → 自动创建 WorkOrder（运维阶段）
- WorkOrder 关闭 → 自动计算 Commission
- Commission 审批通过 → 更新 PartnerSettlement

---

## 四、数据迁移计划

### 迁移原则
1. **不停服**：新模型逐步引入，PartnerHub 继续运行
2. **逐步迁移**：按 Priority 迁移 collections
3. **数据校验**：迁移后双向验证数据一致性

### 迁移顺序
1. `PartnerUser` + 统一 auth → SmartSolar Partner + PartnerUser（已有基础，跳过）
2. `Lead`（PartnerHub → SmartSolar Lead）
3. `Distributor` → Partner（type='distributor'）
4. `Installer` → Partner（type='installer'）
5. `Opportunity`（新增 collection）
6. `Order`（新增 collection）
7. `Commission`（新增 collection）
8. `ApprovalTemplate` / `ApprovalInstance`（新增 collection）
9. PartnerHub 各独立 collection 废弃

---

## 五、技术决策

### 5.1 单体 vs 微服务
**决策**：统一 Express API（单体）
- SmartSolar 和 PartnerHub 后端合并为一个 Express 服务
- 理由：减少运维复杂度，两套系统本来就在同一公司内部
- 未来可按需拆分为独立微服务

### 5.2 前端框架
**决策**：保留 SmartSolar 的 React + Vite SPA，逐步吸收 PartnerHub 页面
- 理由：SmartSolar SPA 已有完整的 O&M 功能，迁移 Next.js 页面成本较高
- PartnerHub 的审批流、数据分析页面可优先迁移

### 5.3 数据库
**决策**：MongoDB 统一（SmartSolar 所在的 `smartsolar` 数据库）
- PartnerHub 迁移到同一 MongoDB 实例（不同 database 或同一 database）
- 最终：统一 MongoDB + 统一 API

### 5.4 认证
**决策**：统一 JWT
- SmartSolar 已有 `Partner JWT Secret` 和 `Admin JWT Secret`
- 扩展支持 PartnerHub 的 User 模型
- 统一 role：admin / manager / distributor / installer / technician

---

## 六、风险与注意事项

1. **PartnerHub 业务逻辑不能丢**：PartnerHub 的审批引擎、销售漏斗是核心，合并时不能简化
2. **数据一致性**：迁移期间两套系统同时写入需特别小心，建议"写入 SmartSolar → 同步 PartnerHub"过渡
3. **PartnerHub 的 Distributor/Installer 独立模型**：合并后字段映射复杂，建议参考上面的统一 Partner 模型
4. ** PartnerHub 用户的迁移**：PartnerHub 的 User 账号需映射到 Partner + PartnerUser
5. **现有 SmartSolar Partner 模型**：已有完整渠道商体系，合并时需保证向后兼容

---

## 七、后续动作

| 顺序 | 任务 | 工作量 |
|------|------|--------|
| 1 | 确定 PartnerHub MongoDB 连接方式 | 小 |
| 2 | 设计统一 Partner 模型（含字段映射） | 中 |
| 3 | 迁移 Lead 数据 + 合并 Lead 模型 | 中 |
| 4 | 迁移/合并 Distributor → Partner | 中 |
| 5 | 迁移/合并 Installer → Partner | 中 |
| 6 | 新增 Opportunity 模型 + API | 小 |
| 7 | 新增 Order 模型 + API | 中 |
| 8 | 新增 Commission 模型 + API | 中 |
| 9 | 新增 ApprovalTemplate/Instance 模型 + API | 大 |
| 10 | 前端路由合并 + 迁移 PartnerHub 页面 | 大 |
| 11 | 工作流串联（Order→WorkOrder→Commission） | 中 |
| 12 | PartnerHub Next.js 废弃 | 小 |

---

_文档版本：v1.0 — 2026-04-28_
