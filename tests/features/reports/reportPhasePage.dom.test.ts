// M03.F05/F06/F07/F08 — 报告 4 阶段 smoke（镜像 react 仓 tests/features/reports/reportPhasePage.dom.test.tsx 8 个 fnTest）
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const RECEIPTS_BY_PHASE: Record<string, unknown[]> = {
  review: [
    {
      id: "R-REVIEW-001",
      commissionCode: "WT-RV-001",
      projectName: "城东综合体报告",
      flowStatus: "review",
      result: "pass",
      tenantId: "TENANT-001",
    },
  ],
  approval: [
    {
      id: "R-APPROVE-001",
      commissionCode: "WT-AP-001",
      projectName: "城南高架报告",
      flowStatus: "approval",
      result: "pass",
      tenantId: "TENANT-001",
    },
  ],
  issuance: [
    {
      id: "R-ISSUE-001",
      commissionCode: "WT-IS-001",
      projectName: "城西商住报告",
      flowStatus: "issuance",
      result: "pass",
      tenantId: "TENANT-001",
    },
  ],
  archived: [
    {
      id: "R-ARCHIVE-001",
      commissionCode: "WT-AR-001",
      projectName: "城北工厂报告",
      flowStatus: "archived",
      result: "pass",
      tenantId: "TENANT-001",
    },
  ],
};

function wrapList(arr: unknown[]): { items: unknown[]; page: number; pageSize: number; total: number } {
  return { items: arr, page: 1, pageSize: arr.length, total: arr.length };
}

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import axios from "axios";

