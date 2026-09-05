// Phase 2d-1 foundation smoke — shadcn-vue Select 5 原语底座契约测试。
// 不挂功能 ID（工程设施测试）。
//
// 锁八件事，后续 Phase 2d-2 业务页迁移不许回归：
//   1. <SelectTrigger> 渲染为 `<button type="button" role="combobox">`
//      （reka-ui SelectTrigger as=button）
//   2. <SelectTrigger> $attrs（aria-label / data-fn）落到真实 <button>
//   3. <SelectTrigger> class prop 经 cn() 合并（基类 h-9 + 调用方 extra-class）
//   4. 点 <SelectTrigger> 打开 portal，<SelectContent> 渲染为 div[role=listbox]
//   5. <SelectItem> 渲染为 div[role=option]；选中态 data-state=checked
//   6. 点 <SelectItem> → v-model 双向写回；trigger 显示新值
//   7. <SelectValue> placeholder 在 modelValue 为空时显示 fallback
//   8. disabled 落到真实 DOM（button disabled 属性）
//
// 实现注意：reka-ui SelectTrigger 监听 pointerdown 开门（不是 click），
// SelectItem 监听 pointerup 选中。jsdom 缺 hasPointerCapture / pointerType，
// 两个 dispatch 助手统一放在 tests/selectInteraction.ts（Phase 2d-2 起共享）。
import { describe, it, expect, afterEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";
import { mountWithProviders } from "../helper";
import { openSelect, pickSelectItem } from "../selectInteraction";
import SelectFixture from "./__fixtures__/SelectFixture.vue";

let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 2d-1 foundation — shadcn-vue Select 底座", () => {
  it("<SelectTrigger> 渲染为 <button type=button role=combobox>，且 $attrs 落到真实 DOM", () => {
    lastWrapper = mountWithProviders(SelectFixture);

    const trigger = lastWrapper.find('[data-testid="sel-trigger"]');
    expect(trigger.exists()).toBe(true);
    expect(trigger.element.tagName).toBe("BUTTON");
    expect(trigger.attributes("role")).toBe("combobox");
    expect(trigger.attributes("type")).toBe("button");
    // $attrs 转发：aria-label + data-fn 落到真实 <button>
    expect(trigger.attributes("aria-label")).toBe("测试 select");
    expect(trigger.attributes("data-fn")).toBe("M99.F99.I99");
    // class prop 经 cn() 合并（基类 h-9 + 调用方 extra-class）
    expect(trigger.classes()).toContain("h-9");
    expect(trigger.classes()).toContain("w-full");
    expect(trigger.classes()).toContain("extra-class");
  });

  it("<SelectValue> placeholder 在 modelValue 为空时显示 fallback", () => {
    lastWrapper = mountWithProviders(SelectFixture);

    const trigger = lastWrapper.find('[data-testid="sel-trigger"]');
    expect(trigger.text()).toContain("请选择");
  });

  it("点 <SelectTrigger> 打开 portal → <SelectContent> 渲染为 div[role=listbox]", async () => {
    lastWrapper = mountWithProviders(SelectFixture);

    const trigger = lastWrapper.find('[data-testid="sel-trigger"]');
    // reka-ui SelectTrigger onPointerDown 开门，不是 click
    await openSelect(trigger.element);

    // 列表内容渲染（reka-ui SelectPortal → Teleport，helper.ts 已 stub 为 data-teleport-stub）
    const listbox = lastWrapper.find('[role="listbox"]');
    expect(listbox.exists()).toBe(true);
    expect(listbox.element.tagName).toBe("DIV");
  });

  it("<SelectItem> 渲染为 div[role=option]，3 个选项文本正确", async () => {
    lastWrapper = mountWithProviders(SelectFixture);

    const trigger = lastWrapper.find('[data-testid="sel-trigger"]');
    await openSelect(trigger.element);

    // 只看 active listbox 内的选项（第一个 Select 的 3 个，不是 disabled 那个的 2 个）
    const listbox = lastWrapper.find('[role="listbox"]');
    const options = listbox.findAll('[role="option"]');
    expect(options.length).toBe(3);
    expect(options.map((o) => o.text())).toEqual(["选项 A", "选项 B", "选项 C"]);
  });

  it("点 <SelectItem> → v-model 双向写回（trigger 显示新值，state span 同步）", async () => {
    lastWrapper = mountWithProviders(SelectFixture);

    const trigger = lastWrapper.find('[data-testid="sel-trigger"]');
    await openSelect(trigger.element);

    const optB = lastWrapper.find('[data-testid="sel-opt-B"]');
    // reka-ui SelectItem 用 pointerup 选中（不是 click）
    await pickSelectItem(optB.element);

    expect(lastWrapper.find('[data-testid="sel-state"]').text()).toBe("B");
    // trigger 现在应显示选项 B 文本（reka-ui 配对 SelectItemText 回写到 SelectValue）
    const triggerText = lastWrapper.find('[data-testid="sel-trigger"]').text();
    expect(triggerText).toContain("选项 B");
  });

  it("选中态 <SelectItem> 挂 data-state=checked", async () => {
    lastWrapper = mountWithProviders(SelectFixture);

    // 默认 v-model 为空，所有 item 都是 unchecked
    const trigger = lastWrapper.find('[data-testid="sel-trigger"]');
    await openSelect(trigger.element);

    const optA = lastWrapper.find('[data-testid="sel-opt-A"]');
    await pickSelectItem(optA.element);

    // 重新打开 listbox 查看选中态
    await openSelect(trigger.element);

    const optAOpen = lastWrapper.find('[data-testid="sel-opt-A"]');
    expect(optAOpen.attributes("data-state")).toBe("checked");
  });

  it("disabled：<Select> 受控 disabled 落到真实 <button>", () => {
    lastWrapper = mountWithProviders(SelectFixture);

    const disabledTrigger = lastWrapper.find('[data-testid="sel-disabled-trigger"]');
    expect(disabledTrigger.exists()).toBe(true);
    expect((disabledTrigger.element as HTMLButtonElement).disabled).toBe(true);
  });

  it("class prop：<SelectTrigger class=extra-class> 经 cn() 合并（基类 + 调用方共存）", () => {
    lastWrapper = mountWithProviders(SelectFixture);

    const trigger = lastWrapper.find('[data-testid="sel-trigger"]');
    // 基类
    expect(trigger.classes()).toContain("h-9");
    expect(trigger.classes()).toContain("border");
    // 调用方
    expect(trigger.classes()).toContain("extra-class");
  });
});
