# 上海停车情报站 · 自部署手册（阿里云 ECS）

本项目原始产物由豆包「妙搭」全栈模板生成，代码本身是标准的 **NestJS + React** 工程，
可以脱离平台独立部署到自己的服务器。本文给出 Docker Compose 与裸机两种方案。

---

## 1. 技术栈与产物结构

| 层 | 技术 |
| --- | --- |
| 前端 | React 19 + TypeScript + Vite + Tailwind + shadcn/ui + TanStack Query + Leaflet/OSM |
| 后端 | NestJS 10 + Express + Drizzle ORM + PostgreSQL + class-validator |
| 构建 | 后端 SWC（`nest build`），前端 Vite |

```
client/            前端源码（含 Leaflet 地图、页面）
server/            后端源码（modules/parking|registration|favorite|view，database/schema.ts）
shared/            前后端共享类型（api.interface.ts）
scripts/           构建脚本（build.sh 为平台流水线用，自部署不用）
deploy/
  init.sql                 建库脚本（自定义类型 + 6 张表）
  nginx.conf               nginx 站点配置（静态资源 + 反向代理）
  json-to-seed-sql.mjs     线上数据 → 种子 SQL 转换器
Dockerfile         三阶段镜像（builder / app / nginx）
docker-compose.yml  db + app + web 编排
.env.example       环境变量样例
```

---

## 2. 与平台环境的四个关键差异（必须先了解）

1. **数据库变量名是 `SUDA_DATABASE_URL`**
   平台核心包 `@lark-apaas/fullstack-nestjs-core` 读取的是 `SUDA_DATABASE_URL`，
   写成常见的 `DATABASE_URL` 不会生效，服务会连不上库。

2. **不要执行 `npm run build`**
   该命令走 `scripts/build.sh`，第一步会调用 `npx fullstack-cli action-plugin init`
   并要求交互选择 front/back，在平台外会直接卡住。
   自部署请用官方非交互入口：`npm run build:prod`（= `build:server` + `build:client`）。
   同理，`npm ci` 要加 `--ignore-scripts` 跳过 `postinstall` 里的平台插件初始化。

3. **前端静态资源需要自己托管**
   平台生产环境由 CDN 托管 `dist/client/assets`，应用本身不 serve 静态文件。
   本项目用 nginx 托管 `/assets/*`，并把其余请求反代到 Node 服务。

另外：构建产物里的 `index.html` 落在 `dist/client/client/index.html`，
而 `@Render('index')` 从 views 根目录找 `index.html`，因此构建后需要
`cp dist/client/client/index.html dist/client/index.html`（Dockerfile 已内置这一步）。

4. **必须设置 `FORCE_AUTHN_INNERAPI_DOMAIN`，并关闭平台 CSRF**
   平台模块在“平台模式”下启动时会校验基础域名，缺失则直接退出：
   `Error: 平台模式需要基础域名，请设置环境变量 FORCE_AUTHN_INNERAPI_DOMAIN`。
   填自己的访问地址即可（容器内可填 `http://app:3000`）。
   同时平台 CSRF 中间件依赖平台下发的 cookie，脱离平台后 `/api/*` 会被
   `403 Forbidden，csrf token not found in cookie` 拦掉，
   因此 `server/app.module.ts` 已改为 `enableCsrf: process.env.ENABLE_CSRF === 'true'`（默认关闭）。

> 以上 4 点均已在本机实测确认：服务能成功启动并监听，首页在补齐 `index.html` 后可正常渲染，
> 接口不再被 CSRF 拦截。数据库链路的完整验证需真实 PostgreSQL，本机无 PG 环境未做端到端测试。

---

## 3. 方案一：Docker Compose（推荐）

### 3.1 ECS 准备

- 系统：Ubuntu 22.04 / Alibaba Cloud Linux 3 均可
- 规格：2 核 4G 起（前端构建峰值内存较高，构建阶段建议 8G；也可在本地构建后只推镜像）
- 安全组放通：80（以及可选的 443）
- 安装 Docker 与 Compose 插件：

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
docker compose version
```

### 3.2 拉代码并启动

```bash
git clone <你的仓库地址> parking-site
cd parking-site
cp .env.example .env          # 按需改 POSTGRES_PASSWORD / WEB_PORT

