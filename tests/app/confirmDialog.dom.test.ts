// Phase 1.0 — ConfirmDialog 内部 raw <button> → <Button> primitive 迁移冒烟。
//
// 锁三件事：
//   1. data-fn="confirm-dialog-cancel" / "confirm-dialog-confirm" 必须转发到真实 <button>
//      （Phase 0 的 $attrs 契约不回归）。
//   2. 两按钮拿到 Button.vue CVA 的基类 inline-flex（证明确实走 primitive，不是 raw）。
//   3. danger=true 触发 destructive 红底；danger=false 走 default 蓝底。
//
// 不挂功能 ID —— 这是 Phase 1 的工程迁移冒烟，不是业务用例。
import { describe, it, expect, afterEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";
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