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

/** 挂 AppShell（真 router + 已激活 pinia）。菜单 hook 在 onMounted 拉取。
 *  initial 默认 "/"；传深层路径用于暴露相对 path 解析 bug（见 saas 快照用例）。 */
async function mountShell(initial = "/") {
  const pinia = getActivePinia()!;
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/",
        component: AppShell,
        children: [
          { path: "", component: { template: '<div data-testid="home">业务页</div>' } },
          {
            path: "receipts/:id",
            component: { template: '<div data-testid="receipt-detail">详情</div>' },
          },
        ],
      },
      { path: "/login", component: { template: '<div data-testid="login-page">login</div>' } },
    ],
  });
  router.push(initial);
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

  // 2026-08-27 path 归一化：saas 快照 path 无前导斜杠（"models"），demo 兜底
  // 树 path 带斜杠（"/catalog/models"）。两条数据链都要归一化成 router 真实
  // 路由（"/models"），否则 router-link 相对路径跳转 + 选中态全失效。
  fnTest(["M01.F04.I01"], "saas 快照 path（无斜杠）归一化为绝对路由", async () => {
    queue.push({
      status: 200,
      data: [
        {
          id: "grp-biz",
          label: "实验过程管理",
          children: [
            { id: "m-receipts", label: "接样管理", path: "receipts" },
            { id: "m-task", label: "任务安排", path: "task-assignment" },
          ],
        },
      ],
    });
    // 挂在深层路由（/receipts/123）：相对 path "receipts" 在这里会被 router-link
    // 解析成 /receipts/receipts —— 归一化层必须在路由深度下依然产出绝对路径。
    const wrapper = await mountShell("/receipts/123");

    const links = wrapper.findAll("a").filter((a) => a.attributes("href"));
    const hrefs = links.map((a) => a.attributes("href"));
    expect(hrefs).toContain("/receipts");
    expect(hrefs).toContain("/task-assignment");
    // 不允许裸相对 path 漏出（"receipts" 无斜杠 → router-link 相对解析 bug）
    expect(hrefs).not.toContain("receipts");
    expect(hrefs).not.toContain("task-assignment");
    expect(hrefs).not.toContain("/receipts/receipts");
  });

  fnTest(["M01.F04.I01"], "demo 兜底旧 path 别名映射到真实路由", async () => {
    queue.push({
      status: 200,
      data: [
        {
          id: "menu-m03",
          label: "试验过程",
          children: [
            { id: "menu-receipts", label: "接样管理", path: "/receipts" },
            { id: "menu-task", label: "任务分配", path: "/receipts?stage=task_assignment" },
          ],
        },
        {
          id: "menu-m04",
          label: "基础数据",
          children: [
            { id: "menu-models", label: "型号维护", path: "/catalog/models" },
            { id: "menu-dashboard", label: "工作台", path: "/dashboard" },
          ],
        },
      ],
    });
    const wrapper = await mountShell();

    const hrefs = wrapper.findAll("a").filter((a) => a.attributes("href")).map((a) => a.attributes("href"));
    // /catalog/models → /models（demo 树前缀别名）
    expect(hrefs).toContain("/models");
    // /receipts?stage=task_assignment → /task-assignment（demo 树 query-stage 别名）
    expect(hrefs).toContain("/task-assignment");
    // /dashboard → /（demo 树工作台别名）
    expect(hrefs).toContain("/");
    // 旧 path 不允许漏出到 DOM
    expect(hrefs).not.toContain("/catalog/models");
    expect(hrefs).not.toContain("/receipts?stage=task_assignment");
    expect(hrefs).not.toContain("/dashboard");
  });
});
