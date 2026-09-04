// Phase 1.1 — SidebarNav action 分支 raw <button> → <Button variant="ghost">
// primitive 迁移冒烟。
//
// 锁四件事：
//   1. router-link 分支（item.path）渲染为 <a>，不挂 Button primitive。
//   2. action 分支（item.action，无 path）渲染为 <button>，拿到 Button CVA
//      基类 inline-flex —— 证明走 primitive 不是 raw <button>。
//   3. action 按钮的 data-fn / aria-label 经 Button 的 inheritAttrs:false +
//      v-bind="$attrs" 落到真实 <button>（Phase 0 契约不回归）。
//   4. 点击 action 按钮触发 emit('action', item.action)。
//
// 不挂功能 ID —— 这是 Phase 1 的工程迁移冒烟，不是业务用例。
import { describe, it, expect, afterEach } from "vitest";
import { nextTick } from "vue";
import type { VueWrapper } from "@vue/test-utils";
import { mountWithProviders } from "../helper";
import SidebarNav from "@/components/app/SidebarNav.vue";

let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

function mountNav(props: Record<string, unknown> = {}) {
  return mountWithProviders(SidebarNav, {
    attachTo: document.body,
    props: {
      items: [
        { label: "首页", path: "/" },
        { label: "退出登录", action: "logout", dataFn: "M01.F05.I04" },
      ],
      ...props,
    },
  });
}

describe("Phase 1.1 — SidebarNav action 分支 Button primitive", () => {
  it("router-link 分支渲染为 <a>，不走 Button primitive", () => {
    lastWrapper = mountNav();

    // router-link 渲染成 <a href>
    const link = lastWrapper!.find('a[href="/"]');
    expect(link.exists()).toBe(true);
    // 链接上不该有 Button CVA 的基类
    expect(link.classes()).not.toContain("inline-flex");
  });

  it("action 分支渲染为 <button>，带 Button CVA 基类 inline-flex", () => {
    lastWrapper = mountNav();

    const actionBtn = lastWrapper!.find('button[data-fn="M01.F05.I04"]');
    expect(actionBtn.exists()).toBe(true);
    // 真实 DOM 元素是 <button>（Button primitive 底层就是 <button>）
    expect(actionBtn.element.tagName).toBe("BUTTON");
    // CVA 基类 inline-flex 出现 → 证明走 Button 不是 raw <button>
    expect(actionBtn.classes()).toContain("inline-flex");
  });

  it("action 按钮的 aria-label 转发到真实 <button>", () => {
    lastWrapper = mountNav();

    const actionBtn = lastWrapper!.find('button[data-fn="M01.F05.I04"]');
    expect(actionBtn.attributes("aria-label")).toBe("退出登录");
  });

  it("点击 action 按钮 emit('action', item.action)", async () => {
    lastWrapper = mountNav();

    const actionBtn = lastWrapper!.find('button[data-fn="M01.F05.I04"]');
    await actionBtn.trigger("click");
    await nextTick();

    expect(lastWrapper!.emitted("action")).toBeTruthy();
    expect(lastWrapper!.emitted("action")![0]).toEqual(["logout"]);
  });
});
