<script setup lang="ts">
// @entry M01.F05.I04
// AppShell — 业务页统一骨架（sidebar + 顶栏 BackendSwitcher + 内容区）。
// Sprint 1 只装配仪表盘；Sprint 2 Batch 1 加 M04 基础数据 4 码表。
// M01.F05.I04 登出：侧栏底部「退出登录」按钮（镜像 react app-shell.tsx header
// 登出按钮），logout() 清 token 后 replace /login（守卫只在 DashboardPage，
// 这里显式跳转保证任意页面登出都回登录页）。
//
// 菜单数据源（2026-08-25 起，ADR-0009）：useBackendMenus() 拉 lab 后端
// /api/auth/menus（orval authGetMenus；2026-08-27 起 miss 503 上抛错误，
// AppShell 渲染错误态；不再静默回退静态 FALLBACK_NAV——demo 兜底删除后，
// 前端兜底同样让真问题隐形，与家族语义一致）。
import { computed, onErrorCaptured, ref, watch, type Component } from "vue";
import { useRouter } from "vue-router";
import {
  Activity,
  Archive,
  Beaker,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  LogOut,
  PackageSearch,
  ScrollText,
  Settings,
  Shield,
  TestTube2,
  Wrench,
} from "lucide-vue-next";
import SidebarNav, { type NavItem } from "@/components/app/SidebarNav.vue";
import BackendBadge from "@/components/app/BackendBadge.vue";
import { useAuthStore, logout as authLogout } from "@/state/auth";
import { useBackendMenus, type MenuNode } from "@/composables/use-backend-menus";

const auth = useAuthStore();
const router = useRouter();

// 图标字符串 → lucide 组件映射。saas 菜单 icon 字段是 PascalCase 字符串名，
// SidebarNav.vue 接受 iconMap prop 后用 <component :is> 动态渲染。
const ICON_MAP: Record<string, Component> = {
  Activity,
  Beaker,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  PackageSearch,
  ScrollText,
  Settings,
  Shield,
  TestTube2,
  Wrench,
};

// 拉后端菜单；树 → 平铺 NavItem[]（保留 group 节点作废：vue 仓 sidebar 是
// 平铺布局，不渲染分组头；nextjs/react 的分组树 UI 不镜像）。
const { data: backendMenus, error: menuError } = useBackendMenus();
function flattenToNavItems(tree: MenuNode[]): NavItem[] {
  const out: NavItem[] = [];
  for (const g of tree) {
    for (const leaf of g.children) {
      if (!leaf.path) continue;
      out.push({
        label: leaf.name,
        path: leaf.path === "" ? "/" : leaf.path,
        icon: leaf.icon,
      });
    }
  }
  return out;
}
const navItems = computed<NavItem[]>(() => {
  const tree = backendMenus();
  return tree ? flattenToNavItems(tree) : [];
});

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
const tenantName = computed(() => {
  const s = auth.authState;
  return s.kind === "authenticated" ? s.value.tenant.name : "";
});

function onAction(action: string): void {
  if (action === "logout") {
    // M01.F05.I04：logout 清 token/permissions → 落 anonymous → 回登录页
    void authLogout().finally(() => {
      router.replace("/login");
    });
  }
}
</script>

<template>
  <div class="flex h-screen">
    <aside
      v-if="menuLoadError"
      class="border-r bg-sidebar flex w-60 flex-col"
      data-testid="appshell-menu-error-aside"
    >
      <div class="flex items-center gap-2 border-b px-4 py-4">
        <FlaskConical class="text-primary size-5" />
        <span class="font-semibold">建筑工程实验室管理系统</span>
      </div>
      <div class="flex flex-1 flex-col items-center justify-center p-6 text-center">
        <h2 class="text-rose-700 mb-2 font-semibold">菜单加载失败</h2>
        <p
          class="text-muted-foreground mb-4 break-all text-xs"
          data-testid="appshell-menu-error-msg"
        >
          {{ menuLoadError.message }}
        </p>
        <p class="text-muted-foreground text-xs">
          后端 /api/auth/menus miss（503 MENUS_UNAVAILABLE）；demo 兜底已删除，请重登或联系管理员。
        </p>
      </div>
      <div class="mt-auto border-t p-3">
        <SidebarNav
          :items="[{ label: '退出登录', action: 'logout', icon: 'logout', dataFn: 'M01.F05.I04' }]"
          :icon-map="ICON_MAP"
          @action="onAction"
        />
      </div>
    </aside>
    <aside v-else class="border-r bg-sidebar flex w-60 flex-col">
      <div class="flex items-center gap-2 border-b px-4 py-4">
        <FlaskConical class="text-primary size-5" />
        <span class="font-semibold">建筑工程实验室管理系统</span>
      </div>
      <SidebarNav :items="navItems" :icon-map="ICON_MAP" />
      <div class="mt-auto border-t p-3">
        <SidebarNav
          :items="[{ label: '退出登录', action: 'logout', icon: 'logout', dataFn: 'M01.F05.I04' }]"
          :icon-map="ICON_MAP"
          @action="onAction"
        />
      </div>
    </aside>
    <div class="flex flex-1 flex-col">
      <header class="border-b flex h-14 items-center justify-between px-4">
        <div class="text-muted-foreground text-sm">
          {{ tenantName ? `${tenantName} · ${displayName}` : displayName }}
        </div>
        <BackendBadge />
      </header>
      <main class="flex-1 overflow-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>