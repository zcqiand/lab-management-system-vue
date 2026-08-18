// M01.F05.I04 fnTest — 登出按钮（AppShell 侧栏底部「退出登录」）。
//
// 镜像 react app-shell.tsx header 登出按钮语义：点击 → logout() 清
// token/permissions 落 anonymous → replace /login。
// 驱动方式：__testActions.login 先推 authenticated（axios mock 队列），
// 挂 AppShell（真 router + getActivePinia，requireAuth.dom.test.ts 同款），
// 点「退出登录」断言路由跳转 + 状态落 anonymous。

import { describe, beforeEach, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { createRouter, createMemoryHistory, type Router } from "vue-router";
import { createPinia, setActivePinia, getActivePinia } from "pinia";
import AppShell from "@/components/app/AppShell.vue";
import { __testActions, __testReset, __testState } from "@/state/auth";

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
    post: async (url: string) => {
      calls.push({ method: "POST", url });
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    create: () => {
      throw new Error("logout test 不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

// -- fixtures ----------------------------------------------------------------------

const USER = { id: "u1", username: "admin" };
const TENANT_A = { tenantId: "t-a", code: "ACME", name: "甲公司", roleIds: [] };

/** 挂 AppShell：真 router（/ 业务页 + /login）+ 复用已激活 pinia。
 *  返回 wrapper（vue-test-utils 容器，不挂 document.body）+ router。 */
async function mountShell(): Promise<{ wrapper: ReturnType<typeof mount>; router: Router }> {
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
  return { wrapper, router };
}

/** 从 wrapper 容器找登出按钮（AppShell 挂两次是嵌套路由的正常现象，取第一个） */
function findLogoutButton(wrapper: ReturnType<typeof mount>): HTMLButtonElement {
  return wrapper.element.querySelector('button[data-fn="M01.F05.I04"]') as HTMLButtonElement;
}

/** 推进到 authenticated（单租户直进） */
async function toAuthenticated(): Promise<void> {
  queue.push(
    { status: 200, data: { token: "t1", refreshToken: "r1", user: USER, tenants: [TENANT_A] } },
    { status: 200, data: { permissions: [] } },
  );
  const resp = await __testActions.login({ username: "admin", password: "x" });
  expect("code" in resp && resp.code ? false : true).toBe(true);
}

beforeEach(() => {
  queue.length = 0;
  calls.length = 0;
  const pinia = createPinia();
  setActivePinia(pinia);
  __testReset();
  localStorage.clear();
});

describe("M01.F05.I04 登出", () => {
  fnTest(["M01.F05.I04"], "AppShell 侧栏底部渲染「退出登录」按钮 + data-fn 锚点", async () => {
    await toAuthenticated();
    const { wrapper, router } = await mountShell();
    const btn = findLogoutButton(wrapper);
    expect(btn).toBeTruthy();
    expect(btn.textContent).toContain("退出登录");
    expect(router.currentRoute.value.path).toBe("/");
  });

  fnTest(["M01.F05.I04"], "点击登出 → POST /api/auth/logout + 落 anonymous + 跳 /login", async () => {
    await toAuthenticated();
    // logout 请求的 mock 响应
    queue.push({ status: 200, data: {} });
    const { wrapper, router } = await mountShell();
    const btn = findLogoutButton(wrapper);
    expect(btn).toBeTruthy();
    btn.click();
    await flushPromises();
    // logout 端点被调（token 存在时 doLogout 会 POST /api/auth/logout）
    expect(calls.some((c) => c.url.includes("/api/auth/logout"))).toBe(true);
    // FSM 落 anonymous + token 清空
    expect(__testState().kind).toBe("anonymous");
    expect(localStorage.getItem("lab.accessToken")).toBeNull();
    // 路由跳 /login
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/login");
  });
});
