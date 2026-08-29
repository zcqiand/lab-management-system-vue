# ===== lab-management-system-vue — Vite SPA production image =====
# Multi-stage: build with node:24-alpine, serve with nginx:alpine.
# 容器内监听 :80;VPS nginx 反代到 host 8010 (lab-vue.xiangru.uk)。
#
# 与 nextjs 姊妹仓差异:那边 SSR + Node runtime,这里静态 SPA + nginx:alpine。
# 参考 output/ecommerce-oms/frontend/Dockerfile (单 stage 简化版);
#       本仓改 multi-stage 缩 runtime 镜像 (nginx:alpine ~40MB)。

# ---------- Stage 1: builder ----------
FROM node:24-alpine AS builder
WORKDIR /app

# 硬约束:npm 依赖一律走 npmmirror (suite root CLAUDE.md §2)
RUN npm config set registry https://registry.npmmirror.com

# alpine 默认无 git / ca-certificates,装上以 clone sibling (gen:shared)
RUN apk add --no-cache git ca-certificates

# 拉 sibling 仓（gen:shared 需要；msw file: 依赖已移除 -- ADR-0012 运行时 import 清零）
RUN git clone --depth 1 https://github.com/zcqiand/lab-management-system-shared.git ../lab-management-system-shared

COPY package.json package-lock.json ./
# 用 npm install 不是 npm ci（历史遗留：曾引用 file:../lab-management-system-msw 导致
# lockfile 版本漂移；该依赖已移除，保留 npm install 行为不变）
# (file path 版本),旧 lockfile 锁了 0.1.0 → npm ci 严格不匹配。
# npm install 按 package.json + sibling 实际版本安装,自动重写 lockfile。
# --legacy-peer-deps 兼容某些宽松 peer 依赖。
RUN npm install --legacy-peer-deps --no-audit --no-fund

COPY . .
# VITE_* build-time 烘焙(2026-08-28 起 .env.production gitignored,Docker build
# context 里没有它):prod 值在此显式声明,语义与原 .env.production 完全一致。
# 跨仓约定:vue→aspnetcore :5000(react→springboot)。公开 URL 非 secret。
ENV VITE_API_BASE_URL=https://lab-aspnetcore.xiangru.uk
ENV VITE_SAAS_BASE_URL=https://saas-vue.xiangru.uk
ENV VITE_API_MODE=aspnetcore
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