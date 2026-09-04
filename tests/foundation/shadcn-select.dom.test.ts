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
// 实现注意：reka-ui SelectTrigger 监听 pointerdown 开门（不是 click）。
// jsdom 自带的 synthetic pointerdown 缺 hasPointerCapture，所以用原生
// PointerEvent dispatch（jsdom 25 提供 PointerEvent）+ 加 hasPointerCapture=undefined
// fallback（target 上若无方法直接跳过）。
import { describe, it, expect, afterEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";
import { mountWithProviders } from "../helper";
import SelectFixture from "./__fixtures__/SelectFixture.vue";

/** dispatch pointerdown that reka-ui SelectTrigger accepts.
 *  jsdom 25 lacks PointerEvent + HTMLElement.hasPointerCapture; fall back to
 *  a MouseEvent with pointerType set on the event itself. */
async function dispatchPointerDown(el: Element): Promise<void> {
  if (typeof (el as HTMLElement).hasPointerCapture !== "function") {
    (el as HTMLElement).hasPointerCapture = () => false;
  }
  const Ctor =
    typeof globalThis.PointerEvent === "function"
      ? globalThis.PointerEvent
      : globalThis.MouseEvent;
  const evt = new Ctor("pointerdown", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ctrlKey: false,
  }) as PointerEvent;
  // reka-ui checks event.pointerType — guard it via Object.defineProperty
  // since the MouseEvent fallback may not allow setting it via init dict.
  try {
    Object.defineProperty(evt, "pointerType", { value: "mouse" });
    Object.defineProperty(evt, "isPrimary", { value: true });
  } catch {
    /* readonly */
  }
  el.dispatchEvent(evt);
}

/** dispatch pointerup that reka-ui SelectItem uses for selection. */
async function dispatchPointerUp(el: Element): Promise<void> {
  if (typeof (el as HTMLElement).hasPointerCapture !== "function") {
    (el as HTMLElement).hasPointerCapture = () => false;
  }
  const Ctor =
    typeof globalThis.PointerEvent === "function"
      ? globalThis.PointerEvent
      : globalThis.MouseEvent;
  const evt = new Ctor("pointerup", {
    bubbles: true,
    cancelable: true,
    button: 0,
    ctrlKey: false,
  }) as PointerEvent;
  try {
    Object.defineProperty(evt, "pointerType", { value: "mouse" });
    Object.defineProperty(evt, "isPrimary", { value: true });
  } catch {
    /* readonly */
  }
  el.dispatchEvent(evt);
}

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
    await dispatchPointerDown(trigger.element);
    await new Promise((r) => setTimeout(r, 10));

    // 列表内容渲染（reka-ui SelectPortal → Teleport，helper.ts 已 stub 为 data-teleport-stub）
    const listbox = lastWrapper.find('[role="listbox"]');
    expect(listbox.exists()).toBe(true);
    expect(listbox.element.tagName).toBe("DIV");
  });

  it("<SelectItem> 渲染为 div[role=option]，3 个选项文本正确", async () => {
    lastWrapper = mountWithProviders(SelectFixture);

    const trigger = lastWrapper.find('[data-testid="sel-trigger"]');
    await dispatchPointerDown(trigger.element);
    await new Promise((r) => setTimeout(r, 10));

    // 只看 active listbox 内的选项（第一个 Select 的 3 个，不是 disabled 那个的 2 个）
    const listbox = lastWrapper.find('[role="listbox"]');
    const options = listbox.findAll('[role="option"]');
    expect(options.length).toBe(3);
    expect(options.map((o) => o.text())).toEqual(["选项 A", "选项 B", "选项 C"]);
  });

  it("点 <SelectItem> → v-model 双向写回（trigger 显示新值，state span 同步）", async () => {
    lastWrapper = mountWithProviders(SelectFixture);

    const trigger = lastWrapper.find('[data-testid="sel-trigger"]');
    await dispatchPointerDown(trigger.element);
    await new Promise((r) => setTimeout(r, 10));

    const optB = lastWrapper.find('[data-testid="sel-opt-B"]');
    // reka-ui SelectItem 用 pointerup 选中（不是 click）
    await dispatchPointerUp(optB.element);
    await new Promise((r) => setTimeout(r, 10));

    expect(lastWrapper.find('[data-testid="sel-state"]').text()).toBe("B");
    // trigger 现在应显示选项 B 文本（reka-ui 配对 SelectItemText 回写到 SelectValue）
    const triggerText = lastWrapper.find('[data-testid="sel-trigger"]').text();
    expect(triggerText).toContain("选项 B");
  });

  it("选中态 <SelectItem> 挂 data-state=checked", async () => {
    lastWrapper = mountWithProviders(SelectFixture);

    // 默认 v-model 为空，所有 item 都是 unchecked
    const trigger = lastWrapper.find('[data-testid="sel-trigger"]');
    await dispatchPointerDown(trigger.element);
    await new Promise((r) => setTimeout(r, 10));

    const optA = lastWrapper.find('[data-testid="sel-opt-A"]');
    await dispatchPointerUp(optA.element);
    await new Promise((r) => setTimeout(r, 10));

    // 重新打开 listbox 查看选中态
    await dispatchPointerDown(trigger.element);
    await new Promise((r) => setTimeout(r, 10));

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
