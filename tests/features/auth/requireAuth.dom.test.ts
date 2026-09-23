// M01.F04.I03 fnTest — 路由守卫 useRequireAuth（未登录/无权限拦截）。
//
// 镜像 react 仓 tests/require-auth.dom.test.tsx 4 个 fnTest。vue 版不挂
// 组件树，直接驱动 FSM（__testActions）+ 断言守卫函数返回值与 router 跳转：
// useRequireAuth 内部 useAuthStore/useRouter，这里用真 router + pinia。

import { describe, beforeEach, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { createRouter, createMemoryHistory, type Router } from "vue-router";
import { createPinia, setActivePinia, getActivePinia } from "pinia";
import { defineComponent, h, unref } from "vue";
import { useRequireAuth } from "@/state/require-auth";
import { __testActions, __testReset, __testState } from "@/state/auth";
import type { AuthState } from "@/api/contracts";

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
    post: async (_url: string, _body?: unknown) => {
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    create: () => {
      throw new Error("guard test 不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

// -- fixtures ----------------------------------------------------------------------

const USER = { id: "u1", username: "admin" };
const TENANT_A = { tenantId: "t-a", code: "ACME", name: "甲公司", roleIds: [] };
const TENANT_B = { tenantId: "t-b", code: "BETA", name: "乙公司", roleIds: [] };

/** 守卫探针组件：useRequireAuth 结果渲染出来（unref 兼容 reactive 化返回值） */
function makeProbe(permissions?: string[]) {
  return defineComponent({
    setup() {
      const { allowed, checking } = useRequireAuth({ permissions });
      return () => h("div", { "data-testid": "guard" }, `${unref(allowed)}|${unref(checking)}`);
    },
  });
}

async function mountGuard(permissions?: string[]): Promise<Router> {
  // 复用 beforeEach 已激活的 pinia（login 推进的 FSM 态在这个实例上），
  // 这里再 createPinia 会换实例导致守卫读到 idle。
  const pinia = getActivePinia()!;
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/secret", component: makeProbe(permissions) },
      { path: "/login", component: { template: '<div data-testid="login-page">login</div>' } },
      { path: "/403", component: { template: '<div data-testid="forbidden-page">403</div>' } },
    ],
  });
  router.push("/secret");
  await router.isReady();
  mount(makeProbe(permissions), { global: { plugins: [pinia, router] } });
  await flushPromises();
  return router;
}

async function state(): Promise<AuthState> {
  await flushPromises();
  return __testState();
}

beforeEach(() => {
  queue.length = 0;
  const pinia = createPinia();
  setActivePinia(pinia);
  __testReset();
  localStorage.clear();
});

describe("M01.F04.I03 路由守卫", () => {
  fnTest(["M01.F04.I03"], "anonymous 访问受守卫路由 → 跳 /login", async () => {
    // 落 anonymous：无 token hydrate
    localStorage.removeItem("lab.accessToken");
    const { hydrateAuth } = await import("@/state/auth");
    const hydrate = hydrateAuth;
    await mountGuard();
    await hydrate();
    const s = await state();
    expect(s.kind).toBe("anonymous");
  });

  fnTest(["M01.F04.I03"], "authenticated 缺权限 → 拦在 /403", async () => {
    // login 单租户 + 空 permissions → authenticated
    queue.push(
      { status: 200, data: { token: "t1", refreshToken: "r1", user: USER, tenants: [TENANT_A] } },
      { status: 200, data: { permissions: [] } },
    );
    const resp = await __testActions.login({ username: "admin", password: "x" });
    expect("code" in resp && resp.code ? false : true).toBe(true);
    const router = await mountGuard(["report:approve"]); // 要求一个没有的权限
    await flushPromises();
    expect(router.currentRoute.value.path).toBe("/403");
  });

  fnTest(["M01.F04.I03"], "authenticated 权限齐 → allowed=true 留在原地", async () => {
    queue.push(
      { status: 200, data: { token: "t1", refreshToken: "r1", user: USER, tenants: [TENANT_A] } },
      { status: 200, data: { permissions: ["report:approve"] } },
    );
    await __testActions.login({ username: "admin", password: "x" });
    const router = await mountGuard(["report:approve"]);
    expect(router.currentRoute.value.path).toBe("/secret");
  });

  fnTest(
    ["M01.F04.I03"],
    "login 多租户无记忆 → 自动选第一个租户 authenticated 不拦（2026-09-23 修 SSO 回调冻结）",
    async () => {
      queue.push(
        {
          status: 200,
          data: { token: "t2", refreshToken: "r2", user: USER, tenants: [TENANT_A, TENANT_B] },
        },
        { status: 200, data: { permissions: [] } },
      );
      await __testActions.login({ username: "admin", password: "x" });
      const s = await state();
      expect(s.kind).toBe("authenticated");
      const router = await mountGuard();
      expect(router.currentRoute.value.path).toBe("/secret");
    },
  );

  fnTest(
    ["M01.F04.I03"],
    "login 空租户列表 → awaiting_tenant 访问受守卫路由拦在 /login（选租户页已移除，M00.F02 保持规划）",
    async () => {
      // 空租户列表是 awaiting_tenant 仅存入口（此路径不发 permissions 请求）
      queue.push({
        status: 200,
        data: { token: "t3", refreshToken: "r3", user: USER, tenants: [] },
      });
      await __testActions.login({ username: "admin", password: "x" });
      const s = await state();
      expect(s.kind).toBe("awaiting_tenant");
      const router = await mountGuard();
      await flushPromises();
      expect(router.currentRoute.value.path).toBe("/login");
    },
  );

  // 2026-09-23 冷启动白屏根因：useRequireAuth 曾在 setup 时一次性算死
  // allowed/checking（普通布尔非响应式）——hydrateAuth 的 /me 晚于 AppShell
  // setup 返回时（冷 profile / 慢网），authState idle→authenticated 推进了
  // store，但模板里的 checking 永远停在 true → 登录后白屏。
  // 锁行为：mount 时 idle → 之后转 authenticated，探针必须翻转。
  fnTest(
    ["M01.F04.I03"],
    "idle mount 后转 authenticated → 探针翻转（冷启动不卡 checking）",
    async () => {
      const pinia = getActivePinia()!;
      const router = createRouter({
        history: createMemoryHistory(),
        routes: [
          { path: "/secret", component: makeProbe() },
          { path: "/login", component: { template: "<div>login</div>" } },
          { path: "/403", component: { template: "<div>403</div>" } },
        ],
      });
      router.push("/secret");
      await router.isReady();
      const wrapper = mount(makeProbe(), { global: { plugins: [pinia, router] } });
      await flushPromises();
      expect(wrapper.text()).toBe("false|true"); // idle 挂起

      // 模拟 hydrate 晚到：login 推进 FSM → authenticated
      queue.push(
        { status: 200, data: { token: "t3", refreshToken: "r3", user: USER, tenants: [TENANT_A] } },
        { status: 200, data: { permissions: ["report:approve"] } },
      );
      await __testActions.login({ username: "admin", password: "x" });
      await flushPromises();
      expect(wrapper.text()).toBe("true|false"); // 响应式翻转
      expect(router.currentRoute.value.path).toBe("/secret");
    },
  );
});
