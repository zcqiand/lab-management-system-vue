import { defineConfig } from "orval";

// orval config (in vue 仓) — generates TS api-client from shared's OpenAPI.yaml.
//
// Source contract lives in shared 仓 at ../lab-management-system-shared/generated/openapi/openapi.yaml.
// This file is owned by vue 仓; other frontends (react / nextjs) have their own copy.
// NOTE: vue 仓用 client: "vue-query"（不是 "react-query"），产出 @tanstack/vue-query 的 useQuery 等 hooks + 具名函数。
export default defineConfig({
  lab: {
    input: {
      target: "../lab-management-system-shared/generated/openapi/openapi.yaml",
      // frontend-bind-meta 是 shared 仓的 emit-only 锚点（把 8 个契约 schema 拉进
      // components.schemas），后端不实现该端点 — exclude 掉，避免生成一个调用必
      // 404 的 stub。8 个契约类型仍写进 endpoints.schemas.ts，入口在 src/api/contracts.ts。
      // 注意：filters 必须在 input:{target,filters} 对象形式里，写在顶层静默无效（v7.21 实测）。
      filters: {
        mode: "exclude",
        tags: ["frontend-bind-meta"],
      },
    },
    output: {
      mode: "split",
      target: "./src/api/endpoints/endpoints.ts",
      client: "vue-query",
      override: {
        useDates: false,
        query: {
          useQuery: true,
          useInfinite: false,
          signal: true,
        },
      },
    },
  },
});