function installAdapters(phase: string): void {
  vi.mocked(axios.get).mockImplementation(async (url: string) => {
    const u = String(url);
    if (u.includes("/api/receipts")) {
      return { data: wrapList(RECEIPTS_BY_PHASE[phase] ?? []) } as never;
    }
    return { data: wrapList([]) } as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const MOUNT_GLOBAL = {
  stubs: {
    teleport: { template: "<div data-teleport-stub><slot /></div>" },
  },
};

describe("M03.F05 报告审核", () => {
  beforeEach(() => installAdapters("review"));
  fnTest(["M03.F05.I01"], "报告审核：渲染标题 + 列表行（review 阶段 fixture 穿透）", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    const wrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("报告审核");
    expect(wrapper.text()).toContain("WT-RV-001");
  });
  fnTest(["M03.F05.I02"], "报告审核：「审核通过」按钮 data-fn 可见", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    const wrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const submitBtn = wrapper.findAll("button").find((b) => /审核通过/.test(b.text()));
    expect(submitBtn).toBeTruthy();
  });
});

describe("M03.F06 报告批准", () => {
  beforeEach(() => installAdapters("approval"));
  fnTest(["M03.F06.I01"], "报告批准：渲染标题 + 列表行（approval 阶段 fixture 穿透）", async () => {
    const { default: ReportApprovePage } = await import("@/pages/ReportApprovePage.vue");
    const wrapper = mountWithProviders(ReportApprovePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("报告批准");
    expect(wrapper.text()).toContain("WT-AP-001");
  });
  fnTest(["M03.F06.I02"], "报告批准：「批准」按钮 data-fn 可见", async () => {
    const { default: ReportApprovePage } = await import("@/pages/ReportApprovePage.vue");
    const wrapper = mountWithProviders(ReportApprovePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const submitBtn = wrapper.findAll("button").find((b) => /批准/.test(b.text()));
    expect(submitBtn).toBeTruthy();
  });
});

describe("M03.F07 报告发放", () => {
  beforeEach(() => installAdapters("issuance"));
  fnTest(["M03.F07.I01"], "报告发放：渲染标题 + 列表行（issuance 阶段 fixture 穿透）", async () => {
    const { default: ReportIssuePage } = await import("@/pages/ReportIssuePage.vue");
    const wrapper = mountWithProviders(ReportIssuePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("报告发放");
    expect(wrapper.text()).toContain("WT-IS-001");
  });
  fnTest(["M03.F07.I02"], "报告发放：「发放」按钮 data-fn 可见", async () => {
    const { default: ReportIssuePage } = await import("@/pages/ReportIssuePage.vue");
    const wrapper = mountWithProviders(ReportIssuePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const submitBtn = wrapper.findAll("button").find((b) => /发放/.test(b.text()));
    expect(submitBtn).toBeTruthy();
  });
});

describe("M03.F08 报告归档", () => {
  beforeEach(() => installAdapters("archived"));
  fnTest(["M03.F08.I01"], "报告归档：渲染标题 + 列表行（archived 阶段 fixture 穿透）", async () => {
    const { default: ReportArchivePage } = await import("@/pages/ReportArchivePage.vue");
    const wrapper = mountWithProviders(ReportArchivePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("报告归档");
    expect(wrapper.text()).toContain("WT-AR-001");
  });
  fnTest(["M03.F08.I02"], "报告归档：「归档完成」按钮 data-fn 可见", async () => {
    const { default: ReportArchivePage } = await import("@/pages/ReportArchivePage.vue");
    const wrapper = mountWithProviders(ReportArchivePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const submitBtn = wrapper.findAll("button").find((b) => /归档完成/.test(b.text()));
    expect(submitBtn).toBeTruthy();
  });
});
// Phase 1.2b Button 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：<Button> 底层仍是 <button>、data-fn 经 $attrs 落到真实 DOM、
// 行内退回走 link variant（无 h-8/px-3）+ text-destructive token、
// 「全选」仍是 raw <input type=checkbox>（Phase 1.3 才动，本 Phase 不许顺手迁）。
let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 1.2b — ReportPhasePage <Button> 原语回归", () => {
  beforeEach(() => installAdapters("review"));

  it("批量提交按钮：<Button variant=outline> 渲染 <button>，data-fn 落到真实 DOM，空选中时 disabled", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    lastWrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const submit = lastWrapper.find('button[data-fn="M03.F05.I02"]');
    expect(submit.exists()).toBe(true);
    expect(submit.element.tagName).toBe("BUTTON");
    expect(submit.classes()).toContain("inline-flex");
    expect(submit.classes()).toContain("border");
    expect((submit.element as HTMLButtonElement).disabled).toBe(true);
  });

  it("行内退回按钮：<Button variant=link class=text-destructive> 无 h-8/px-3，点击开退回弹窗", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    lastWrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const back = lastWrapper.findAll("button").find((b) => b.text() === "退回");
    expect(back).toBeTruthy();
    expect(back!.classes()).toContain("text-destructive");
    expect(back!.classes()).not.toContain("text-red-600");
    expect(back!.classes()).not.toContain("h-8");
    expect(back!.classes()).not.toContain("px-3");

    await back!.trigger("click");
    await flushPromises();
    const h2 = lastWrapper.findAll("h2").find((h) => h.text().includes("退回 —"));
    expect(h2).toBeTruthy();
    const confirm = lastWrapper.findAll("button").find((b) => b.text() === "确认退回");
    expect(confirm).toBeTruthy();
    expect(confirm!.classes()).toContain("inline-flex");
    expect(confirm!.classes()).toContain("bg-red-600");
  });

  it("「全选」仍是 raw <input type=checkbox>（Phase 1.3 才迁，Button 迁移不许顺手动它）", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    lastWrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const selectAll = lastWrapper.find('input[type="checkbox"][aria-label="全选"]');
    expect(selectAll.exists()).toBe(true);
    expect(selectAll.element.tagName).toBe("INPUT");
  });
});

// Phase 1.3b Input 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：搜索 <Input class=max-w-sm> @keyup.enter 落到真实 DOM；
// 退回弹窗 <Input> v-model 双向写回。
describe("Phase 1.3b — ReportPhasePage 搜索/退回弹窗 <Input> 原语回归", () => {
  beforeEach(() => installAdapters("review"));

  it("搜索框 <Input class=max-w-sm>：渲染 <input>，v-model 双向写回", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    lastWrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const search = lastWrapper.find('input[placeholder="按委托书编号搜索"]');
    expect(search.exists()).toBe(true);
    expect(search.classes()).toContain("max-w-sm");
    expect(search.classes()).toContain("h-9");
    await search.setValue("WT-RV-001");
    expect((search.element as HTMLInputElement).value).toBe("WT-RV-001");
  });

  it("退回弹窗 <Input>：v-model 写回 returnReason", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    lastWrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 开退回弹窗
    const back = lastWrapper.findAll("button").find((b) => b.text() === "退回");
    await back!.trigger("click");
    await flushPromises();

    const reasonInput = lastWrapper.find('input[placeholder="如：数据待补正"]');
    expect(reasonInput.exists()).toBe(true);
    expect(reasonInput.classes()).toContain("h-9");
    await reasonInput.setValue("数据待补正");
    expect((reasonInput.element as HTMLInputElement).value).toBe("数据待补正");
  });
});

