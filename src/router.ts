import { createRouter, createWebHistory } from "vue-router";
import AppShell from "@/components/app/AppShell.vue";
import EmptyState from "@/components/app/EmptyState.vue";

// 路由入口（Sprint 1）。
//   /login, /select-tenant     公共页（不带 AppShell）
//   /                          AppShell + 守卫业务页（Sprint 1 只有仪表盘空壳）
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
      children: [{ path: "", name: "dashboard", component: () => import("@/pages/DashboardPage.vue") }],
    },
    {
      path: "/:pathMatch(.*)*",
      component: EmptyState,
      props: { title: "404", description: "页面不存在" },
    },
  ],
});
