// Phase 0 foundation smoke — shadcn-vue 底座契约测试。
// 不挂功能 ID（工程设施测试）。
//
// 锁三件事，后续 Phase 换原语时不许回归：
//   1. tests/helper.ts 的 DialogPortal / teleport stub 让 portal 内容留在 wrapper 内，
//      业务测试才能用 wrapper.find 断言对话框内容（否则内容跑去 document.body）。
//   2. ui 原语（Button / Input / Label）inheritAttrs:false + v-bind="$attrs" 转发，
//      `data-fn` / `aria-label` 这类锚点必须活着落到真实 DOM 元素上。
//   3. `class` prop 经 cn() 最后合并 —— 调用方 class 压过 CVA 默认值（tailwind-merge）。
import { describe, it, expect, afterEach } from "vitest";
import { nextTick } from "vue";
import type { VueWrapper } from "@vue/test-utils";
import { mountWithProviders } from "../helper";
import DialogFixture from "./__fixtures__/DialogFixture.vue";

// `attachTo: document.body` 把 DOM 挂到 jsdom 的 body 上，不 unmount 就在
// afterEach 之间累积，下一 case 的 selector 可能扫到上一 case 的残留。
// 用 module-scoped holder 在每个 case 末尾显式 unmount。
let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 0 foundation — shadcn-vue dialog 底座", () => {
  it("DialogPortal 被 stub，content 留在 wrapper 内且 data-state=open", () => {
    lastWrapper = mountWithProviders(DialogFixture, { attachTo: document.body });

    expect(lastWrapper.find("[data-teleport-stub]").exists()).toBe(true);
    expect(lastWrapper.find('[data-state="open"]').exists()).toBe(true);
    expect(lastWrapper.find('[data-testid="dialog-body"]').exists()).toBe(true);
  });

  it("Button 把 $attrs（data-fn / aria-label）转发到内层 <button>，调用方 class 胜出", () => {
    lastWrapper = mountWithProviders(DialogFixture, { attachTo: document.body });

    const cancel = lastWrapper.find('button[data-fn="dialog-cancel"]');
    expect(cancel.exists()).toBe(true);
    expect(cancel.attributes("aria-label")).toBe("close-dialog");
    // CVA 基类仍在
    expect(cancel.classes()).toContain("inline-flex");
    // 调用方传的 class 合并进来
    expect(cancel.classes()).toContain("mt-4");
    // tailwind-merge：调用方 h-10 压掉 size=default 的 h-9
    expect(cancel.classes()).toContain("h-10");
    expect(cancel.classes()).not.toContain("h-9");
  });

  it("点 cancel 关掉 dialog", async () => {
    lastWrapper = mountWithProviders(DialogFixture, { attachTo: document.body });

    await lastWrapper.find('button[data-fn="dialog-cancel"]').trigger("click");
    await nextTick();

    expect(lastWrapper.find('[data-testid="dialog-body"]').exists()).toBe(false);
  });

  it("Input 无条件绑定 disabled 且转发 $attrs；Label 转发 $attrs 并保留 for", () => {
    lastWrapper = mountWithProviders(DialogFixture, { attachTo: document.body });

    const input = lastWrapper.find('input[data-fn="dialog-input"]');
    expect(input.exists()).toBe(true);
    // disabled 落到真实 DOM，Label 的 peer-disabled: 选择器才会命中
    expect(input.attributes("disabled")).toBeDefined();
    expect((input.element as HTMLInputElement).disabled).toBe(true);
    expect(input.attributes("id")).toBe("dialog-note");

    const label = lastWrapper.find('label[data-fn="dialog-label"]');
    expect(label.exists()).toBe(true);
    expect(label.attributes("for")).toBe("dialog-note");
    expect(label.classes()).toContain("peer-disabled:opacity-70");
    expect(label.classes()).toContain("text-red-500");
  });
});
