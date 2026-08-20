// useSaasMenus —— 镜像 lab-nextjs / lab-react 同名 hook。
//
// dev 期浏览器请求 /api/saas/me/menus 被 Vite proxy 转发到 saas:3000/api/v1/me/menus
// （同源避开 CORS preflight，详见 vite.config.ts server.proxy）。saas 返回
// `{ [appCode]: MenuNode[] }` map（saas-msw handlers-extra.ts:215 一致），这里
// 按 SAAS_APP_CODE 取数组。失败时 data=null，消费方应回退到静态 FALLBACK_NAV。

import { onMounted, onUnmounted, ref } from "vue";

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

const SAAS_APP_CODE = "lab-management";

export function useSaasMenus(): {
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
    void fetch(`/api/saas/me/menus?appCode=${encodeURIComponent(SAAS_APP_CODE)}`, {
      cache: "no-store",
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: unknown) => {
        if (cancelled) return;
        // saas /api/v1/me/menus 形状：`{ [appCode]: MenuNode[] }` map；
        // 取本仓 appCode 对应的数组。兼容旧的扁平数组。
        if (d && typeof d === "object" && !Array.isArray(d)) {
          const map = d as Record<string, MenuNode[]>;
          data.value = map[SAAS_APP_CODE] ?? [];
        } else if (Array.isArray(d)) {
          data.value = d as MenuNode[];
        } else {
          data.value = [];
        }
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
