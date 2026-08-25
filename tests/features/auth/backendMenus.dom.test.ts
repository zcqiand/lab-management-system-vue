// M01.F04.I01 fnTest — useBackendMenus 动态菜单下发（GET /api/auth/menus）。
//
// 2026-08-25 起（ADR-0009）菜单数据源从 saas /api/saas/me/menus 切到 lab
// 后端 /api/auth/menus（orval authGetMenus；springboot 侧 saas 快照缓存 →
// demo 兜底）。镜像 react backend-menus.dom.test.tsx 三条链路：
//   1. 拉取成功 → 契约 MenuNode 适配为本地渲染树 → AppShell 平铺渲染
//   2. 请求失败 → data=null，AppShell 回退静态 FALLBACK_NAV
//   3. hook 确实走 /api/auth/menus 端点（防回退到旧 saas 路径）
// axios 在 orval 生成层被 vi.mock 拦截（appShellLogout.dom.test 同款队列模式）。

import { describe, beforeEach, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { createRouter, createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia, getActivePinia } from "pinia";
import AppShell from "@/components/app/AppShell.vue";
import { __testReset } from "@/state/auth";

// -- axios mock：可编程响应队列 ----------------------------------------------------

type MockResponse = { status: number; data: unknown };
const queue: MockResponse[] = [];
const calls: { method: string; url: string }[] = [];

vi.mock("axios", () => ({
  default: {
    isAxiosError: (e: unknown) => e instanceof Error && "response" in (e as object),
    get: async (url: string) => {
      calls.push({ method: "GET", url });
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    post: async () => {
      throw new Error("menus 测试不应触达 POST");
    },
    create: () => {
      throw new Error("menus 测试不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

import { useBackendMenus, type MenuNode } from "@/composables/use-backend-menus";

// -- fixtures：契约形状（shared tsp MenuNode{id,label,path?,icon?,children?}）---

const CONTRACT_MENUS = [
  {
    id: "overview",
    label: "总览",
    icon: "LayoutDashboard",
    children: [
      // 「独有菜单X/Y」是本测试独有标签（FALLBACK_NAV 里没有），
      // 用于区分「后端树渲染」与「静态回退渲染」。
      { id: "dashboard", label: "独有菜单X", path: "/dashboard", icon: "Gauge" },
      { id: "reports", label: "独有菜单Y", path: "/report-review" },
    ],
  },
];

/** 挂 AppShell（真 router + 已激活 pinia）。菜单 hook 在 onMounted 拉取。 */
async function mountShell() {
  const pinia = getActivePinia()!;
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/",
        component: AppShell,
        children: [{ path: "", component: { template: '<div data-testid="home">业务页</div>' } }],
      },
      { path: "/login", component: { template: '<div data-testid="login-page">login</div>' } },
    ],
  });
  router.push("/");
  await router.isReady();
  const wrapper = mount(AppShell, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return wrapper;
}

beforeEach(() => {
  queue.length = 0;
  calls.length = 0;
  const pinia = createPinia();
  setActivePinia(pinia);
  __testReset();
  localStorage.clear();
});

describe("M01.F04.I01 useBackendMenus", () => {
  fnTest(["M01.F04.I01"], "成功：/api/auth/menus 契约树 → AppShell 平铺渲染叶子菜单", async () => {
    queue.push({ status: 200, data: CONTRACT_MENUS });
    const wrapper = await mountShell();

    // 平铺渲染：group「总览」不出现，叶子「独有菜单X/Y」出现
    expect(wrapper.text()).toContain("独有菜单X");
    expect(wrapper.text()).toContain("独有菜单Y");
    // 端点正确（防回退到旧 saas 路径）
    expect(calls).toContainEqual({ method: "GET", url: "/api/auth/menus" });
    expect(calls.some((c) => c.url.includes("/api/saas/"))).toBe(false);
  });

  fnTest(["M01.F04.I01"], "失败：data=null，AppShell 回退静态 FALLBACK_NAV", async () => {
    queue.push({ status: 500, data: { message: "boom" } });
    const wrapper = await mountShell();

    // FALLBACK_NAV 首项是「型号维护」（静态树；后端树里没有这项）
    expect(wrapper.text()).toContain("型号维护");
    // 后端树的叶子不应出现（证明不是适配后的数据）
    expect(wrapper.text()).not.toContain("独有菜单X");
  });
});