// Phase 1.4 Label 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：退回弹窗的 <Label> 包 <Input> wrapping 模式保留。
describe("Phase 1.4 — ReportPhasePage 退回弹窗 <Label> 原语回归", () => {
  beforeEach(() => installAdapters("review"));

  it("<Label class=text-xs block mb-2> 包着退回原因 <input>（wrapping 模式保留）", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    lastWrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const back = lastWrapper.findAll("button").find((b) => b.text() === "退回");
    await back!.trigger("click");
    await flushPromises();

    const labels = lastWrapper.findAll("label");
    expect(labels.length).toBe(1);
    expect(labels[0].element.tagName).toBe("LABEL");
    expect(labels[0].text()).toContain("退回原因（可选）");
    // wrapping：<input> 是 <label> 的后代
    expect(labels[0].find('input[placeholder="如：数据待补正"]').exists()).toBe(true);
    expect(labels[0].classes()).toContain("text-xs");
    expect(labels[0].classes()).not.toContain("text-sm");
    expect(labels[0].classes()).toContain("mb-2");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
  });
});

// Phase 2a-3 Table 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：<Table> 渲染为 div[role=table] / 6 个 columnheader 文本顺序 /
// 行 data-fn=i01DataFn 落 rowgroup[1] 内 div[role=row] / TableCell 类经合并保留。
describe("Phase 2a-3 — ReportPhasePage 列表 <Table> 原语回归", () => {
  beforeEach(() => installAdapters("review"));

  it("<Table> 渲染为 div[role=table]；6 个 <TableHead> 文本顺序 含全选/委托书编号/工程名称/检测结果/流程状态/操作", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    lastWrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const table = lastWrapper.find('[role="table"]');
    expect(table.exists()).toBe(true);

    const heads = lastWrapper.findAll('[role="columnheader"]');
    expect(heads.length).toBe(6);
    // 全选 columnheader 文本为空（含 input checkbox），其余按顺序
    expect(heads[1].text()).toBe("委托书编号");
    expect(heads[2].text()).toBe("工程名称");
    expect(heads[3].text()).toBe("检测结果");
    expect(heads[4].text()).toBe("流程状态");
    expect(heads[5].text()).toBe("操作");
    // 全选 checkbox 仍在 columnheader 内（不被 <TableHead> 吞）
    expect(heads[0].find('input[type="checkbox"][aria-label="全选"]').exists()).toBe(true);
  });

  it("1 行 fixture：data-fn=i01DataFn 落 rowgroup[1] 内 div[role=row]", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    lastWrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const rowgroups = lastWrapper.findAll('[role="rowgroup"]');
    expect(rowgroups.length).toBe(2);

    const bodyRows = rowgroups[1]!.findAll('[role="row"]');
    expect(bodyRows.length).toBe(1);
    expect(bodyRows[0]!.attributes("data-fn")).toBe("M03.F05.I01");
  });

  it("TableCell 调用方 class 经 tailwind-merge 合并（font-mono + text-xs 落委托书编号 cell）", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    lastWrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const cells = lastWrapper.findAll('[role="cell"]');
    expect(cells.length).toBeGreaterThan(0);
    // 委托书编号 cell 含 WT-RV-001 + font-mono + text-xs
    const codeCell = cells.find((c) => c.text().includes("WT-RV-001"));
    expect(codeCell).toBeTruthy();
    expect(codeCell!.classes()).toContain("font-mono");
    expect(codeCell!.classes()).toContain("text-xs");
  });

  it("行内 checkbox / 「退回」按钮都落在 cell 内（不被 <TableCell> 吞）", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    lastWrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const back = lastWrapper.findAll("button").find((b) => b.text() === "退回");
    expect(back).toBeTruthy();
    const cell = back!.element.parentElement;
    expect(cell).not.toBeNull();
    expect(cell!.getAttribute("role")).toBe("cell");

    // 行 checkbox 也在 cell 内
    const rowCheckbox = lastWrapper.find('input[type="checkbox"][aria-label*="选择"]');
    expect(rowCheckbox.exists()).toBe(true);
    const rowCell = rowCheckbox.element.parentElement;
    expect(rowCell).not.toBeNull();
    expect(rowCell!.getAttribute("role")).toBe("cell");
  });
});
