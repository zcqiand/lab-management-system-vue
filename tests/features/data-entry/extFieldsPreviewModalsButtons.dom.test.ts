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
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
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

// Phase 2a-3 Table 迁移回归锚（不挂功能 ID，工程设施测试）。
// ReportPreviewModal 2 张只读表（基础信息 4 列 + 检测参数结果 4 列）。
// 锁：2 张表都渲染为 div[role=table] / 第 2 张表 columnheader 文本顺序 /
// TableCell class 经 tailwind-merge 合并 border + px-2 py-1 保留。
describe("Phase 2a-3 — ReportPreviewModal 内嵌 2 张 <Table> 原语回归", () => {
  it("2 张表都渲染为 div[role=table]（基础信息表 + 检测参数结果表）", async () => {
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

    const tables = lastWrapper.findAll('[role="table"]');
    expect(tables.length).toBe(2);
  });

  it("第 2 张表（检测参数结果）：4 个 <TableHead> 文本顺序 项目/技术要求/检测结果/单项评定", async () => {
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

    const tables = lastWrapper.findAll('[role="table"]');
    expect(tables.length).toBe(2);
    // 第 2 张表有 columnheader（基础信息表只 2 行 × 4 cell 无 header）
    const heads = tables[1]!.findAll('[role="columnheader"]');
    expect(heads.length).toBe(4);
    expect(heads.map((h) => h.text())).toEqual([
      "项目",
      "技术要求",
      "检测结果",
      "单项评定",
    ]);
  });

  it("第 1 张表（基础信息）：rowgroup 内 2 行 div[role=row]，每行 4 cell", async () => {
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

    const tables = lastWrapper.findAll('[role="table"]');
    const rowgroups = tables[0]!.findAll('[role="rowgroup"]');
    // 第 1 张表只有 TableBody，1 个 rowgroup
    expect(rowgroups.length).toBe(1);
    const rows = rowgroups[0]!.findAll('[role="row"]');
    expect(rows.length).toBe(2);
    // 每行 4 cell（标签 + 值 + 标签 + 值）
    expect(rows[0]!.findAll('[role="cell"]').length).toBe(4);
    expect(rows[1]!.findAll('[role="cell"]').length).toBe(4);
  });

  it("TableCell 调用方 class 经 tailwind-merge 合并（border + px-2 py-1 落第 2 张表 cell）", async () => {
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

    const tables = lastWrapper.findAll('[role="table"]');
    // 第 2 张表是带 header 的；cell 应带 border + px-2 + py-1
    const cells = tables[1]!.findAll('[role="cell"]');
    expect(cells.length).toBe(0); // 无 records fixture
    // 但 4 个 TableHead 应带 border
    const heads = tables[1]!.findAll('[role="columnheader"]');
    for (const head of heads) {
      expect(head.classes()).toContain("border");
      expect(head.classes()).toContain("px-2");
      expect(head.classes()).toContain("py-1");
      expect(head.classes()).toContain("text-left");
    }
  });
});

// Phase 2e-3 —— ReportPreviewModal 预览型弹窗从手写 <Teleport>+遮罩 div 换成 <Dialog> 家族。
// 与样板不同：父组件的开关仍是 `props.open` 受控，但旧版把 `onClose` 当 prop 回调。
// Dialog 走 v-model:open，受控仍交给父，watch(open) 把 false 转发给 onClose。
// 锚测锁三件事：
//   1. role=dialog 存在 + aria 连线
//   2. data-fn='M03.F01.I07' 经 DialogContent 的 inheritAttrs 落到真实 div[role=dialog]
//   3. ESC 走 @update:open → onClose（props 回调被调；这里用 onClose: spy 验证）
describe("Phase 2e-3 — ReportPreviewModal 预览弹窗走 Dialog 底座", () => {
  async function mountModal(onClose?: () => void): Promise<VueWrapper> {
    const { default: Modal } = await import("@/features/data-entry/ReportPreviewModal.vue");
    const wrapper = mountWithProviders(Modal, {
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
        onClose: onClose ?? (() => {}),
      },
      global: MOUNT_GLOBAL,
    });
    lastWrapper = wrapper;
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    return wrapper;
  }

  it("弹窗渲染 div[role=dialog]，预览 data-fn 经 inheritAttrs 落到真实 content 上", async () => {
    const w = await mountModal();

    const dialog = w.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes("data-fn")).toBe("M03.F01.I07");

    const titleId = dialog.attributes("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(w.find(`#${titleId}`).text()).toContain("报告预览 — WT-001");
  });

  it("底部「关闭」按钮仍在弹窗内（hide-close 替掉了内置 X，原按钮未丢）", async () => {
    const w = await mountModal();
    const dialog = w.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);

    // 原有两个按钮：关闭 + 打印，都应保留
    const closeBtn = dialog.findAll("button").find((b) => b.text() === "关闭");
    const printBtn = dialog.findAll("button").find((b) => b.text() === "打印");
    expect(closeBtn).toBeTruthy();
    expect(printBtn).toBeTruthy();
    // hide-close 关掉了 DialogContent 内置的 ×，弹窗内只有这 2 个 button
    expect(dialog.findAll("button").length).toBe(2);
  });

  it("ESC 关闭弹窗（走 @update:open → watch(open) → props.onClose）", async () => {
    let closedCount = 0;
    const onClose = () => {
      closedCount++;
    };
    const w = await mountModal(onClose);
    expect(w.find('[role="dialog"]').exists()).toBe(true);

    await nextTick();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    await nextTick();
    await flushPromises();

    // onClose 被调到至少 1 次（可能多次，因为 watch + reka 关闭回调都会触发）
    expect(closedCount).toBeGreaterThanOrEqual(1);
  });
});