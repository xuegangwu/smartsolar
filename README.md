# SmartSolar ☀️ 光储电站运维平台

> 面向内部运维团队的智能运维管理平台

---

## 快速启动

### 前置条件
- Node.js ≥ 18
- MongoDB（本地或 Docker）

### 1. 启动 MongoDB（首次）
```bash
docker run -d -p 27017:27017 --name mongo mongo
```

### 2. 安装依赖
```bash
cd server && npm install
cd ../client && npm install
```

### 3. 启动
```bash
# 终端1：后端
cd server && npm run dev   # → http://localhost:3003

# 终端2：前端
cd client && npm run dev   # → http://localhost:3004
```

### 4. 访问
- URL: http://localhost:3004
- 账号: `admin` / `admin`

---

## 项目结构

```
smartsolar/
├── DESIGN.md           # 设计方案
├── ITERATIONS.md       # 迭代记录（每轮 3 小时）
├── STANDARDS.md        # 开发规范
├── HEARTBEAT.md        # 心跳检查清单
├── server/             # Express + MongoDB
│   └── src/
│       ├── index.ts
│       ├── models/     # 9 个数据模型
│       ├── controllers/ # 业务逻辑
│       └── routes/      # REST API
└── client/             # React + Vite + TS
    └── src/
        ├── pages/       # 6 个页面
        ├── components/  # Layout
        └── services/    # API 封装
```

---

## 迭代计划

| 迭代 | 内容 |
|------|------|
| ITER-1 ✅ | 项目骨架搭建 |
| ITER-2 | 启动验证 + 种子数据 |
| ITER-3 | 设备台账完善 |
| ITER-4 | 工单状态机 + 详情页 |
| ITER-5 | 告警与 EMS 对接 |
| ITER-6 | 巡检计划页面 |
| ITER-7 | 备件仓库页面 |
| ITER-8 | O&M KPI 面板 |
| ITER-9 | 移动端适配 |
| ITER-10 | 部署 + 演示 |

详见 `docs/ITERATIONS.md`

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端 | React 18 + Vite + TypeScript + Ant Design |
| 后端 | Express + MongoDB (Mongoose) |
| 实时 | WebSocket |
| 地图 | Leaflet |
| 部署 | Docker |
