# SmartSolar 心跳 — 每轮迭代健康检查

> 3小时一个迭代，快速原型 → 确认 → 迭代

---

## 每轮迭代开始时检查

- [ ] 上一轮代码已 commit 并 push
- [ ] 上一轮功能已通过基本测试
- [ ] 本轮需求已确认（见 ITERATIONS.md）
- [ ] 无 blocking issue

---

## 心跳任务（约每30分钟一次）

### 1. 编译检查
```bash
cd client && npx tsc --noEmit
cd ../server && npx tsc --noEmit
```
有任何 error → 立即修复后再继续

### 2. 功能验证
- [ ] 服务端启动正常（port 3003）
- [ ] 客户端启动正常（port 3004）
- [ ] 登录功能正常
- [ ] 本轮目标功能可操作

### 3. Git 状态
- [ ] 代码已 commit（每轮迭代结束前必须 commit）
- [ ] commit message 格式：`[ITER-N] feat/fix: 描述`

---

## 迭代交接检查（每3小时）

- [ ] 功能演示视频或截图保存到 `docs/demo/`
- [ ] 本轮 `ITERATIONS.md` 已更新（状态：Done/Pending/Blocking）
- [ ] 下一轮计划已确认
- [ ] 如有 bug → 创建 `docs/BUGS.md` 条目

---

## 紧急情况

- 发现 blocking bug → 立即停止本轮迭代，转 bugfix
- 需求变更 → 更新 ITERATIONS.md 并通知
- 服务起不来 → 优先解决基础设施问题
