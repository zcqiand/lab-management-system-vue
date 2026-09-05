// reka-ui Select 的测试交互助手（Phase 2d-1 从 foundation 测试提取，2d-2 起共享）。
//
// 为什么不能用 `trigger("click")`：
//   - reka-ui SelectTrigger 监听 **pointerdown** 开门（不是 click）
//   - reka-ui SelectItem 监听 **pointerup** 选中（不是 click）
// 为什么不能用 vue-test-utils 的 `trigger("pointerdown")`：
//   - jsdom 不实现 HTMLElement.hasPointerCapture，reka-ui 会直接抛
//   - reka-ui 还会读 event.pointerType / isPrimary，合成事件里是 undefined
// 所以走原生 PointerEvent dispatch + 两处 defineProperty 补字段。
//
// ⚠️ 前置条件：调用方必须用 `mountWithProviders`（helper.ts 把 Teleport stub 成
//    `<div data-teleport-stub>`）。裸 `mount()` 下 SelectPortal 走真实 Teleport，
//    `pickSelectItem` 打不通选中回路（pointerup 到得了元素，但 reka 的
//    onPointerup 不触发）。裸 mount 的场景请改从 <Select> 组件边界
//    `$emit("update:modelValue", v)`，直接验业务 handler —— 见
//    tests/features/data-entry/cardsAll.dom.test.ts 的 emitSelect()。

function dispatchPointer(el: Element, type: "pointerdown" | "pointerup"): void {
  if (typeof (el as HTMLElement).hasPointerCapture !== "function") {
    (el as HTMLElement).hasPointerCapture = () => false;
  }
  const Ctor =
    typeof globalThis.PointerEvent === "function"
      ? globalThis.PointerEvent
      : globalThis.MouseEvent;
  const evt = new Ctor(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    ctrlKey: false,
  }) as PointerEvent;
  try {
    Object.defineProperty(evt, "pointerType", { value: "mouse" });
    Object.defineProperty(evt, "isPrimary", { value: true });
  } catch {
    /* readonly —— MouseEvent fallback 下可能不允许改，reka-ui 会走默认分支 */
  }
  el.dispatchEvent(evt);
}

/** 打开 Select 下拉（reka-ui SelectTrigger 认 pointerdown）。 */
export async function openSelect(el: Element): Promise<void> {
  dispatchPointer(el, "pointerdown");
  await new Promise((r) => setTimeout(r, 10));
}

/** 选中一个 SelectItem（reka-ui SelectItem 认 pointerup）。 */
export async function pickSelectItem(el: Element): Promise<void> {
  dispatchPointer(el, "pointerup");
  await new Promise((r) => setTimeout(r, 10));
}
