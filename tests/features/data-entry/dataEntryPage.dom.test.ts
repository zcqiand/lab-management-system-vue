// M03.F03.I01 / I02 / I03 — 数据录入 smoke
//
// 镜像 react 仓 tests/features/data-entry/dataEntryPage.dom.test.tsx 3 个 fnTest。
// vue 仓走 vi.mock('axios') + 内联 fixtures（与 Batch 2A/2B-1 同型）。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const RECEIPTS_IN_DATA_ENTRY = [
  {
    id: "RECEIPT-003",
    commissionCode: "WT-2026-003",
    projectName: "城西商住综合体",
    assigneeName: "张三",
    plannedTestDate: "2026-07-15",
    flowStatus: "data_entry",
    categoryCode: "cement",
    createdAt: "2026-07-10T00:00:00Z",
    updatedAt: "2026-07-15T00:00:00Z",
    tenantId: "TENANT-001",
  },
];

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

function installAdapters(): void {
  vi.mocked(axios.get).mockImplementation(async (url: string) => {
    const u = String(url);
    if (u.includes("/api/receipts")) {
      return { data: wrapList(RECEIPTS_IN_DATA_ENTRY) } as never;
    }
    if (u.includes("/api/samples")) {
      return { data: { items: [{ id: "S-1", sampleCode: "S-001" }] } } as never;
    }
    if (u.includes("/api/inspection-parameters")) {
      return { data: { items: [{ code: "P-001", name: "抗压强度" }] } } as never;
    }
    if (u.includes("/api/test-records")) {
      return { data: { items: [] } } as never;
    }
    return { data: wrapList([]) } as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  installAdapters();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const MOUNT_GLOBAL = {
  stubs: {
    teleport: { template: "<div data-teleport-stub><slot /></div>" },
  },
};

describe("M03.F03 数据录入", () => {
  fnTest(["M03.F03.I01"], "数据录入：渲染标题 + 列表行（fixture 真数据穿透）", async () => {
    const { default: DataEntryPage } = await import("@/features/data-entry/DataEntryPage.vue");
    const wrapper = mountWithProviders(DataEntryPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("数据录入");
    expect(wrapper.text()).toContain("WT-2026-003");
  });

  fnTest(["M03.F03.I03"], "数据录入：行内「录入结果」按钮（人工改判 verdict 入口）", async () => {
    const { default: DataEntryPage } = await import("@/features/data-entry/DataEntryPage.vue");
    const wrapper = mountWithProviders(DataEntryPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const entryBtn = wrapper.findAll("button").find((b) => b.text() === "录入结果");
    expect(entryBtn).toBeTruthy();
    await entryBtn!.trigger("click");
    await flushPromises();
    // 弹窗标题含 commissionCode
    const h2 = wrapper.findAll("h2").find((h) => h.text().includes("录入结果 —"));
    expect(h2).toBeTruthy();
  });

  fnTest(["M03.F03.I02"], "数据录入：弹窗内「保存检测记录」按钮（M03.F03.I02 data-fn 锚点）", async () => {
    const { default: DataEntryPage } = await import("@/features/data-entry/DataEntryPage.vue");
    const wrapper = mountWithProviders(DataEntryPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const entryBtn = wrapper.findAll("button").find((b) => b.text() === "录入结果");
    await entryBtn!.trigger("click");
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const saveBtn = wrapper.findAll("button").find((b) => b.text() === "保存");
    expect(saveBtn).toBeTruthy();
  });
});
// Phase 1.2b Button 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：<Button> 底层仍是 <button>、data-fn 经 $attrs 落到真实 DOM、
// CVA base inline-flex 活着、调用方蓝色定制经 tailwind-merge 压过 bg-primary。
let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 1.2b — DataEntryPage <Button> 原语回归", () => {
  it("行内录入结果按钮：<Button variant=outline size=sm> 渲染 <button>，data-fn 落到真实 DOM", async () => {
    const { default: DataEntryPage } = await import("@/features/data-entry/DataEntryPage.vue");
    lastWrapper = mountWithProviders(DataEntryPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const entry = lastWrapper.find('button[data-fn="M03.F03.I03"]');
    expect(entry.exists()).toBe(true);
    expect(entry.element.tagName).toBe("BUTTON");
    expect(entry.classes()).toContain("inline-flex");
    expect(entry.classes()).toContain("border");
  });

  it("弹窗保存按钮：data-fn 落到真实 <button>，bg-blue-600 压过 CVA bg-primary", async () => {
    const { default: DataEntryPage } = await import("@/features/data-entry/DataEntryPage.vue");
    lastWrapper = mountWithProviders(DataEntryPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    await lastWrapper.find('button[data-fn="M03.F03.I03"]').trigger("click");
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const save = lastWrapper.find('button[data-fn="M03.F03.I02"]');
    expect(save.exists()).toBe(true);
    expect(save.classes()).toContain("inline-flex");
    expect(save.classes()).toContain("bg-blue-600");
    expect(save.classes()).not.toContain("bg-primary");

    const cancel = lastWrapper.findAll("button").find((b) => b.text() === "取消");
    expect(cancel).toBeTruthy();
    expect(cancel!.classes()).toContain("border");
  });
});

// Phase 1.3c Input 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：搜索 <Input class=max-w-sm> 渲染真实 <input> + v-model 双向写回 +
// placeholder/@keyup.enter 经 $attrs 落到真实 DOM。
describe("Phase 1.3c — DataEntryPage 搜索 <Input> 原语回归", () => {
  it("搜索框 <Input class=max-w-sm>：渲染 <input>，placeholder/@keyup.enter 落 DOM", async () => {
    const { default: DataEntryPage } = await import("@/features/data-entry/DataEntryPage.vue");
    lastWrapper = mountWithProviders(DataEntryPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const search = lastWrapper.find('input[placeholder="按委托书编号搜索"]');
    expect(search.exists()).toBe(true);
    // 调用方 max-w-sm + bg-white 仍生效
    expect(search.classes()).toContain("max-w-sm");
    expect(search.classes()).toContain("bg-white");
    // CVA base h-9 活着
    expect(search.classes()).toContain("h-9");
    // v-model 双向写回
    await search.setValue("WT-2026");
    expect((search.element as HTMLInputElement).value).toBe("WT-2026");
  });
});

// Phase 1.4 Label 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：录入弹窗 2 个 <Label> 包着 <Select> 触发器（reka-ui SelectRoot 在 label 内，
// SelectTrigger 渲染为 <button role="combobox">，是 <label> 的后代）。
// wrapping 模式与 text-xs 字号都不回归。
describe("Phase 1.4 — DataEntryPage 录入弹窗 <Label> 原语回归", () => {
  it("2 个 <Label class=text-xs block> 各自包着 <Select> 触发器（wrapping 模式保留）", async () => {
    const { default: DataEntryPage } = await import("@/features/data-entry/DataEntryPage.vue");
    lastWrapper = mountWithProviders(DataEntryPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    await lastWrapper.find('button[data-fn="M03.F03.I03"]').trigger("click");
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const labels = lastWrapper.findAll("label");
    expect(labels.length).toBe(2);
    expect(labels[0].element.tagName).toBe("LABEL");
    expect(labels[0].text()).toContain("样品");
    expect(labels[1].text()).toContain("检测参数");
    // Phase 2d-1：<Select> 触发器渲染为 <button role="combobox">，是 <label> 的后代
    expect(labels[0].find('[role="combobox"]').exists()).toBe(true);
    expect(labels[1].find('[role="combobox"]').exists()).toBe(true);
    // tailwind-merge：调用方 text-xs 压掉基类 text-sm
    expect(labels[0].classes()).toContain("text-xs");
    expect(labels[0].classes()).not.toContain("text-sm");
    expect(labels[0].classes()).toContain("block");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
  });
});

// Phase 2a-4 Table 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：待录入接样单表 raw <table> → <Table> 6 原语后 role 语义齐全、
// 6 列头顺序不变、行内 router-link / 「录入结果」按钮仍嵌在 cell 内、
// 空态行 colspan 保留在真实 div 上。
describe("Phase 2a-4 — DataEntryPage <Table> 原语回归", () => {
  it("待录入接样单表：div[role=table] + 6 列头 + 行内按钮嵌在 cell 内", async () => {
    const { default: DataEntryPage } = await import("@/features/data-entry/DataEntryPage.vue");
    lastWrapper = mountWithProviders(DataEntryPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const table = lastWrapper.find('[role="table"]');
    expect(table.exists()).toBe(true);
    expect(table.element.tagName).toBe("DIV");

    expect(lastWrapper.findAll('[role="columnheader"]').map((h) => h.text())).toEqual([
      "委托书编号",
      "工程名称",
      "检测人员",
      "计划日期",
      "流程状态",
      "操作",
    ]);

    const rowgroups = lastWrapper.findAll('[role="rowgroup"]');
    expect(rowgroups.length).toBe(2);
    const bodyRows = rowgroups[1]!.findAll('[role="row"]');
    expect(bodyRows.length).toBe(1);
    const cells = bodyRows[0]!.findAll('[role="cell"]');
    expect(cells.length).toBe(6);
    // 委托书编号 cell 里仍是 router-link（<a>），没被 slot 吞
    expect(cells[0]!.find("a").exists()).toBe(true);
    expect(cells[0]!.text()).toContain("WT-2026-003");
    // 「录入结果」按钮的 data-fn 落到真实 <button>，且嵌在最后一个 cell 内
    const btn = cells[5]!.find('button[data-fn="M03.F03.I03"]');
    expect(btn.exists()).toBe(true);
    expect(btn.text()).toBe("录入结果");
  });
});
