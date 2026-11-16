# 上海停车情报站 · 自部署镜像
# 三个阶段：builder（构建） / app（Node 服务） / nginx（前端静态资源 + 反向代理）

FROM node:22-bookworm AS builder
WORKDIR /app
ENV NODE_ENV=production

# 先装依赖（.npmrc 指向 npmmirror 公共镜像，无需任何私钥）
COPY . .
RUN npm ci --ignore-scripts --no-audit --no-fund

# 生产构建：前端 Vite + 后端 SWC
# 注意：不要用 npm run build（scripts/build.sh 会执行平台插件初始化，在平台外会交互卡住）
RUN npm run build:prod

# @Render('index') 从 views 根目录找 index.html，构建产物实际在 dist/client/client/ 下
RUN cp -f dist/client/client/index.html dist/client/index.html


FROM node:22-bookworm-slim AS app
WORKDIR /app
ENV NODE_ENV=production \
    SERVER_HOST=0.0.0.0 \
    SERVER_PORT=3000

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["node", "dist/server/main.js"]


FROM nginx:1.27-alpine AS nginx
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/client/assets /usr/share/nginx/html/assets
COPY --from=builder /app/dist/client/favicon.svg /usr/share/nginx/html/favicon.svg
EXPOSE 80
