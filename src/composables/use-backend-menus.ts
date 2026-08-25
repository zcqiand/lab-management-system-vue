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
    path: node.path,
    icon: node.icon,
    // 契约无 type 字段：有子节点即 group，否则 page
    type: children.length > 0 ? "group" : "page",
    sortOrder: index + 1,
    children: children.map(adaptContractMenu),
  };
}
