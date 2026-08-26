// @entry M01.F04.I01
// useBackendMenus —— 镜像 lab-react sidebar-nav.tsx useBackendMenus（ADR-0009）。
//
// 拉后端 `GET /api/auth/menus`（orval authGetMenus，axios 拦截器自动注
// baseURL + Bearer lab JWT）。后端数据链（lab-springboot v0.1.7 起）：
// SSO/refresh 时缓存的 saas 菜单快照 → miss 回退 demo 菜单，端点永不 5xx。
//
// 契约 MenuNode{id,label,path?,icon?,children?} 在此适配成本地渲染 MenuNode
// （appId/code/type/sortOrder）。失败 data=null，消费方回退静态 FALLBACK_NAV。
// 取代 use-saas-menus.ts（前端直连 saas /api/saas/me/menus 旧链路）。
//
// path 归一化（2026-08-27）：两条数据链的 path 形态不一 ——
//   saas 快照：无前导斜杠（"models"）→ router-link 相对解析，深层路由下
//             会拼成 /receipts/receipts 这类错链
//   demo 兜底：旧 v0.3.x path（"/dashboard"、"/catalog/models"、
//             "/receipts?stage=task_assignment"）与本仓 router 不匹配
// normalizeMenuPath 统一收口：别名映射 → 去 query → 补斜杠。

import { onMounted, onUnmounted, ref } from "vue";
import { authGetMenus } from "@/api/endpoints/endpoints";
import type { MenuNode as ContractMenuNode } from "@/api/endpoints/endpoints.schemas";

export interface MenuNode {
  id: string;
  appId: string;
  parentId?: string;
  code: string;
  name: string;
  path?: string;
  icon?: string;
  type: "group" | "page" | "action";
  sortOrder: number;
  children: MenuNode[];
}

const APP_CODE = "lab-management";

export function useBackendMenus(): {
  data: () => MenuNode[] | null;
  loading: () => boolean;
  error: () => string | null;
} {
  const data = ref<MenuNode[] | null>(null);
  const loading = ref(true);
  const error = ref<string | null>(null);
  let cancelled = false;

  onMounted(() => {
    loading.value = true;
    authGetMenus()
      .then((resp) => {
        if (cancelled) return;
        data.value = resp.data.map(adaptContractMenu);
        loading.value = false;
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        error.value = err instanceof Error ? err.message : String(err);
        loading.value = false;
      });
  });

  onUnmounted(() => {
    cancelled = true;
  });

  return { data: () => data.value, loading: () => loading.value, error: () => error.value };
}

/** 契约 MenuNode（shared tsp：id/label/path?/icon?/children?）→ 本地渲染 MenuNode。 */
function adaptContractMenu(node: ContractMenuNode, index: number): MenuNode {
  const children = node.children ?? [];
  return {
    id: node.id,
    appId: APP_CODE,
    code: node.id,
    name: node.label,
    path: node.path !== undefined ? normalizeMenuPath(node.path) : undefined,
    icon: node.icon,
    // 契约无 type 字段：有子节点即 group，否则 page
    type: children.length > 0 ? "group" : "page",
    sortOrder: index + 1,
    children: children.map(adaptContractMenu),
  };
}

/** demo 兜底树旧 path → 本仓 router 真实路由的别名表（去 query 后精确匹配）。 */
const PATH_ALIASES: Record<string, string> = {
  // demo 树工作台 → 仪表盘（index 路由）
  "/dashboard": "/",
  // demo 树码表页挂在 /catalog/* 前缀下；本仓是平铺 /models 等
  "/catalog/models": "/models",
  "/catalog/specs": "/specifications",
  "/catalog/grades": "/grades",
  "/catalog/brands": "/brands",
  // demo 树试验过程用 /receipts?stage= 单页多态；本仓拆成独立路由
  "/receipts": "/receipts", // 无 query 时本就是真实路由（占位保持可读）
};
/** demo 树 ?stage= 查询参数 → 独立路由的别名（归一化时先去 query 再查）。 */
const STAGE_ALIASES: Record<string, string> = {
  task_assignment: "/task-assignment",
  data_entry: "/data-entry",
  review: "/report-review",
  approval: "/report-approve",
  issuance: "/report-issue",
  archived: "/report-archive",
};

/** path 归一化：别名映射（含 ?stage= query 形态）→ 补前导斜杠。
 *  输入已是本仓真实路由（saas 快照 "models"）时只补斜杠，直通。 */
export function normalizeMenuPath(path: string): string {
  // ?stage=xxx 形态：demo 兜底树的单页多态 → 独立路由别名
  const queryIdx = path.indexOf("?");
  if (queryIdx >= 0) {
    const base = path.slice(0, queryIdx);
    const query = new URLSearchParams(path.slice(queryIdx + 1));
    const stage = query.get("stage");
    if (base === "/receipts" && stage && STAGE_ALIASES[stage]) {
      return STAGE_ALIASES[stage];
    }
    // 未知 query 形态：去 query 走基路径继续归一化
    return normalizeMenuPath(base);
  }
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  return PATH_ALIASES[withSlash] ?? withSlash;
}
