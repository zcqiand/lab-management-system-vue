// TenantSwitcher（M00.F02.I01）— 镜像 lab-nextjs tenant-switcher.tsx。
//
// 驱动方式：pinia store 直写 authenticated 态 + __testSetTenants 注入租户清单
//（settleLogin/hydrateAuth 的生产同步点在 auth-fsm.test.ts 已锁，这里锁 UI 行为）。
// reka-ui DropdownMenu 内容走 Portal → 断言查 document.body（vue-reka-dropdown
// 测试配方：触发器/菜单项都走 click）。

import { describe, it, beforeEach, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import TenantSwitcher from "@/components/app/TenantSwitcher.vue";
import { __testReset, __testSetTenants, useAuthStore } from "@/state/auth";
import type { MyTenant } from "@/api/endpoints/model";

type MockResponse = { status: number; data: unknown };
const queue: MockResponse[] = [];
const calls: { method: string; url: string }[] = [];

vi.mock("axios", () => ({
  default: {
    isAxiosError: (e: unknown) => e instanceof Error && "response" in (e as object),
    post: async (url: string) => {
      calls.push({ method: "POST", url });
      const r = queue.shift();
      if (!r || r.status >= 400) {
        throw Object.assign(new Error(`HTTP ${r?.status ?? "no-mock"}`), { response: r });
      }
      return { status: r.status, data: r.data };
    },
    get: async () => {
      throw new Error("tenant-switcher test 不应触达 axios.get");
    },
    create: () => {
      throw new Error("tenant-switcher test 不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

const TENANT_A: MyTenant = { tenantId: "t-a", code: "ACME", name: "甲公司", roleIds: [] };
const TENANT_B: MyTenant = { tenantId: "t-b", code: "DIST", name: "乙公司", roleIds: [] };

function toAuthenticated(current: MyTenant): void {
  const store = useAuthStore();
  store.authState = {
    kind: "authenticated",
    value: {
      kind: "authenticated",
      user: { id: "u1", username: "admin" },
      tenant: current,
      permissions: [],
      tokenExpiresAt: Date.now() + 60_000,
    },
  };
}

function mountSwitcher() {
  return mount(TenantSwitcher, { attachTo: document.body });
}

function bodyOption(tenantId: string): HTMLElement | null {
  return document.body.querySelector(
    `[data-testid="tenant-option-${tenantId}"]`,
  ) as HTMLElement | null;
}

beforeEach(() => {
  queue.length = 0;
  calls.length = 0;
  document.body.innerHTML = "";
  setActivePinia(createPinia());
  __testReset();
  localStorage.clear();
});

describe("TenantSwitcher（镜像 lab-nextjs）", () => {
  it("触发器 = Building2 + 当前租户名 + ChevronsUpDown，data-fn M00.F02.I01", () => {
    toAuthenticated(TENANT_A);
    __testSetTenants([TENANT_A, TENANT_B]);
    const w = mountSwitcher();
    const trigger = w.find('[data-testid="tenant-switcher"]');
    expect(trigger.exists()).toBe(true);
    expect(trigger.attributes("data-fn")).toBe("M00.F02.I01");
    expect(trigger.text()).toContain("甲公司");
    w.unmount();
  });

  it("展开菜单 → 候选租户全量渲染（sessionTenantsList 注入）", async () => {
    toAuthenticated(TENANT_A);
    __testSetTenants([TENANT_A, TENANT_B]);
    const w = mountSwitcher();
    await w.find('[data-testid="tenant-switcher"]').trigger("click");
    await flushPromises();
    expect(bodyOption("t-a")?.textContent).toContain("甲公司");
    expect(bodyOption("t-b")?.textContent).toContain("乙公司");
    w.unmount();
  });

  it("点击其他租户 → POST /api/auth/switch-tenant + emit switched", async () => {
    toAuthenticated(TENANT_A);
    __testSetTenants([TENANT_A, TENANT_B]);
    // switch-tenant 换发响应（settleLogin 消费）
    queue.push({
      status: 200,
      data: {
        token: "t2",
        refreshToken: "r2",
        user: { id: "u1", username: "admin" },
        tenants: [TENANT_B],
      },
    });
    const w = mountSwitcher();
    await w.find('[data-testid="tenant-switcher"]').trigger("click");
    await flushPromises();
    bodyOption("t-b")!.click();
    await flushPromises();
    expect(calls.some((c) => c.url.includes("/api/auth/switch-tenant"))).toBe(true);
    expect(w.emitted("switched")).toHaveLength(1);
    w.unmount();
  });

  it("切换失败 → 渲染错误文案 + 不 emit switched", async () => {
    toAuthenticated(TENANT_A);
    __testSetTenants([TENANT_A, TENANT_B]);
    queue.push({ status: 404, data: { code: "NOT_FOUND", message: "Tenant not found" } });
    const w = mountSwitcher();
    await w.find('[data-testid="tenant-switcher"]').trigger("click");
    await flushPromises();
    bodyOption("t-b")!.click();
    await flushPromises();
    const err = document.body.querySelector('[data-testid="tenant-switcher-error"]');
    // toApiError 走 axios error message（mock 抛 "HTTP 404"）
    expect(err?.textContent).toContain("404");
    expect(w.emitted("switched")).toBeUndefined();
    w.unmount();
  });

  it("点击当前租户 → 不发请求（幂等守卫）", async () => {
    toAuthenticated(TENANT_A);
    __testSetTenants([TENANT_A, TENANT_B]);
    const w = mountSwitcher();
    await w.find('[data-testid="tenant-switcher"]').trigger("click");
    await flushPromises();
    bodyOption("t-a")!.click();
    await flushPromises();
    expect(calls.some((c) => c.url.includes("/api/auth/switch-tenant"))).toBe(false);
    w.unmount();
  });
});
