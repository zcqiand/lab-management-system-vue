<script setup lang="ts">
// AppShell — 业务页统一骨架（sidebar + 顶栏 BackendSwitcher + 内容区）。
// Sprint 1 只装配；sidebar 菜单内容 Sprint 2 随 26 页镜像填充。
import { computed } from "vue";
import { FlaskConical, LayoutDashboard, LogOut } from "lucide-vue-next";
import SidebarNav, { type NavItem } from "@/components/app/SidebarNav.vue";
import BackendSwitcher from "@/components/app/BackendSwitcher.vue";
import { useAuthStore, logout as authLogout } from "@/state/auth";

const auth = useAuthStore();

// Sprint 1：只有仪表盘一项。菜单树数据源（GET /auth/menus）Sprint 2 接。
const NAV: NavItem[] = [{ label: "仪表盘", path: "/", icon: "dashboard" }];

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
  if (action === "logout") void authLogout();
}
</script>

<template>
  <div class="flex h-screen">
    <aside class="border-r bg-sidebar flex w-60 flex-col">
      <div class="flex items-center gap-2 border-b px-4 py-4">
        <FlaskConical class="text-primary size-5" />
        <span class="font-semibold">实验室管理系统</span>
      </div>
      <SidebarNav :items="NAV">
        <template #dashboard><LayoutDashboard class="size-4" /></template>
      </SidebarNav>
      <div class="mt-auto border-t p-3">
        <SidebarNav
          :items="[{ label: '退出登录', action: 'logout', icon: 'logout' }]"
          @action="onAction"
        >
          <template #logout><LogOut class="size-4" /></template>
        </SidebarNav>
      </div>
    </aside>
    <div class="flex flex-1 flex-col">
      <header class="border-b flex h-14 items-center justify-between px-4">
        <div class="text-muted-foreground text-sm">
          {{ tenantName ? `${tenantName} · ${displayName}` : displayName }}
        </div>
        <BackendSwitcher />
      </header>
      <main class="flex-1 overflow-auto p-6">
        <router-view />
      </main>
    </div>
  </div>
</template>
