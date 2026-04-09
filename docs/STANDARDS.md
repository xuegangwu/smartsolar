# SmartSolar 开发规范

> 快速原型开发，但不失工程严谨性

---

## 代码规范

### Git 提交规范
```
[ITER-N] <type>: <描述>

feat:     新功能
fix:      修复 bug
refactor: 重构（不改变功能）
docs:     文档更新
chore:    构建/工具变更
```

示例：
```
[ITER-1] feat: 初始项目骨架
[ITER-2] fix: 修复 Equipment 列表不显示问题
[ITER-3] refactor: 将 API 封装从 api.ts 分离到 services/
```

### 分支策略
- `main` — 稳定可运行版本（每个 ITER 结束时合并）
- 不开过多分支，原型阶段直接 main 开发

### 每轮迭代必须完成
1. 代码 commit（每轮结束前）
2. `docs/ITERATIONS.md` 更新
3. 功能截图存档（`docs/demo/`）
4. 下轮计划确认

---

## API 设计规范

### RESTful 约定
```
GET    /api/resource          # 列表
GET    /api/resource/:id       # 详情
POST   /api/resource           # 创建
PUT    /api/resource/:id       # 全量更新
PATCH  /api/resource/:id       # 部分更新
DELETE /api/resource/:id       # 删除
```

### 响应格式
```json
{
  "success": true,
  "data": { ... },
  "message": "optional message"
}
```

### 错误响应
```json
{
  "success": false,
  "message": "错误描述",
  "error": "ERROR_CODE"
}
```

---

## 前端规范

### 文件命名
- 页面组件：`PascalCase.tsx`（如 `WorkOrders.tsx`）
- 业务组件：`PascalCase.tsx`
- 工具函数：`camelCase.ts`

### 目录结构
```
src/
├── pages/          # 页面组件（路由页面）
├── components/     # 公共组件
├── services/       # API 封装
├── types/          # TypeScript 类型定义
└── i18n/           # 国际化（后续扩展）
```

### 组件规范
- 使用 Ant Design 组件库
- 禁止内联复杂样式，提取到 `index.css`
- 每个页面组件独立文件，不混在一起

---

## 后端规范

### 目录结构
```
server/src/
├── index.ts           # 启动入口
├── models/            # Mongoose 模型
├── controllers/        # 业务逻辑
├── routes/            # 路由定义
├── middleware/         # 中间件
└── services/          # 公共服务
```

### Mongoose 模型规范
- Schema 有注释
- 字段有 `type` 和 `required` 标记
- 时间戳字段用 `timestamps: true`
- 常用查询建索引

---

## 测试规范（原型阶段）

### 最低测试标准
每个 ITER 结束时人工验证：
1. 服务启动无报错
2. 页面可正常加载
3. CRUD 操作正常
4. 截图存档

### 不做的事（原型阶段）
- 不写单元测试（投入产出比低）
- 不做性能优化（先跑起来）
- 不做国际化（先中文）
- 不做权限系统（先 admin）

---

## 部署规范

### 开发环境
- Server: `http://localhost:3003`
- Client: `http://localhost:3004`
- MongoDB: `mongodb://localhost:27017/smartsolar`

### 生产环境
- Docker 容器化
- 环境变量配置（`.env` 不提交）
- 详见 `docs/DEPLOY.md`
