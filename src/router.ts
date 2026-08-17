import { createRouter, createWebHistory } from "vue-router";
import AppShell from "@/components/app/AppShell.vue";
import EmptyState from "@/components/app/EmptyState.vue";

// 路由入口（Sprint 2 Batch 1 增 M04 4 码表）。
//   /login, /select-tenant     公共页（不带 AppShell）
//   /                          AppShell + 守卫业务页（含 dashboard + M04 4 码表）
//   *                          兜底 404
// 守卫：DashboardPage 内 useRequireAuth（M01.F04.I03）— idle 挂起、
// anonymous → /login、awaiting_tenant → /select-tenant、缺权 → 拦截。

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", component: () => import("@/pages/LoginPage.vue") },
    { path: "/select-tenant", component: () => import("@/pages/SelectTenantPage.vue") },
    {
      path: "/",
      component: AppShell,
      children: [
        { path: "", name: "dashboard", component: () => import("@/pages/DashboardPage.vue") },
        // M04 基础数据 4 码表（Sprint 2 Batch 1 落地）
        { path: "models", name: "models", component: () => import("@/pages/ModelsPage.vue") },
        {
          path: "specifications",
          name: "specifications",
          component: () => import("@/pages/SpecificationsPage.vue"),
        },
        { path: "grades", name: "grades", component: () => import("@/pages/GradesPage.vue") },
        { path: "brands", name: "brands", component: () => import("@/pages/BrandsPage.vue") },
        // Sprint 2 Batch 2A：合同 / 报告名称 / 参数界面（码表式页）
        {
          path: "contracts",
          name: "contracts",
          component: () => import("@/pages/ContractsPage.vue"),
        },
        {
          path: "report-names",
          name: "report-names",
          component: () => import("@/pages/ReportNamesPage.vue"),
        },
        {
          path: "param-interfaces",
          name: "param-interfaces",
          component: () => import("@/pages/ParamInterfacesPage.vue"),
        },
        // Sprint 2 Batch 2B-1：流程线 3 页（接样/详情/任务分配）
        {
          path: "receipts",
          name: "receipts",
          component: () => import("@/pages/ReceiptsPage.vue"),
        },
        {
          path: "receipts/:id",
          name: "receipt-detail",
          component: () => import("@/pages/ReceiptDetailPage.vue"),
        },
        {
          path: "task-assignment",
          name: "task-assignment",
          component: () => import("@/pages/TaskAssignmentPage.vue"),
        },
      ],
    },
    {
      path: "/:pathMatch(.*)*",
      component: EmptyState,
      props: { title: "404", description: "页面不存在" },
    },
  ],
});
