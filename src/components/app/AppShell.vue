<script setup lang="ts">
// @entry M01.F05.I04
// AppShell — 业务页统一骨架（sidebar + 顶栏 BackendSwitcher + 内容区）。
// Sprint 1 只装配仪表盘；Sprint 2 Batch 1 加 M04 基础数据 4 码表。
// M01.F05.I04 登出：侧栏底部「退出登录」按钮（镜像 react app-shell.tsx header
// 登出按钮），logout() 清 token 后 replace /login（守卫只在 DashboardPage，
// 这里显式跳转保证任意页面登出都回登录页）。
//
// 菜单数据源（2026-08-25 起，ADR-0009）：useBackendMenus() 拉 lab 后端
// /api/auth/menus（orval authGetMenus；springboot 侧 saas 快照缓存 → demo
// 兜底）；拉取失败回退静态 NAV。
import { computed, type Component } from "vue";
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

// 静态 fallback（saas 拉失败或加载中时使用，与 saas 菜单 1:1 对齐）。
const FALLBACK_NAV: NavItem[] = [
  { label: "仪表盘", path: "/", icon: "LayoutDashboard" },
  { label: "型号维护", path: "/models", icon: "Database" },
  { label: "规格维护", path: "/specifications", icon: "Database" },
  { label: "等级维护", path: "/grades", icon: "Database" },
  { label: "牌号维护", path: "/brands", icon: "Database" },
  { label: "合同管理", path: "/contracts", icon: "ClipboardList" },
  { label: "报告名称维护", path: "/report-names", icon: "ScrollText" },
  { label: "参数界面维护", path: "/param-interfaces", icon: "Wrench" },
  { label: "接样管理", path: "/receipts", icon: "FlaskConical" },
  { label: "任务分配", path: "/task-assignment", icon: "ClipboardList" },
  { label: "数据录入", path: "/data-entry", icon: "TestTube2" },
  { label: "报告审核", path: "/report-review", icon: "ClipboardCheck" },
  { label: "报告批准", path: "/report-approve", icon: "ClipboardCheck" },
  { label: "报告发放", path: "/report-issue", icon: "FileText" },
  { label: "报告归档", path: "/report-archive", icon: "Archive" },
  { label: "检测专项", path: "/inspection-specialties", icon: "Beaker" },
  { label: "检测标准", path: "/inspection-standards", icon: "ScrollText" },
  { label: "检测参数", path: "/inspection-parameters", icon: "Activity" },
  { label: "检测项目", path: "/inspection-objects", icon: "PackageSearch" },
  { label: "技术要求", path: "/inspection-technical-requirements", icon: "Shield" },
  { label: "计算方法", path: "/inspection-calculation-methods", icon: "Settings" },
  { label: "报告汇总", path: "/summary", icon: "ListChecks" },
];

// 拉后端菜单；树 → 平铺 NavItem[]（保留 group 节点作废：vue 仓 sidebar 是
// 平铺布局，不渲染分组头；nextjs/react 的分组树 UI 不镜像）。
const { data: backendMenus } = useBackendMenus();
function flattenToNavItems(tree: MenuNode[] | null): NavItem[] {
  if (!tree) return [];
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
  if (tree && tree.length > 0) return flattenToNavItems(tree);
  return FALLBACK_NAV;
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
    <aside class="border-r bg-sidebar flex w-60 flex-col">
      <div class="flex items-center gap-2 border-b px-4 py-4">
        <FlaskConical class="text-primary size-5" />
        <span class="font-semibold">实验室管理系统</span>
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
