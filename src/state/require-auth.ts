// @entry M01.F04.I03
// 路由守卫 composable — M01.F04.I03（未登录/无权限拦截）。
//
// 规则（与 react 仓 require-auth.ts 镜像）：
//   - idle / anonymous → 重定向 /login（带 from 回跳参数）
//   - awaiting_tenant → 重定向 /login（选租户页已移除，M00.F02 保持规划）
//   - authenticated + requiredPermissions 缺权 → 拦在 /403

import { computed, watch, type ComputedRef } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useAuthStore } from "@/state/auth";

export interface RequireAuthOptions {
  /** 该路由要求的 permission 列表（空数组 = 只要登录） */
  permissions?: string[];
}

export function useRequireAuth(options: RequireAuthOptions = {}): {
  allowed: ComputedRef<boolean>;
  checking: ComputedRef<boolean>;
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
      // 2026-08-18 认证收口：选租户页已随登录表单一并移除（对齐 nextjs，
      // M00.F02 保持规划）。多租户会话暂时拦在 /login（由 saas 侧预选租户）。
      void router.replace("/login");
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

  // 2026-09-23 冷启动白屏根因修复：此函数曾在 setup 时一次性算死 allowed/checking
  // （普通布尔非响应式）——hydrateAuth 的 /me 晚于 AppShell setup 返回时（冷
  // profile / 慢网），authState idle→authenticated 推进了 store，但模板里的
  // checking 永远停在 true → 登录后白屏卡「检查登录态」。改成 computed 随
  // store 响应式翻转；react 仓同位是 hook state 天然响应式，此处补齐镜像语义。
  const allowed = computed(() => {
    const s = auth.authState;
    return s.kind === "authenticated" && required.every((p) => s.value.permissions.includes(p));
  });
  const checking = computed(() => auth.authState.kind === "idle");
  return { allowed, checking };
}