docker compose up -d --build
docker compose ps
docker compose logs -f app
```

启动后访问 `http://<ECS 公网 IP>/`，接口自检：

```bash
curl -s http://127.0.0.1/api/parking?page=1&pageSize=5
curl -s http://127.0.0.1/api/parking/all | head -c 500
```

> `deploy/init.sql` 只在 **数据卷为空** 时执行。若库已初始化过、需要重建，执行
> `docker compose down -v` 会连同数据一起删除，请谨慎。

### 3.3 绑定域名与 HTTPS

nginx 已在容器内监听 80，宿主机再做一层反代或直接暴露即可。若要 HTTPS：
在宿主机用 certbot 签发证书，并把 443 反代到 `127.0.0.1:80`（或直接改 `deploy/nginx.conf` 加 TLS）。

---

## 4. 方案二：裸机部署（Node.js + PostgreSQL + nginx）

### 4.1 安装运行时

```bash
# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs

# PostgreSQL 16
apt-get install -y postgresql postgresql-contrib
```

### 4.2 建库建表

```bash
su - postgres -c "psql -c \"CREATE USER parking WITH PASSWORD 'parking_pass';\""
su - postgres -c "psql -c \"CREATE DATABASE parking OWNER parking;\""
psql "postgresql://parking:parking_pass@127.0.0.1:5432/parking" -f deploy/init.sql
```

### 4.3 构建

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run build:prod
cp -f dist/client/client/index.html dist/client/index.html
```

### 4.4 环境变量与启动

```bash
cp .env.example .env      # 改 SUDA_DATABASE_URL / SERVER_HOST=0.0.0.0
set -a && . ./.env && set +a
node dist/server/main.js
```

生产建议交给 systemd（工作目录必须是**项目根目录**，因为视图目录按 `process.cwd()/dist/client` 解析）：

```ini
# /etc/systemd/system/parking.service
[Unit]
Description=Shanghai Parking Info
After=network.target postgresql.service

[Service]
Type=simple
WorkingDirectory=/opt/parking-site
EnvironmentFile=/opt/parking-site/.env
ExecStart=/usr/bin/node dist/server/main.js
Restart=always
RestartSec=5
User=www-data

