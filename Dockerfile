# ===== lab-management-system-vue — Vite SPA production image =====
# Multi-stage: build with node:20-alpine, serve with nginx:alpine.
# 容器内监听 :80;VPS nginx 反代到 host 8010 (lab-vue.xiangru.uk)。
#
# 与 nextjs 姊妹仓差异:那边 SSR + Node runtime,这里静态 SPA + nginx:alpine。
# 参考 output/ecommerce-oms/frontend/Dockerfile (单 stage 简化版);
#       本仓改 multi-stage 缩 runtime 镜像 (nginx:alpine ~40MB)。

# ---------- Stage 1: builder ----------
FROM node:20-alpine AS builder
WORKDIR /app

# 硬约束:npm 依赖一律走 npmmirror (suite root CLAUDE.md §2)
RUN npm config set registry https://registry.npmmirror.com

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
# prebuild hook (gen:shared) 自动跑;需要 ../lab-management-system-shared 存在
# CI 通过 git clone ../lab-management-system-shared 提供;本地 docker build 用户自负责
RUN npm run build

# ---------- Stage 2: runtime ----------
FROM nginx:alpine AS runtime

# 复制 Vite 产物 + 自定义 SPA fallback nginx.conf
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# 健康检查 (nginx:alpine 自带 wget)
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1

CMD ["nginx", "-g", "daemon off;"]