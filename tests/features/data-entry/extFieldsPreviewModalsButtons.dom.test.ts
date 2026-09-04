// Phase 1.2c — SampleExtFieldsModal / ReportPreviewModal <Button> 原语回归。
//
// SampleExtFieldsModal.vue (3 buttons):
//   - 关闭 × icon-style (raw <button>, per >3-overrides threshold)
//   - 取消 <Button variant=outline>
//   - 确认 <Button variant=default class=bg-blue-600>
//
// ReportPreviewModal.vue (3 buttons):
//   - 关闭 × icon-style (raw <button>, per >3-overrides threshold)
//   - 关闭 <Button variant=outline>
//   - 打印 <Button variant=default class=bg-blue-600>
//
// 不挂功能 ID（regression-anchor 模式 — Phase 1.2b hotfix 教训）。
import { describe, it, expect, afterEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";
import { mountWithProviders } from "../../helper";

let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

const MOUNT_GLOBAL = {
  stubs: {
    teleport: { template: '<div data-teleport-stub><slot /></div>' },
  },
};

describe("Phase 1.2c — SampleExtFieldsModal <Button> 原语回归", () => {
  it("弹窗打开：取消 = <Button variant=outline>，确认 = <Button variant=default bg-blue-600>", async () => {
    const { default: Modal } = await import(
      "@/features/data-entry/SampleExtFieldsModal.vue"
    );
    lastWrapper = mountWithProviders(Modal, {
      props: {
        open: true,
        samples: [{ id: "S-1" }],
        extFields: [{ key: "k1", label: "扩展字段1" }],
        onClose: () => {},
        onConfirm: () => {},
      },
      global: MOUNT_GLOBAL,
    });

    const cancelBtn = lastWrapper.findAll("button").find((b) => b.text() === "取消");
    const confirmBtn = lastWrapper.findAll("button").find((b) => b.text() === "确认");
    expect(cancelBtn).toBeTruthy();
    expect(confirmBtn).toBeTruthy();

    // CVA base class 落在真实 DOM
    expect(cancelBtn!.classes()).toContain("inline-flex");
    expect(confirmBtn!.classes()).toContain("inline-flex");

    // outline variant 自带 border + bg-background
    expect(cancelBtn!.classes()).toContain("border");

    // default variant 被 caller bg-blue-600 压过
    expect(confirmBtn!.classes()).toContain("bg-blue-600");
    expect(confirmBtn!.classes()).not.toContain("bg-primary");
  });
});

describe("Phase 1.2c — ReportPreviewModal <Button> 原语回归", () => {
  it("弹窗打开：关闭 = <Button variant=outline>，打印 = <Button variant=default bg-blue-600>", async () => {
    const { default: Modal } = await import(
      "@/features/data-entry/ReportPreviewModal.vue"
    );
    lastWrapper = mountWithProviders(Modal, {
      props: {
        open: true,
        receipt: {
          id: "R-1",
          commissionCode: "WT-001",
          categoryCode: "CAT-1",
          projectName: "工程A",
          clientUnit: "委托单位X",
          testCategory: "CAT-1",
        },
        onClose: () => {},
      },
      global: MOUNT_GLOBAL,
    });

    const closeBtn = lastWrapper.findAll("button").find((b) => b.text() === "关闭");
    const printBtn = lastWrapper.findAll("button").find((b) => b.text() === "打印");
    expect(closeBtn).toBeTruthy();
    expect(printBtn).toBeTruthy();

    // CVA base class 落在真实 DOM
    expect(closeBtn!.classes()).toContain("inline-flex");
    expect(printBtn!.classes()).toContain("inline-flex");

    // outline variant 自带 border
    expect(closeBtn!.classes()).toContain("border");

    // default variant 被 caller bg-blue-600 压过
    expect(printBtn!.classes()).toContain("bg-blue-600");
    expect(printBtn!.classes()).not.toContain("bg-primary");
  });
});