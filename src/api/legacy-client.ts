// lab-management-system-vue/src/api/legacy-client.ts — Sprint 2 Batch 1。
//
// nextjs/src/api/legacy-client.ts 的镜像（Sprint 2 Batch 1 — 基础数据 4 码表）。
// 与 react 仓 legacy-client.ts 的差异（镜像改造点）：
//   - 不创建独立 axios 实例（react 的 apiClient 是 module-level axios.create）；
//     vue 仓的 http-client.ts 已经在全局 axios 上装了拦截器（baseUrl + Bearer），
//     features 层直接 import 'axios' 用全局即可，避免双实例撞拦截器
//   - 不暴露 unauthorizedHandler（react 仓 auth FSM 401 桥接；vue 仓 auth.ts pinia
//     store 监听 token 失效走自己的清 token 路径，不需要 legacy-client 桥接）
// 保留：API_ROUTES 路由字面量（与 nextjs 仓逐条一致，1:1 镜像）。
//
// 接口契约：本文件 src/api/legacy-client.ts 是 features 层（如
// CategoryDictList.vue）调老式 /api/catalog/* 等路由的入口；新代码
// 优先走 orval 生成的 src/api/endpoints/endpoints.ts。

/**
 * REF 旧路由 → lab-msw OpenAPI v2 路由。键以 REF 源码出现过的字面量为准。
 * 值带 `/api` 前缀 —— shared/openapi.yaml 与 msw handlers（BASE="/api"）的
 * 真实路径形态。与 nextjs 仓 legacy-client 逐条一致（镜像不改动）。
 */
export const API_ROUTES = {
  "/audit-logs": "/api/audit-logs",
  "/auth/login": "/api/auth/login",
  "/auth/oauth/callback": "/api/auth/sso/callback",
  "/auth/permissions": "/api/auth/permissions",
  "/auth/menus": "/api/auth/menus",
  "/contracts": "/api/contracts",
  "/inspection-calculation-rules": "/api/calculation-rules",
  "/inspection-objects": "/api/inspection/objects",
  "/inspection-parameters": "/api/inspection/parameters",
  "/inspection-parameter-param-interfaces": "/api/inspection-param-interfaces/links",
  "/inspection-report-name-parameters": "/api/report-names/links/parameter",
  "/inspection-report-name-standards": "/api/report-names/links/standard",
  "/inspection-standard-parameters": "/api/inspection/links/standard-parameter",
  "/inspection-standards": "/api/inspection/standards",
  "/inspection-technical-requirements": "/api/technical-requirements",
  "/inspection-param-interfaces": "/api/inspection-param-interfaces",
  "/receipts": "/api/receipts",
  "/receipts/flow": "/api/receipts/flow",
  "/report-names": "/api/report-names",
  "/samples": "/api/samples",
  "/standard-parameters": "/api/inspection/links/standard-parameter",
  "/summary": "/api/summary",
  "/test-records": "/api/test-records",
  // —— SampleManagerModal 四码表 + ReportPreviewModal 机构信息 ——
  // msw 暂无 /api/org-info handler：组件 catch 兜底为 null（REF 同行为）。
  "/models": "/api/catalog/models",
  "/specifications": "/api/catalog/specs",
  "/grades": "/api/catalog/grades",
  "/brands": "/api/catalog/brands",
  "/org-info": "/api/org-info",
  // —— M06 检测能力 10 组件 ——
  // 4 主表 CRUD + 4 类 junction link。msw dictCrud 裸数组 → {items} 由
  // tests/helpers/seed.ts installShapeAdapters 包（同 nextjs 仓模式）。
  "/inspection-specialties": "/api/inspection/specialties",
  "/inspection-specialty-objects": "/api/inspection/links/specialty-object",
  "/inspection-object-standards": "/api/inspection/links/object-standard",
  "/inspection-object-parameters": "/api/inspection/links/object-parameter",
  "/inspection-object-report-names": "/api/report-names/links/object",
} as const;

export type ApiRouteKey = keyof typeof API_ROUTES;