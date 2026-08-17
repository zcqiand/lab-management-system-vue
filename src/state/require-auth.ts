// 路由守卫 composable — M01.F04.I03（未登录/无权限拦截）。
//
// 规则（与 react 仓 require-auth.ts 镜像）：
//   - idle / anonymous → 重定向 /login（带 from 回跳参数）
//   - awaiting_tenant → 重定向 /select-tenant（先选租户再进业务页）
//   - authenticated + requiredPermissions 缺权 → 拦在 /403

import { watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/state/auth";

export interface RequireAuthOptions {
  /** 该路由要求的 permission 列表（空数组 = 只要登录） */
  permissions?: string[];
}

export function useRequireAuth(options: RequireAuthOptions = {}): {
  allowed: boolean;
  checking: boolean;
} {
  const auth = useAuthStore();
  const router = useRouter();
  const route = useRoute();
  const required = options.permissions ?? [];

  const enforce = (): void => {
    const s = auth.authState;
    if (s.kind === "idle") return; // hydrate 中，先不动
    if (s.kind === "anonymous") {
      void router.replace(`/login?from=${encodeURIComponent(route.path)}`);
      return;
    }
    if (s.kind === "awaiting_tenant") {
      void router.replace("/select-tenant");
      return;
    }
    const missing = required.filter((p) => !s.value.permissions.includes(p));
    if (missing.length > 0) {
      void router.replace("/403");
    }
  };

  watch(
    () => auth.authState.kind,
    () => enforce(),
    { immediate: true },
  );

  const s = auth.authState;
  if (s.kind === "authenticated") {
    const allowed = required.every((p) => s.value.permissions.includes(p));
    return { allowed, checking: false };
  }
  return { allowed: false, checking: s.kind === "idle" };
}
