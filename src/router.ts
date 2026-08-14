import { createRouter, createWebHistory } from "vue-router";

// v0.1.0 scaffold: 单 home 占位路由。
// 业务路由（M01..M06）后续按 /tree-change 提案加进 function-tree.md，再添路由。
const HomePage = {
  template: `
    <main class="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-semibold">lab-management-system-vue</h1>
        <p class="text-muted-foreground text-sm">
          v0.1.0 scaffold · waiting for first /req
        </p>
        <p class="text-xs text-muted-foreground/60">
          contract: ../lab-management-system-shared/generated/openapi/openapi.yaml
        </p>
      </div>
    </main>
  `,
};

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: HomePage },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});
