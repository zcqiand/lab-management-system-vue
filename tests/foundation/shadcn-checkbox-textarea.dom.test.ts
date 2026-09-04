// Phase 2b/c foundation smoke — shadcn-vue Checkbox + Textarea 底座契约测试。
// 不挂功能 ID（工程设施测试）。
//
// 锁十件事，后续 Phase 2b/c 业务页迁移不许回归：
//   1. <Checkbox> 渲染为 <button role="checkbox">（reka-ui CheckboxRoot as=button）
//   2. <Checkbox> v-model 双向写回 boolean
//   3. <Checkbox> click 切换 aria-checked（true / false）
//   4. <Checkbox> aria-checked 反映 modelValue 初始态
//   5. <Checkbox> $attrs（aria-label / data-fn）落到真实 <button>
//   6. <Checkbox> class prop 经 cn() 合并，调用方 extra-class 存在
//   7. <Textarea> 渲染为真实 <textarea>
//   8. <Textarea> v-model 双向写回 string
//   9. <Textarea> $attrs（data-fn）落到真实 <textarea>
//  10. <Textarea> disabled 落到真实 DOM
import { describe, it, expect, afterEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";
import { mountWithProviders } from "../helper";
import CheckboxTextareaFixture from "./__fixtures__/CheckboxTextareaFixture.vue";

let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 2b foundation — shadcn-vue Checkbox 底座", () => {
  it("<Checkbox> 渲染为 <button role=checkbox>，且 $attrs 落到真实 DOM", () => {
    lastWrapper = mountWithProviders(CheckboxTextareaFixture);

    const cb = lastWrapper.find('[data-testid="cb"]');
    expect(cb.exists()).toBe(true);
    expect(cb.element.tagName).toBe("BUTTON");
    expect(cb.attributes("role")).toBe("checkbox");
    expect(cb.attributes("type")).toBe("button");
    // $attrs 转发：aria-label + data-fn 落到真实 <button>
    expect(cb.attributes("aria-label")).toBe("测试 checkbox");
    expect(cb.attributes("data-fn")).toBe("M99.F99.I99");
    // class prop 经 cn() 合并（cn 的 tailwind-merge 会去重）
    expect(cb.classes()).toContain("h-4");
    expect(cb.classes()).toContain("w-4");
    expect(cb.classes()).toContain("rounded-sm");
    expect(cb.classes()).toContain("extra-class");
  });

  it("<Checkbox> aria-checked 反映初始 modelValue（false），未点时是 unchecked", () => {
    lastWrapper = mountWithProviders(CheckboxTextareaFixture);

    const cb = lastWrapper.find('[data-testid="cb"]');
    expect(cb.attributes("aria-checked")).toBe("false");

    const state = lastWrapper.find('[data-testid="cb-state"]');
    expect(state.text()).toBe("unchecked");
  });

  it("<Checkbox> click 切换选中态（aria-checked 变 true，state span 变 checked）", async () => {
    lastWrapper = mountWithProviders(CheckboxTextareaFixture);

    const cb = lastWrapper.find('[data-testid="cb"]');
    await cb.trigger("click");
    // reka-ui 用 update:modelValue 异步反映
    await new Promise((r) => setTimeout(r, 10));

    expect(cb.attributes("aria-checked")).toBe("true");
    const state = lastWrapper.find('[data-testid="cb-state"]');
    expect(state.text()).toBe("checked");
  });

  it("<Checkbox> 再次 click 取消（aria-checked 回到 false）", async () => {
    lastWrapper = mountWithProviders(CheckboxTextareaFixture);

    const cb = lastWrapper.find('[data-testid="cb"]');
    await cb.trigger("click");
    await new Promise((r) => setTimeout(r, 10));
    expect(cb.attributes("aria-checked")).toBe("true");

    await cb.trigger("click");
    await new Promise((r) => setTimeout(r, 10));
    expect(cb.attributes("aria-checked")).toBe("false");
  });
});

describe("Phase 2c foundation — shadcn-vue Textarea 底座", () => {
  it("<Textarea> 渲染为真实 <textarea>，且 $attrs 落到真实 DOM", () => {
    lastWrapper = mountWithProviders(CheckboxTextareaFixture);

    const ta = lastWrapper.find('[data-testid="ta"]');
    expect(ta.exists()).toBe(true);
    expect(ta.element.tagName).toBe("TEXTAREA");
    // rows + placeholder + data-fn 落到真实 <textarea>
    expect(ta.attributes("rows")).toBe("4");
    expect(ta.attributes("placeholder")).toBe("placeholder");
    expect(ta.attributes("data-fn")).toBe("M99.F99.I99");
    // class prop 经 cn() 合并
    expect(ta.classes()).toContain("min-h-[60px]");
    expect(ta.classes()).toContain("rounded-md");
    expect(ta.classes()).toContain("border-input");
    expect(ta.classes()).toContain("extra-ta-class");
  });

  it("<Textarea> 初始值 = fixture 设的 init，state span 同步", () => {
    lastWrapper = mountWithProviders(CheckboxTextareaFixture);

    const ta = lastWrapper.find('[data-testid="ta"]');
    expect((ta.element as HTMLTextAreaElement).value).toBe("init");
    expect(lastWrapper.find('[data-testid="ta-state"]').text()).toBe("init");
  });

  it("<Textarea> setValue 双向写回（DOM value 与 v-model span 同步）", async () => {
    lastWrapper = mountWithProviders(CheckboxTextareaFixture);

    const ta = lastWrapper.find('[data-testid="ta"]');
    await ta.setValue("new text");
    expect((ta.element as HTMLTextAreaElement).value).toBe("new text");
    expect(lastWrapper.find('[data-testid="ta-state"]').text()).toBe("new text");
  });

  it("<Textarea disabled> 渲染 disabled 属性到真实 DOM", () => {
    lastWrapper = mountWithProviders(CheckboxTextareaFixture);

    const ta = lastWrapper.find('[data-testid="ta-disabled"]');
    expect(ta.exists()).toBe(true);
    expect(ta.element.tagName).toBe("TEXTAREA");
    expect((ta.element as HTMLTextAreaElement).disabled).toBe(true);
    // value 还是 fixture 设的 locked（disabled 不影响显示）
    expect((ta.element as HTMLTextAreaElement).value).toBe("locked");
  });
});