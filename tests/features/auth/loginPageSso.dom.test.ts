// M01.F05.I03 fnTest — SSO 授权码流（authorize + callback）三阶段。
//
// LoginPage.vue 的 SSO 三分支（镜像 react 仓 loginPageSso.dom.test.tsx）：
//   阶段 1：URL 带 ?token=（saas 已换 token）→ 存 localStorage + GET /me → setSession 进业务页
//   阶段 2：URL 带 ?code=&state=（未换 token）→ POST /api/auth/sso/callback 换 mock-jwt → setSession
//   阶段 3：无回调参数 → GET /api/auth/sso/authorize → window.location = authorizeUrl 跳 saas
//
// axios 在 orval 生成层被 vi.mock 拦截（auth-fsm.test.ts 同款队列模式）。
// 2026-08-18 认证收口：本页是纯 SSO orchestrator，无用户名密码表单。

import { describe, beforeEach, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { createRouter, createMemoryHistory } from "vue-router";
import { createPinia, setActivePinia } from "pinia";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import LoginPage from "@/pages/LoginPage.vue";
import { __testReset } from "@/state/auth";

// -- axios mock：可编程响应队列 ----------------------------------------------------

type MockResponse = { status: number; data: unknown };
const queue: MockResponse[] = [];
const calls: { method: string; url: string; body?: unknown }[] = [];

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
    post: async (url: string, body?: unknown) => {
      calls.push({ method: "POST", url, body });
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    create: () => {
      throw new Error("sso test 不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

// -- fixtures ----------------------------------------------------------------------

const USER = { id: "u1", username: "admin" };
const TENANT_A = { tenantId: "t-a", code: "ACME", name: "甲公司", roleIds: [] };
const LOGIN_OK = { token: "sso-jwt-1", refreshToken: "rt-1", user: USER, tenants: [TENANT_A] };

/** LoginPage 消费 useRoute/useRouter —— 建真 router 推到目标路径再裸 mount */
async function mountAt(path: string) {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/login", component: LoginPage },
      { path: "/", component: { template: '<div data-testid="home">业务页</div>' } },
    ],
  });
  router.push(path);
  await router.isReady();
  const wrapper = mount(LoginPage, {
    global: {
      plugins: [
        pinia,
        router,
        [VueQueryPlugin, { queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }) }],
      ],
    },
  });
  return { wrapper, router };
}

beforeEach(() => {
  queue.length = 0;
  calls.length = 0;
  const pinia = createPinia();
  setActivePinia(pinia);
  __testReset();
  localStorage.clear();
  sessionStorage.clear();
  // setSession 要求 refreshToken 存量兜底（saas 场景 token 直达时只带 token+user）
  localStorage.setItem("lab.refreshToken", "rt-sso");
});

describe("M01.F05.I03 SSO 授权码流", () => {
  fnTest(["M01.F05.I03"], "阶段 3：无回调参数 → authorize 拿 authorizeUrl → 跳 saas", async () => {
    // jsdom window.location.href 只读 — 用 getter/proxy 拦截赋值记录目标 URL
    const original = window.location;
    let assignedHref = "";
    Object.defineProperty(window, "location", {
      configurable: true,
      get() {
        return new Proxy(original, {
          set(target, prop, value) {
            if (prop === "href") {
              assignedHref = String(value);
              return true;
            }
            return Reflect.set(target, prop, value);
          },
        });
      },
    });
    queue.push({ status: 200, data: { authorizeUrl: "http://saas:3000/login?redirect=%2F" } });
    try {
      await mountAt("/login");
      await flushPromises();
      expect(calls.some((c) => c.url.includes("/api/auth/sso/authorize"))).toBe(true);
      expect(assignedHref).toBe("http://saas:3000/login?redirect=%2F");
    } finally {
      Object.defineProperty(window, "location", { configurable: true, value: original });
    }
  });

  fnTest(["M01.F05.I03"], "阶段 2：?code=&state= → POST sso/callback 换 token → setSession 进业务页", async () => {
    queue.push({ status: 200, data: LOGIN_OK });
    const { router } = await mountAt("/login?code=abc&state=xyz");
    await flushPromises();
    expect(
      calls.some(
        (c) =>
          c.method === "POST" &&
          c.url.includes("/api/auth/sso/callback") &&
          c.body &&
          (c.body as { code: string }).code === "abc",
      ),
    ).toBe(true);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/");
    expect(localStorage.getItem("lab.accessToken")).toBe("sso-jwt-1");
  });

  fnTest(["M01.F05.I03"], "阶段 1：?token= 直达 → 存 localStorage + /me 建会话 → 进业务页", async () => {
    // AuthProvider hydrate 与阶段 1 都可能走 axios /auth/me —— 队列补两份响应
    queue.push({ status: 200, data: { user: USER, tenants: [TENANT_A], currentTenantId: "t-a" } });
    const { router } = await mountAt("/login?token=from-saas");
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/");
    expect(localStorage.getItem("lab.accessToken")).toBe("from-saas");
    // /me 请求带 Bearer from-saas（axios mock 队列只记 url，这里间接断言 token 已存）
  });
});
