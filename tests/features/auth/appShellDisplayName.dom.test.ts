// M00.F01 fnTest — 顶栏登录用户显示名（空串回退回归锁）。
//
// 2026-09-23 现场：saas sys_user 无显示名列 → /me 不带 displayName →
// lab-aspnetcore SSO 落地 user.displayName=""（Upsert 存空串，FindByEmail
// 命中后不再更新）→ `??` 对空串不回退 → v-if="displayName" 为假 →
// header「租户旁用户名」整个消失。修复语义：displayName || username
// （|| 兜空串）；镜像 lab-nextjs header-session.dom.test.tsx 同款回归锁。
//
// 驱动方式：appShellLogout.dom.test.ts 同款（axios mock 队列 + 真 router +
// getActivePinia），login 响应的 user 显式带 displayName: "" 触发空串分支。

import { describe, beforeEach, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { createRouter, createMemoryHistory, type Router } from "vue-router";
import { createPinia, setActivePinia, getActivePinia } from "pinia";
import AppShell from "@/components/app/AppShell.vue";
import { __testActions, __testReset } from "@/state/auth";

// -- axios mock：可编程响应队列 ----------------------------------------------------

type MockResponse = { status: number; data: unknown };
const queue: MockResponse[] = [];

vi.mock("axios", () => ({
  default: {
    isAxiosError: (e: unknown) => e instanceof Error && "response" in (e as object),
    get: async (url: string) => {
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    post: async (url: string) => {
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    create: () => {
      throw new Error("display-name test 不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

// -- fixtures：displayName 显式空串（saas 真后端落地形状）--------------------------

const USER = { id: "u1", username: "alice@acme.io", displayName: "" };
const TENANT_A = { tenantId: "t-a", code: "ACME", name: "甲公司", roleIds: [] };

/** 挂 AppShell：真 router（/ 业务页 + /login）+ 复用已激活 pinia。 */
async function mountShell(): Promise<{ wrapper: ReturnType<typeof mount>; router: Router }> {
  const pinia = getActivePinia()!;
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      {
        path: "/",
        component: AppShell,
        children: [{ path: "", component: { template: '<div data-testid="home">业务页</div> ' } }],
      },
      { path: "/login", component: { template: '<div data-testid="login-page">login</div>' } },
    ],
  });
  router.push("/");
  await router.isReady();
  const wrapper = mount(AppShell, { global: { plugins: [pinia, router] } });
  await flushPromises();
  return { wrapper, router };
}

beforeEach(() => {
  queue.length = 0;
  const pinia = createPinia();
  setActivePinia(pinia);
  __testReset();
  localStorage.clear();
});

describe("M00.F01 顶栏用户显示名", () => {
  fnTest(["M00.F01"], "displayName 空串 → 回退 username 渲染（?? 不兜空串回归锁）", async () => {
    queue.push(
      { status: 200, data: { token: "t1", refreshToken: "r1", user: USER, tenants: [TENANT_A] } },
      { status: 200, data: { permissions: [] } },
      { status: 200, data: [] }, // GET /api/auth/menus（AppShell mount 拉菜单）
    );
    await __testActions.login({ username: "alice@acme.io", password: "x" });
    const { wrapper } = await mountShell();
    const el = wrapper.element.querySelector('[data-testid="user-display-name"]');
    expect(el).toBeTruthy();
    expect(el!.textContent).toContain("alice@acme.io");
  });
});
