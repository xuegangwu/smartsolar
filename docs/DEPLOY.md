# SmartSolar 部署指南

---

## 部署架构

```
GitHub Push → GitHub Actions → SSH → Server /var/www/smartsolar.solaripple.com
```

- **前端**: `smartsolar.solaripple.com/` (Nginx 静态托管)
- **后端**: `smartsolar.solaripple.com/api` → `localhost:3003` (Proxy)
- **服务**: PM2 管理 `smartsolar-server`

---

## 第一步：创建 GitHub 仓库

### 方式 A：网页创建（推荐）
1. 打开 https://github.com/new
2. **Repository name**: `smartsolar`
3. **Owner**: 选择 `xuegangwu` 或 `solaripple`
4. **Private** / **Public** 都可以
5. ❌ 不要勾选 "Add a README"
6. 点击 **Create repository**

### 方式 B：命令行
```bash
gh repo create smartsolar --public --source=. --push
```

---

## 第二步：配置 GitHub Secrets

在 GitHub 仓库页面，进入 **Settings → Secrets and variables → Actions**，添加：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `DEPLOY_HOST` | `47.90.138.136` | 服务器 IP |
| `DEPLOY_USER` | `root` | SSH 用户名（根据实际填写） |
| `DEPLOY_SSH_KEY` | `-----BEGIN RSA PRIVATE KEY-----\n...` | 私钥内容（cat ~/.ssh/solaripple.pem） |
| `DEPLOY_PATH` | `/var/www/smartsolar.solaripple.com` | 部署目录 |

> 💡 `DEPLOY_SSH_KEY` 值要包含 `-----BEGIN RSA PRIVATE KEY-----` 和 `-----END RSA PRIVATE KEY-----`，换行用 `\n`

---

## 第三步：本地初始化并推送

```bash
cd /Users/terry/.openclaw/workspace/smartsolar

# 初始化 git（如果还没有）
git init
git add .
git commit -m "Initial commit"

# 添加远程仓库（替换为你的实际仓库地址）
git remote add origin https://github.com/xuegangwu/smartsolar.git
# 或
git remote add origin git@github.com:xuegangwu/smartsolar.git

# 推送
git branch -M main
git push -u origin main
```

---

## 第四步：服务器准备（手动一次性操作）

在服务器上执行一次：

```bash
# 创建目录
mkdir -p /var/www/smartsolar.solaripple.com/smartsolar

# 安装 PM2（如果没有）
npm install -g pm2

# 配置 Nginx（/etc/nginx/sites-available/smartsolar.solaripple.com）
```

### Nginx 配置参考
```nginx
server {
    listen 80;
    server_name smartsolar.solaripple.com;

    root /var/www/smartsolar.solaripple.com/smartsolar/client;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:3003;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# 启用站点
ln -s /etc/nginx/sites-available/smartsolar.solaripple.com /etc/nginx/sites-enabled/
nginx -t && nginx - reload
```

---

## 触发部署

推送代码到 main 分支：
```bash
git push origin main
```

或手动触发：GitHub 仓库 → **Actions** → **Build & Deploy SmartSolar** → **Run workflow**

---

## 验证部署

部署完成后访问：
- 前端: https://smartsolar.solaripple.com
- 后端 API: https://smartsolar.solaripple.com/api/health
