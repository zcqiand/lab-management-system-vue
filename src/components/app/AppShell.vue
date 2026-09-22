<script setup lang="ts">
// @entry M01.F05.I04
// AppShell — 业务页统一骨架。2026-09-23 深色侧栏重设计，镜像 react app-shell.tsx：
// 深色分组侧栏 SidebarNav（menus 树直传，flattenToNavItems 删除）、白底 h-14
// 头部（应用名 + 用户 + auth 态徽标 + 退出登录）、根容器 bg-slate-50。
// BackendBadge 按 react 同构放侧栏 footerExtras。
//
// 菜单数据源（ADR-0009）：useBackendMenus() 拉 lab 后端 /api/auth/menus；
// miss（503 MENUS_UNAVAILABLE）上抛错误态，不静默回退静态树。
import { computed, onErrorCaptured, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { LogOut } from "lucide-vue-next";
import SidebarNav from "@/components/app/SidebarNav.vue";
import BackendBadge from "@/components/app/BackendBadge.vue";
import PageLoading from "@/components/app/PageLoading.vue";
import Button from "@/components/ui/Button.vue";
import { useAuthStore, logout as authLogout } from "@/state/auth";
import { useRequireAuth } from "@/state/require-auth";
import { APP_CODE, APP_NAME, useBackendMenus } from "@/composables/use-backend-menus";

const auth = useAuthStore();
const router = useRouter();
// M01.F04.I03 守卫提升到 AppShell：未登录访问任何业务子路由（receipts/contracts/...）
// 直接跳 /login，而不是停在 AppShell 渲染「菜单加载失败」错误态。
// 镜像 react 仓 app-shell.tsx §58 useRequireAuth()。
const { allowed, checking } = useRequireAuth();

// 拉后端菜单（2026-09-23 重设计：menus 树直传 SidebarNav，不再平铺）。
// 注意 hook 返回的是 getter 函数不是 ref —— 模板里直接当布尔用会恒 truthy，
// 必须在 computed 里显式调用（旧平铺版在 navItems computed 里调，同款坑）。
const { data: menusData, error: menuError, loading: menusIsLoading } = useBackendMenus();
const backendMenus = computed(() => menusData());
const menusLoading = computed(() => menusIsLoading());

// 菜单加载错误（demo 兜底删除后不再静默回退）。
const menuLoadError = ref<Error | null>(null);
// 捕获 useBackendMenus 拉取失败的抛错（hook 内通过 error ref 暴露）。
watch(menuError, (e) => {
  if (e) menuLoadError.value = e;
});
// 兜底：子组件 / 插件渲染抛错也接住，渲染错误态而非静默崩。
onErrorCaptured((err) => {
  menuLoadError.value = err instanceof Error ? err : new Error(String(err));
  return false;
});

const displayName = computed(() => {
  const s = auth.authState;
  if (s.kind === "authenticated" || s.kind === "awaiting_tenant") {
    return s.value.user.displayName ?? s.value.user.username;
  }
  return "";
});

// M01.F05.I04 登出：清 token → anonymous → replace /login
function onLogout(): void {
  void authLogout().finally(() => {
    router.replace("/login");
  });
}
</script>

<template>
  <!-- M01.F04.I03：useRequireAuth 守卫 — idle 挂起 / anonymous → /login。
       未登录访问 /receipts 等业务页时不让 AppShell 渲染半残 UI，
       直接由守卫跳 /login（带 from 回跳），与 react 仓 app-shell.tsx 同构。 -->
  <div v-if="checking" />
  <div v-else-if="!allowed" />
  <div v-else class="min-h-screen flex bg-slate-50">
    <aside
      v-if="menusLoading"
      class="w-64 shrink-0 border-r bg-white flex items-center justify-center"
      data-testid="appshell-menu-loading"
    >
      <span class="text-xs text-slate-500">菜单加载中…</span>
    </aside>
    <aside
      v-else-if="menuLoadError"
      class="w-64 shrink-0 border-r bg-white flex flex-col items-center justify-center p-6 text-center"
      data-testid="appshell-menu-error"
    >
      <h2 class="text-rose-700 mb-2 text-base font-semibold">菜单加载失败</h2>
      <p class="text-slate-600 mb-4 break-all text-xs" data-testid="appshell-menu-error-msg">
        {{ menuLoadError.message }}
      </p>
      <p class="text-xs text-slate-500">
        后端 /api/auth/menus miss（503 MENUS_UNAVAILABLE）；demo 兜底已删除，请重登或联系管理员。
      </p>
    </aside>
    <SidebarNav
      v-else
      :menus="backendMenus ?? []"
      :app-code="APP_CODE"
      :app-name="APP_NAME"
      :version="`lab-management-system-vue · appCode=lab-management`"
    >
      <template #footerExtras><BackendBadge /></template>
    </SidebarNav>
    <main class="flex min-w-0 flex-1 flex-col">
      <header class="border-b flex h-14 items-center gap-4 bg-white px-6">
        <h1 data-testid="appshell-app-name" class="text-base font-semibold">{{ APP_NAME }}</h1>
        <div class="ml-auto flex items-center gap-3 text-xs text-slate-500">
          <span v-if="displayName" class="font-mono">
            用户=<span class="text-slate-900 font-medium">{{ displayName }}</span>
          </span>
          <span data-testid="appshell-auth-state">{{ auth.authState.kind }}</span>
          <Button
            v-if="auth.authState.kind === 'authenticated'"
            variant="outline"
            size="sm"
            data-fn="M01.F05.I04"
            data-testid="logout-button"
            @click="onLogout"
          >
            <LogOut class="mr-1 size-4" />
            退出登录
          </Button>
        </div>
      </header>
      <section class="flex-1 overflow-auto p-6">
        <!-- B6 加载态：懒加载路由 chunk 解析期间也显示整页加载态（页面内数据门控见各页面） -->
        <Suspense>
          <router-view />
          <template #fallback>
            <PageLoading />
          </template>
        </Suspense>
      </section>
    </main>
  </div>
</template>
