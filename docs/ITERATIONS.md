# SmartSolar 迭代记录

> 每轮迭代：快速原型 → 演示确认 → 迭代

---

## ITER-12: 分销商指挥塔 ✅
**时间**: 2026-04-27
**目标**: 面向分销商的精细化运营管理平台

### 完成内容
- [x] CommissionRule 数据模型（等级/类型/区域佣金规则）
- [x] 分销商专用认证（/distributor/auth/login, distributor secret）
- [x] 业绩看板：完工套数、配额完成率、佣金统计、告警工单数
- [x] 安装商配额管理（设置配额、70%/90%预警）
- [x] 佣金规则 CRUD（基础佣金+容量奖励+超配额倍数）
- [x] 佣金计算引擎（按工单列表计算）
- [x] AI 运营分析（Kimi API 生成建议）
- [x] 页面：/distributor-login, /distributor/dashboard

### 状态: Done ✅ 2026-04-27

---

## P1-D: 积分兑换审批流完善 ✅
**时间**: 2026-04-21
- 发货确认 + 确认收货流程
- 状态机：pending → approved → shipped → completed

---

## P1-C: 配额+月度结算体系 ✅
**时间**: 2026-04-21
- Partner.monthlyQuota / quotaAchieved
- PartnerSettlement 月度结算单

---

## P1-B: 客户线索/报备系统 ✅
**时间**: 2026-04-21
- Lead 模型 + 报备保护期
- /partner-leads 页面

---

## P1-A: 安装商招募入驻 ✅
**时间**: 2026-04-21
- PartnerApplication 申请/审批流程
- /partner-register, PartnerAdmin 审批 Tab

---

## P0: 核心 Patch ✅
**时间**: 2026-04-21
- 分销商 dashboard 统计修复
- 工单客户评分（5星+表情反馈）
- 投诉处理（PartnerComplaint 模型 + ≥3投诉降级机制）

---

## ITER-10: GitHub Actions CI/CD 自动化部署 ⏳
**状态**: 待定

---

## 下一轮建议

| 迭代 | 内容 | 优先级 |
|------|------|--------|
| ITER-13 | 客户自助 Portal（业主查看自家电站数据） | 高 |
| ITER-14 | 财务报表/结算导出（Excel/PDF） | 中 |
| ITER-10 | GitHub Actions CI/CD 自动化部署 | 中 |
| ITER-15 | 设备健康预测（基于历史数据的 MTTR 预测） | 低 |
