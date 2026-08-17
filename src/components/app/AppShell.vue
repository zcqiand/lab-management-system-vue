<script setup lang="ts">
// AppShell — 业务页统一骨架（sidebar + 顶栏 BackendSwitcher + 内容区）。
// Sprint 1 只装配仪表盘；Sprint 2 Batch 1 加 M04 基础数据 4 码表。
import { computed } from "vue";
import {
  Archive,
  ClipboardCheck,
  ClipboardList,
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  ScrollText,
  TestTube2,
  Wrench,
} from "lucide-vue-next";
import SidebarNav, { type NavItem } from "@/components/app/SidebarNav.vue";
import BackendSwitcher from "@/components/app/BackendSwitcher.vue";
import { useAuthStore, logout as authLogout } from "@/state/auth";

const auth = useAuthStore();

// Sprint 2 Batch 1+2A+2B-1：仪表盘 + M04 4 码表 + M02.F01/M06.F07/F08 3 码表式页 + M03 流程线 3 页。
// 后续 batch（M05 汇总 / M03 数据录入 / M03 报告 4 阶段）随对应批次落地。
const NAV: NavItem[] = [
  { label: "仪表盘", path: "/", icon: "dashboard" },
  { label: "型号维护", path: "/models", icon: "models" },
  { label: "规格维护", path: "/specifications", icon: "specs" },
  { label: "等级维护", path: "/grades", icon: "grades" },
  { label: "牌号维护", path: "/brands", icon: "brands" },
  { label: "合同管理", path: "/contracts", icon: "contracts" },
  { label: "报告名称维护", path: "/report-names", icon: "report-names" },
  { label: "参数界面维护", path: "/param-interfaces", icon: "param-interfaces" },
  { label: "接样管理", path: "/receipts", icon: "receipts" },
  { label: "任务分配", path: "/task-assignment", icon: "task-assignment" },
  { label: "数据录入", path: "/data-entry", icon: "data-entry" },
  { label: "报告审核", path: "/report-review", icon: "report-review" },
  { label: "报告批准", path: "/report-approve", icon: "report-approve" },
  { label: "报告发放", path: "/report-issue", icon: "report-issue" },
  { label: "报告归档", path: "/report-archive", icon: "report-archive" },
];

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
        <template #models><Database class="size-4" /></template>
        <template #specs><Database class="size-4" /></template>
        <template #grades><Database class="size-4" /></template>
        <template #brands><Database class="size-4" /></template>
        <template #contracts><ClipboardList class="size-4" /></template>
        <template #report-names><ScrollText class="size-4" /></template>
        <template #param-interfaces><Wrench class="size-4" /></template>
        <template #receipts><FlaskConical class="size-4" /></template>
        <template #task-assignment><ClipboardList class="size-4" /></template>
        <template #data-entry><TestTube2 class="size-4" /></template>
        <template #report-review><ClipboardCheck class="size-4" /></template>
        <template #report-approve><ClipboardCheck class="size-4" /></template>
        <template #report-issue><FileText class="size-4" /></template>
        <template #report-archive><Archive class="size-4" /></template>
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
