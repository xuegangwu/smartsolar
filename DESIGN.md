# SmartSolar — 光储电站运维平台

> 面向 Risen 内部运维团队的智能运维管理平台
>
> **开发模式**: 3 小时迭代，快速原型 → 演示确认 → 迭代
> **迭代记录**: `docs/ITERATIONS.md`
> **开发规范**: `docs/STANDARDS.md`

---

## 项目概述

**项目名称：** SmartSolar
**定位：** 光储电站智能运维管理平台（O&M Platform）
**用户：** Risen 内部运维团队
**核心理念：** 让运维从「救火」变成「防火」

---

## 技术栈

| 组件 | 选择 |
|------|------|
| 前端 | React + Vite + TypeScript + Ant Design |
| 后端 | Express + MongoDB (Mongoose) |
| 实时 | WebSocket |
| 地图 | Leaflet |
| 部署 | Docker |

---

## 功能优先级

### P0（最小可行，MVP）
- 设备台账（电站 → 设备类型 → 设备）
- 工单管理（创建 → 派发 → 处理 → 验收 → 关闭）
- 告警接入（从 EMS 读取）

### P1（核心运维）
- 巡检计划 + 执行记录
- 备件仓库管理
- O&M KPI 统计面板
- 运维人员管理

### P2（智能化）
- AI 故障根因分析
- 设备健康评分
- 月度报告自动生成

---

## 数据模型

### Station（电站）
```js
{
  _id, name, type,           // solar | storage | solar_storage
  location: { address, lat, lng },
  capacity, installedCapacity, peakPower,
  owner, contact,            // 业主信息
  status,                    // online | offline | maintenance
  gridConnectionDate,
  createdAt, updatedAt
}
```

### EquipmentCategory（设备类型）
```js
{ _id, stationId, name }     // e.g. "光伏组串", "储能BMS", "充电桩"
```

### Equipment（设备台账）
```js
{
  _id, stationId, categoryId,
  name, type, brand, model, serialNumber,
  ratedPower, ratedVoltage, efficiency,
  installationDate, warrantyExpire,
  status,                    // online | offline | maintenance
  parameters: {},            // 类型-specific 参数
  createdAt, updatedAt
}
```

### WorkOrder（工单）
```js
{
  _id, orderNo,
  stationId, equipmentId,
  title, description,
  type,                      // fault | maintenance | inspection | upgrade
  priority,                  // urgent | important | normal
  status,                    // created | assigned | accepted | processing | accepted_check | closed
  assigneeId,
  createdAt, updatedAt,
  closedAt
}
```

### MaintenanceRecord（维护记录）
```js
{ _id, equipmentId, workOrderId, description, cost, createdAt }
```

### Alert（告警）
```js
{ _id, stationId, equipmentId, level, code, message, acknowledged, createdAt }
```

### InspectionPlan（巡检计划）
```js
{ _id, stationId, equipmentId, period, items, nextRunAt }
```

### InspectionRecord（巡检执行记录）
```js
{ _id, planId, inspectorId, result, photos, signedAt }
```

### SparePart（备件）
```js
{ _id, name, model, warehouse, quantity, safeStock, unitCost }
```

### Technician（运维人员）
```js
{ _id, name, phone, skills, status, currentTaskId }
```

---

## API 设计

### 设备台账
- `GET    /api/stations` - 电站列表
- `GET    /api/stations/:id` - 电站详情
- `POST   /api/stations` - 新增电站
- `GET    /api/equipments` - 设备列表
- `GET    /api/equipments/:id` - 设备详情
- `POST   /api/equipments` - 新增设备
- `PUT    /api/equipments/:id` - 更新设备

### 工单
- `GET    /api/work-orders` - 工单列表
- `POST   /api/work-orders` - 创建工单
- `PUT    /api/work-orders/:id` - 更新工单
- `PATCH  /api/work-orders/:id/status` - 变更状态

### 告警
- `GET    /api/alerts` - 告警列表（从EMS同步）
- `POST   /api/alerts/:id/acknowledge` - 确认告警

### 巡检
- `GET    /api/inspection/plans` - 巡检计划列表
- `POST   /api/inspection/records` - 提交巡检记录

### 备件
- `GET    /api/spare-parts` - 备件列表
- `POST   /api/spare-parts/consume` - 领用

### KPI
- `GET    /api/kpi/om` - O&M KPI 统计

---

## 页面结构

```
/login
/dashboard          - 监控大屏 + 今日概览
/stations          - 电站列表
/stations/:id      - 电站详情 + 设备树
/equipment         - 全部设备台账
/work-orders       - 工单管理
/alerts            - 告警管理
/inspection        - 巡检管理
/spare-parts       - 备件仓库
/technicians       - 运维人员
/kpi               - O&M KPI 统计
/settings          - 系统设置
```

---

## 与 EMS 的关系

- SmartSolar 读取 EMS 的 MongoDB 中的 `Telemetry` 和 `Alert` 数据
- EMS 负责数据采集（MQTT/设备接入）
- SmartSolar 负责运维闭环管理
- 两套系统共用同一个 MongoDB 实例