[Install]
WantedBy=multi-user.target
```

```bash
systemctl daemon-reload && systemctl enable --now parking
systemctl status parking
```

### 4.5 nginx

```nginx
server {
    listen 80;
    server_name parking.example.com;
    client_max_body_size 10m;

    location /assets/ {
        root /opt/parking-site/dist/client;
        expires 30d;
        add_header Cache-Control "public, max-age=2592000, immutable";
    }

    location = /favicon.svg {
        root /opt/parking-site/dist/client;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
nginx -t && systemctl reload nginx
```

---

## 5. 数据迁移（把线上 60+ 条停车情报搬到自建库）

线上接口受豆包账号鉴权保护，匿名 curl 会 302 到登录页，**无法直接抓取**。
迁移方式是「登录态导出 + 转 SQL」：

1. 用已登录的浏览器打开已发布应用，控制台执行：

```js
fetch('/api/parking/all', { credentials: 'include' })
  .then((r) => r.json())
  .then((d) => copy(JSON.stringify(d)));
```

2. 把复制到的 JSON 存成 `parking-seed.json`，转换并导入：

```bash
node deploy/json-to-seed-sql.mjs parking-seed.json > deploy/seed.sql
psql "$SUDA_DATABASE_URL" -f deploy/seed.sql
```

如果暂时拿不到导出数据，建表脚本也能让应用先跑起来，只是列表为空，
需要后续通过「认证商户登记」入口或手工补数据。

---

## 6. 验收清单

- [ ] `docker compose ps` 中 db/app/web 均 healthy 或 running
- [ ] `GET /api/parking?page=1&pageSize=10` 返回 200 且 `items` 结构正确
- [ ] `GET /api/parking/all` 返回全部数据（已导入种子时条数对得上）
- [ ] 首页能打开，`/assets/index-*.js` 200（不是 404）
- [ ] 地图瓦片来自 OpenStreetMap，无 Key 依赖
- [ ] 评分 / 评论 / 纠错 / 收藏 / 商户登记 五个写接口各提交一次，落库成功
- [ ] 手机端访问布局正常（H5 为主要使用场景）

---

## 7. 已知限制与风险

- **鉴权缺失**：平台侧原本由网关做登录拦截，自部署后 `/api/*` 完全公开。
  若用于公网，建议在 nginx 层加 IP 白名单 / Basic Auth，或后续接入自己的用户体系。
- **`__platform__` 为空**：`index.html` 里的 `{{appId}}`、`{{basename}}` 等占位符由平台注入，
  自部署时渲染为空值。前端路由默认按根路径 `/` 工作（已按根路径验证资源路径），
  但若出现路由异常，优先检查这里。
- **平台能力不可迁移**：`PlatformModule` 里的文件服务、能力目录、MCP 端点等依赖平台环境，
  本应用仅使用其中的数据库注入（`DRIZZLE_DATABASE`），其余能力在自部署下不生效。
- **构建内存**：`vite build` 峰值内存较高，2C2G 机器容易 OOM；建议 4G 以上，
  或在本机构建后只把 `dist` 与 `node_modules` 同步到服务器。

---

## 8. 子路径部署（部署在已有站点的 /parking 下）

当服务器上已有站点（例如 `ridingwind.cn` 已有 TLS 配置），只想把本应用挂到 `/parking` 时，
前端必须按子路径构建，否则资源与接口都会打到根路径：

```bash
# 1) 前端按子路径构建（资源引用与 axios baseURL 都会变成 /parking）
CLIENT_BASE_PATH=/parking npm run build:client

# 2) 后端照常构建
npm run build:server

# 3) 生成静态入口（把平台占位符填平，basename 写成 /parking）
CLIENT_BASE_PATH=/parking node scripts/prepare-static-web.mjs
```

产物：

- `dist/web/index.html` + `dist/web/assets/` —— 交给 nginx 静态托管
- `dist/server/` —— Node 服务，只需提供 `/api/*`

Node 服务单独监听 3011（不占用 80/443），用 `deploy/parking.service` 托管，见 8.2。

nginx 片段见 `deploy/nginx-parking.conf`（`location = /parking` 补斜杠、`/parking/assets/` 静态、
`/parking/api/` 反代并剥前缀、其余回退到 `index.html`）。并入现有 `server{}` 后：

```bash
nginx -t && systemctl reload nginx
```

访问 `https://ridingwind.cn/parking/`，接口为 `https://ridingwind.cn/parking/api/parking`。

> 注意：不要用 Node 的 `ViewController` 渲染入口页。平台会按 appId 推导 basename（得到 `/app/`），
> 子路径部署下会导致前端路由错乱，因此这里改为静态托管入口页。

### 8.1 数据库角色（必做，否则接口 500）

平台数据层会在每个请求上执行 `SET LOCAL ROLE`：匿名请求用 `anon_`、登录用户用 `authenticated_`、
系统账号用 `service_role_`。自建库没有这些角色时，接口会报 `role "anon_" does not exist`。
建表后执行一次：

```bash
docker exec -i parking-db psql -U parking -d parking -v ON_ERROR_STOP=1 < deploy/pg-roles.sql
```

### 8.2 服务托管

`deploy/parking.service` 是可直接使用的 systemd unit（`WorkingDirectory=/opt/parking-site`、
读取 `.env`、`Restart=always`）：

```bash
cp deploy/parking.service /etc/systemd/system/parking.service
systemctl daemon-reload && systemctl enable --now parking
journalctl -u parking -f
```

`.env` 中至少要写：`SERVER_HOST=127.0.0.1`、`SERVER_PORT=3011`、`SUDA_DATABASE_URL`、
`FORCE_AUTHN_INNERAPI_DOMAIN=http://127.0.0.1:3011`、`ENABLE_CSRF=false`。

---

## 9. 常见故障

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 启动即报数据库连接错误 | 变量名写成 `DATABASE_URL` | 改成 `SUDA_DATABASE_URL` |
| `relation "user_profile" does not exist` | 未执行 `deploy/init.sql` | 先建自定义类型与表 |
| 页面白屏、`/assets/*` 404 | nginx 没托管静态资源 | 检查 `location /assets/` 与 `root` 路径 |
| `npm run build` 卡在 "What do you want to create?" | 走了平台流水线脚本 | 改用 `npm run build:prod` |
| 容器内可访问、外部不可访问 | `SERVER_HOST` 仍是 localhost | 设为 `0.0.0.0` |
