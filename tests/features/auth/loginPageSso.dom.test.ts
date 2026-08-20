// M01.F05.I03 fnTest — SSO OAuth 2.0 授权码流两阶段（2026-08-19 升级，镜像 react 仓）。
//
// LoginPage.vue 的 SSO 两分支：
//   阶段 1：URL 带 ?code=&state=（saas 已授权）→ 验 state（防 CSRF）→ POST /api/auth/sso/callback
//           换 lab 自家 JWT（grant_type=authorization_code，client_secret 仅后端持有，
//           saas token 不出 lab 后端）→ setSession 进业务页
//   阶段 2：无回调参数 → 生成 state 存 sessionStorage → GET /api/auth/sso/authorize
//           → window.location = authorizeUrl 跳 saas
//
// 旧的 ?token= shortcut 阶段已删除（不符合 OAuth 2.0 + 首登缺 refreshToken 必崩）。
// axios 在 orval 生成层被 vi.mock 拦截（auth-fsm.test.ts 同款队列模式）。

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
});

describe("M01.F05.I03 SSO OAuth 2.0 授权码流", () => {
  fnTest(["M01.F05.I03"], "阶段 2：无回调参数 → authorize 拿 authorizeUrl → 跳 saas", async () => {
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

  fnTest(["M01.F05.I03"], "阶段 1：?code=&state= → POST sso/callback 换 token → setSession 进业务页", async () => {
    // OAuth 2.0 state 防 CSRF：LoginPage 用 sessionStorage 里预存的 state 与 URL 回跳的
    // state 比对。测试模拟「authorize 时存了 state=xyz，回跳 ?code=abc&state=xyz」的真实流程。
    sessionStorage.setItem("lab.sso.state", "xyz");
    queue.push({ status: 200, data: LOGIN_OK });
    const { router } = await mountAt("/login?code=abc&state=xyz");
    await flushPromises();
    expect(
      calls.some(
        (c) =>
          c.method === "POST" &&
          c.url.includes("/api/auth/sso/callback") &&
          c.body &&
          (c.body as { code: string }).code === "abc" &&
          (c.body as { grant_type: string }).grant_type === "authorization_code" &&
          typeof (c.body as { redirect_uri: string }).redirect_uri === "string",
      ),
    ).toBe(true);
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/");
    expect(localStorage.getItem("lab.accessToken")).toBe("sso-jwt-1");
    // state 一次性：验过后应清掉
    expect(sessionStorage.getItem("lab.sso.state")).toBeNull();
  });
});
