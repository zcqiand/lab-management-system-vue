// BackendSwitcher — 侧栏 footer 后端切换器（2026-09-23 用户裁定恢复）。
//
// 回归背景（2026-09-23 用户反馈「选择后端的控件出不来」）：DropdownMenu 基类
// 残留前 reka 时代的 `absolute right-0 mt-2`，在 popper 0×0 wrapper 里把菜单
// 右缘钉死到 wrapper 原点 → 侧栏 footer（屏幕左侧）场景整菜单飞出视口左侧。
// 修复 = 基类去掉定位类交给 popper 摆位 + side-offset 补间距。本测试锁：
//   1. 内容层不再携带任何 absolute 定位类（回归哨兵，坐标摆位归 popper）
//   2. 点开 → 三后端候选全量渲染在 document.body（Portal 配方）
//   3. 活动后端高亮 bg-accent
// 切换写覆盖 + 清会话 + 整页刷新的语义在 backend-config.test.ts /
// auth-fsm 锁，这里锁 UI 骨架。

import { describe, it, beforeEach, expect, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import BackendSwitcher from "@/components/app/BackendSwitcher.vue";
import { clearBackendOverride, setBackendOverride } from "@/api/backend-config";

vi.mock("axios", () => ({
  default: {
    isAxiosError: (e: unknown) => e instanceof Error && "response" in (e as object),
    get: async () => {
      throw new Error("backend-switcher test 不应触达 axios.get");
    },
    post: async () => {
      throw new Error("backend-switcher test 不应触达 axios.post");
    },
    create: () => {
      throw new Error("backend-switcher test 不应触达 axios.create");
    },
    interceptors: { request: { use: () => 0 }, response: { use: () => 0 } },
  },
}));

function bodyMenuContent(): HTMLElement | null {
  // Portal → body；内容层 = [role=menu]（reka DropdownMenuContent）
  return document.body.querySelector('[role="menu"]');
}

beforeEach(() => {
  document.body.innerHTML = "";
  setActivePinia(createPinia());
  localStorage.clear();
  clearBackendOverride();
});

describe("BackendSwitcher（侧栏 footer 后端切换）", () => {
  it("触发器 = ghost + Server 图标 + 活动 mode 字面，落侧栏 footer", () => {
    // 活动态显式钉住（.env.test 的 VITE_API_MODE=msw-http 在注册表外透传，
    // 不依赖 env 缺省值）——组件在 setup 时读一次覆盖
    setBackendOverride("springboot");
    const w = mount(BackendSwitcher, { attachTo: document.body });
    const trigger = w.find('[data-testid="backend-switcher-trigger"]');
    expect(trigger.exists()).toBe(true);
    expect(trigger.text()).toContain("springboot");
    w.unmount();
  });

  it("点开 → 三后端候选渲染在 body + 内容层无 absolute 定位类（popper 摆位回归哨兵）", async () => {
    const w = mount(BackendSwitcher, { attachTo: document.body });
    await w.find('[data-testid="backend-switcher-trigger"]').trigger("click");
    await flushPromises();
    const opt = (id: string) => document.body.querySelector(`[data-testid="backend-option-${id}"]`);
    expect(opt("nextjs")?.textContent).toContain("http://localhost:5201");
    expect(opt("aspnetcore")?.textContent).toContain("http://localhost:5204");
    expect(opt("springboot")?.textContent).toContain("http://localhost:5205");
    // 2026-09-23 回归哨兵：absolute/right-0/mt-2 与 reka popper wrapper 冲突
    //（footer 场景菜单整体移出视口左缘），不允许再回到内容层类里。
    const cls = bodyMenuContent()?.className ?? "";
    expect(cls).not.toContain("absolute");
    expect(cls).not.toContain("right-0");
    expect(cls).not.toContain("mt-2");
    w.unmount();
  });

  it("活动后端候选高亮 bg-accent，其余 cursor-pointer", async () => {
    setBackendOverride("aspnetcore"); // 同上：显式钉活动态，不赌 env
    const w = mount(BackendSwitcher, { attachTo: document.body });
    await w.find('[data-testid="backend-switcher-trigger"]').trigger("click");
    await flushPromises();
    expect(
      document
        .querySelector('[data-testid="backend-option-aspnetcore"]')
        ?.className.includes("bg-accent"),
    ).toBe(true);
    expect(
      document
        .querySelector('[data-testid="backend-option-nextjs"]')
        ?.className.includes("cursor-pointer"),
    ).toBe(true);
    w.unmount();
  });
});
