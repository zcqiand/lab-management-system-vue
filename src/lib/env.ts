// 集中读取 import.meta.env.VITE_* 配置 + 默认值（lab-management-system-vue）。
//
// ADR-0014 — 完全镜像 saas-identity-platform-nextjs：
//   后端塌缩到单 URL + 显示标签。删除 4 槽位 backendBaseUrls +
//   defaultBackend。saas-base-url 保留（lab → saas SSO 跳板仍需独立 env）。
//
// ADR-0012 v0.3.0：删除 enableMsw（MSW Service Worker 模式已删除）。
//
// 规则：
//   - 所有值都有默认值（dev 离线也能跑）
//   - VITE_API_BASE_URL 默认 http://localhost:5201（真 nextjs；2026-09-17 msw 剔除后）
//   - 单元测试可通过 vitest 的 import.meta.env stub 注入

export const env = {
  devPort: Number(readEnv("VITE_DEV_PORT", "5203")) || 5203,

  // === 后端（ADR-0014：单 URL；msw 剔除后默认真 nextjs）===
  apiBaseUrl: readEnv("VITE_API_BASE_URL", "http://localhost:5201"),
  apiMode: readEnv("VITE_API_MODE", "nextjs"),

  // === saas（SSO 跳板仍需独立 env）===
  saasBaseUrl: readEnv("VITE_SAAS_BASE_URL", "http://localhost:5101"),
} as const;

function readEnv(key: string, fallback: string): string {
  try {
    const v = (import.meta.env as Record<string, string | undefined>)[key];
    return typeof v === "string" && v.length > 0 ? v : fallback;
  } catch {
    return fallback;
  }
}
