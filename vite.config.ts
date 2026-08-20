import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { resolve } from "node:path";

// Vite 在 import.meta.env 注入前的早期 phase 读 process.env。
// VITE_DEV_PORT 走 .env.local（见 .env.example）；默认 5173。
const devPort = Number(process.env.VITE_DEV_PORT ?? "5173") || 5173;

// Vite proxy 解决 dev 期 CORS：lab 仓 (5174) 浏览器 fetch /api/saas/* 同源 →
// Vite dev server 转发到 saas (3000)，浏览器看不到 CORS preflight。
// 路径 rewrite：去掉 /saas 段，匹配 saas 真实 endpoint。
// lab-msw handlers 里的 /api/saas/* 已删除，避免与 proxy 双重响应。
const saasBaseUrl = process.env.SAAS_BASE_URL ?? process.env.VITE_SAAS_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  plugins: [vue(), tailwindcss(), tsconfigPaths()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
  server: {
    port: devPort,
    forwardConsole: false,
    proxy: {
      // 浏览器 → 同源 /api/saas/* → Vite dev server → saas 真实 /api/v1/*
      // 例 GET /api/saas/me/menus?appCode=lab-management
      //  → GET http://localhost:3000/api/v1/me/menus?appCode=lab-management
      "/api/saas": {
        target: saasBaseUrl,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/saas/, "/api/v1"),
      },
    },
  },
  optimizeDeps: {
    // msw v2 has unresolvable @mswjs/interceptors exports conditions for
    // ClientRequest in browser; exclude from pre-bundling so it loads at
    // runtime via esm rather than being bundled by esbuild.
    exclude: ["@lab/management-system-msw", "msw", "@mswjs/interceptors"],
  },
});