// Phase 1.0 — ConfirmDialog 内部 raw <button> → <Button> primitive 迁移冒烟。
//
// 锁三件事：
//   1. data-fn="confirm-dialog-cancel" / "confirm-dialog-confirm" 必须转发到真实 <button>
//      （Phase 0 的 $attrs 契约不回归）。
//   2. 两按钮拿到 Button.vue CVA 的基类 inline-flex（证明确实走 primitive，不是 raw）。
//   3. danger=true 触发 destructive 红底；danger=false 走 default 蓝底。
//
// 不挂功能 ID —— 这是 Phase 1 的工程迁移冒烟，不是业务用例。
import { describe, it, expect, afterEach, vi } from "vitest";
import { nextTick } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { mountWithProviders } from "../helper";
import ConfirmDialog from "@/components/app/ConfirmDialog.vue";

let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

function mountDialog(props: Record<string, unknown> = {}) {
  return mountWithProviders(ConfirmDialog, {
    attachTo: document.body,
    props: {
      open: true,
      title: "删除接样",
      message: "确认删除？",
      onConfirm: () => {},
      onCancel: () => {},
      ...props,
    },
  });
}

describe("Phase 1.0 — ConfirmDialog 内部 Button primitive", () => {
  it("data-fn=confirm-dialog-cancel / -confirm 转发到真实 <button>", () => {
    lastWrapper = mountDialog();

    const cancel = lastWrapper!.find('[data-fn="confirm-dialog-cancel"]');
    const confirm = lastWrapper!.find('[data-fn="confirm-dialog-confirm"]');

    expect(cancel.exists()).toBe(true);
    expect(confirm.exists()).toBe(true);
    // Phase 0 契约：data-fn 必须落到真实 DOM 元素，不能只在 <Button> 包装上
    expect(cancel.element.tagName).toBe("BUTTON");
    expect(confirm.element.tagName).toBe("BUTTON");
  });

  it("两按钮都带 Button CVA 基类 inline-flex（证明走 primitive 不是 raw）", () => {
    lastWrapper = mountDialog();

    const cancel = lastWrapper!.find('[data-fn="confirm-dialog-cancel"]');
    const confirm = lastWrapper!.find('[data-fn="confirm-dialog-confirm"]');

    expect(cancel.classes()).toContain("inline-flex");
    expect(confirm.classes()).toContain("inline-flex");
  });

  it("danger=false（默认）：confirm 走 primary 蓝底白字", () => {
    lastWrapper = mountDialog({ danger: false });

    const confirm = lastWrapper!.find('[data-fn="confirm-dialog-confirm"]');

    // CVA default variant 走 bg-primary text-primary-foreground
    expect(confirm.classes()).toContain("bg-primary");
    expect(confirm.classes()).toContain("text-primary-foreground");
  });

  it("danger=true：confirm 用 caller class 覆盖成 destructive 红底白字", () => {
    lastWrapper = mountDialog({ danger: true });

    const confirm = lastWrapper!.find('[data-fn="confirm-dialog-confirm"]');

    // tailwind-merge：caller class 压过 CVA 默认 bg-primary
    expect(confirm.classes()).toContain("bg-destructive");
    expect(confirm.classes()).toContain("text-destructive-foreground");
    expect(confirm.classes()).not.toContain("bg-primary");
  });

  it("cancel 按钮走 outline variant（border + bg-background）", () => {
    lastWrapper = mountDialog();

    const cancel = lastWrapper!.find('[data-fn="confirm-dialog-cancel"]');

    expect(cancel.classes()).toContain("border");
    expect(cancel.classes()).toContain("bg-background");
  });
});

// Phase 2e-2 —— 外层从手写 <Teleport>+遮罩+自挂 keydown 换成 <AlertDialog> 家族。
// 对外 props 一个字没改（上面 Phase 1.0 的 5 条锚原样通过就是证据），
// 这里锁的是**换底座后新拿到的东西**和**最容易写错的回调路径**。
describe("Phase 2e-2 — ConfirmDialog 走 AlertDialog 底座", () => {
  it("渲染 role=alertdialog 并挂上 aria-labelledby / aria-describedby", () => {
    lastWrapper = mountDialog();

    const content = lastWrapper!.find('[data-testid="confirm-dialog"]');
    expect(content.attributes("role")).toBe("alertdialog");

    const titleId = content.attributes("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(lastWrapper!.find(`#${titleId}`).text()).toBe("删除接样");

    const descId = content.attributes("aria-describedby");
    expect(descId).toBeTruthy();
    expect(lastWrapper!.find(`#${descId}`).text()).toBe("确认删除？");
  });

  it("点确认只调 onConfirm，不会连带触发 onCancel", async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    lastWrapper = mountDialog({ onConfirm, onCancel });

    await lastWrapper!.find('[data-fn="confirm-dialog-confirm"]').trigger("click");
    await flushPromises();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    // 确认键是普通 <Button> 不是 <AlertDialogAction>：它不参与 reka 的关闭流程，
    // 所以不会走 @update:open → onCancel。若改用 AlertDialogAction，
    // 这里会变成 onConfirm + onCancel 各一次，同时 loading 语义也没了。
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("点取消只调一次 onCancel（不是 @click 和 update:open 各一次）", async () => {
    const onCancel = vi.fn();
    lastWrapper = mountDialog({ onCancel });

    await lastWrapper!.find('[data-fn="confirm-dialog-cancel"]').trigger("click");
    await flushPromises();

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("ESC 调 onCancel（迁移前要自己挂 document keydown，现在 reka 自带）", async () => {
    const onCancel = vi.fn();
    lastWrapper = mountDialog({ onCancel });

    // DismissableLayer 挂载后再一拍才把 keydown 挂到 document
    await nextTick();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    await nextTick();
    await flushPromises();

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("loading 时 ESC 不放行，两个按钮都 disabled", async () => {
    const onCancel = vi.fn();
    lastWrapper = mountDialog({ onCancel, loading: true });

    await nextTick();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    await nextTick();
    await flushPromises();

    // 迁移前是 handleKey 里的 !props.loading 判断，
    // 现在靠 @escape-key-down 里 e.preventDefault()
    expect(onCancel).not.toHaveBeenCalled();

    const cancel = lastWrapper!.find('[data-fn="confirm-dialog-cancel"]');
    const confirm = lastWrapper!.find('[data-fn="confirm-dialog-confirm"]');
    expect((cancel.element as HTMLButtonElement).disabled).toBe(true);
    expect((confirm.element as HTMLButtonElement).disabled).toBe(true);
    expect(confirm.text()).toBe("处理中...");
  });

  it("没有第三个逃生门：只有取消 + 确认两个按钮", () => {
    lastWrapper = mountDialog();

    const content = lastWrapper!.find('[data-testid="confirm-dialog"]');
    expect(content.findAll("button").length).toBe(2);
  });
});
