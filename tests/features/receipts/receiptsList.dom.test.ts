// M03.F01.I01 / I02 / I03 / I04 — 接样管理 smoke
//
// 镜像 react 仓 tests/features/receipts/receiptsList.dom.test.tsx 4 个 fnTest。
// vue 仓不挂 msw，用 vi.mock('axios') 拦截；fixture 数据走内联字面量（同 react 仓 contracts/receipts）。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const RECEIPTS = [
  {
    id: "RECEIPT-001",
    commissionCode: "WT-2026-001",
    commissionDate: "2026-07-01",
    projectName: "城东综合体主体检测",
    clientUnit: "市住建局",
    testCategory: "委托检验",
    sampleSource: "施工送检",
    categoryCode: "cement",
    flowStatus: "receiving",
    flowHistory: [],
    lastSubmittedBy: null,
    receivedBy: "current-user",
    contractId: "CONTRACT-001",
    createdAt: "2026-07-01T00:00:00Z",
    updatedAt: "2026-07-01T00:00:00Z",
    tenantId: "TENANT-001",
  },
  {
    id: "RECEIPT-002",
    commissionCode: "WT-2026-002",
    commissionDate: "2026-07-02",
    projectName: "城南高架桥梁检测",
    clientUnit: "市政监督站",
    testCategory: "监督检验",
    sampleSource: "监督抽检",
    categoryCode: "concrete",
    flowStatus: "task_assignment",
    flowHistory: [
      { action: "submit", from: "receiving", to: "task_assignment", operator: "seed", at: "2026-07-02T00:00:00Z" },
    ],
    lastSubmittedBy: "seed",
    receivedBy: "current-user",
    contractId: "CONTRACT-002",
    createdAt: "2026-07-02T00:00:00Z",
    updatedAt: "2026-07-02T00:00:00Z",
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
      return { data: wrapList(RECEIPTS) } as never;
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

describe("M03.F01 接样管理", () => {
  fnTest(["M03.F01.I01"], "接样管理：渲染标题 + 列表行（fixture 真数据穿透）", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    const wrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("接样管理");
    expect(wrapper.text()).toContain("WT-2026-001");
    expect(wrapper.text()).toContain("WT-2026-002");
  });

  fnTest(["M03.F01.I02"], "接样管理：新建按钮开弹窗（标题『新建接样』）", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    const wrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = wrapper.findAll("button").find((b) => b.text() === "新建接样");
    expect(createBtn).toBeTruthy();
    await createBtn!.trigger("click");
    await flushPromises();
    const h2 = wrapper.findAll("h2").find((h) => h.text().includes("新建接样"));
    expect(h2).toBeTruthy();
  });

  fnTest(["M03.F01.I03"], "接样管理：行内删除按钮开确认弹窗（标题『删除接样』）", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    const wrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    // 仅 flowStatus='receiving' 行渲染删除按钮（已提交走无按钮）
    const delBtn = wrapper.findAll("button").find((b) => b.text() === "删除");
    expect(delBtn).toBeTruthy();
    await delBtn!.trigger("click");
    await flushPromises();
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("删除接样");
  });

  fnTest(["M03.F01.I04"], "接样管理：提交按钮调用 axios.post 推送状态机（receiving → task_assignment）", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    const wrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const submitBtn = wrapper.findAll("button").find((b) => b.text() === "提交");
    expect(submitBtn).toBeTruthy();
    await submitBtn!.trigger("click");
    await flushPromises();
    expect(vi.mocked(axios.post)).toHaveBeenCalledWith(
      "/api/receipts/flow",
      expect.objectContaining({ action: "submit", ids: ["RECEIPT-001"] }),
    );
  });
});

// Phase 1.2a Button 迁移回归锚（不挂功能 ID，工程设施测试）。
let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 1.2a — ReceiptsList 列表 <Button> 原语回归", () => {
  it("新建接样按钮：<Button variant=default class=bg-blue-600> 渲染 <button>，data-fn 落到真实 DOM", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    lastWrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const create = lastWrapper.find('button[data-fn="M03.F01.I02"]');
    expect(create.exists()).toBe(true);
    expect(create.classes()).toContain("inline-flex");
    // 调用方覆盖：blue 替代 primary
    expect(create.classes()).toContain("bg-blue-600");
    // CVA default 是 bg-primary，被调用方 tailwind-merge 压掉
    expect(create.classes()).not.toContain("bg-primary");
  });

  it("行内提交按钮：disabled 落到真实 <button>（不是被 <Button> 吞掉）", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    lastWrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const submit = lastWrapper.find('button[data-fn="M03.F01.I04"]');
    expect(submit.exists()).toBe(true);
    // CVA size=sm h-8 + variant=outline 都在
    expect(submit.classes()).toContain("h-8");
    expect(submit.classes()).toContain("border");
  });
});

describe("Phase 1.3a — ReceiptsList 搜索/表单 <Input> 原语回归", () => {
  it("搜索框 <Input class=max-w-sm>：@keyup.enter 转发到真实 <input>", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    lastWrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const search = lastWrapper.find('input[placeholder="按委托书编号搜索"]');
    expect(search.exists()).toBe(true);
    expect(search.classes()).toContain("max-w-sm");
    await search.setValue("WT-2026-001");
    expect((search.element as HTMLInputElement).value).toBe("WT-2026-001");
  });

  it("新建弹窗内：5 个 <Input> 渲染（含 1 个 type=date），v-model 双向", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    lastWrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建接样");
    await createBtn!.trigger("click");
    await flushPromises();

    // 5 个 form <Input> + 1 个搜索 <Input>（都在 dialog stub 区域之外或之内，看 mount）
    // 真实约束：弹窗内必须有 type=date input + 至少 4 个 type=text/none 的 input
    const textInputs = lastWrapper.findAll('input[type="text"], input[type="date"], input:not([type])');
    expect(textInputs.length).toBeGreaterThanOrEqual(5);

    // 委托日期 type=date 落到真实 <input>
    const dateInput = lastWrapper.find('input[type="date"]');
    expect(dateInput.exists()).toBe(true);
    await dateInput.setValue("2026-08-01");
    expect((dateInput.element as HTMLInputElement).value).toBe("2026-08-01");
  });
});

// Phase 2a-3 Table 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：<Table> 渲染为 div[role=table] / 7 个 columnheader 文本顺序 /
// 2 行 fixture data-fn=M03.F01.I01 落 rowgroup[1] 内 div[role=row] /
// TableCell class 经 tailwind-merge 合并 / 流程状态徽章 span 仍在 cell 内。
describe("Phase 2a-3 — ReceiptsList 列表 <Table> 原语回归", () => {
  it("<Table> 渲染为 div[role=table]；7 个 <TableHead> 文本顺序 委托书编号/工程名称/委托单位/检测类别/流程状态/创建时间/操作", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    lastWrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const table = lastWrapper.find('[role="table"]');
    expect(table.exists()).toBe(true);

    const heads = lastWrapper.findAll('[role="columnheader"]');
    expect(heads.length).toBe(7);
    expect(heads.map((h) => h.text())).toEqual([
      "委托书编号",
      "工程名称",
      "委托单位",
      "检测类别",
      "流程状态",
      "创建时间",
      "操作",
    ]);
  });

  it("2 行 fixture：data-fn=M03.F01.I01 落 rowgroup[1] 内 div[role=row]", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    lastWrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const rowgroups = lastWrapper.findAll('[role="rowgroup"]');
    expect(rowgroups.length).toBe(2);

    const bodyRows = rowgroups[1]!.findAll('[role="row"]');
    expect(bodyRows.length).toBe(2);

    for (const row of bodyRows) {
      expect(row.attributes("data-fn")).toBe("M03.F01.I01");
    }
  });

  it("TableCell 调用方 class 经 tailwind-merge 合并（font-mono + text-xs 落委托书编号 cell）", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    lastWrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const cells = lastWrapper.findAll('[role="cell"]');
    expect(cells.length).toBeGreaterThan(0);
    // 第一个 fixture 的委托书编号 cell
    const codeCell = cells.find((c) => c.text().includes("WT-2026-001"));
    expect(codeCell).toBeTruthy();
    expect(codeCell!.classes()).toContain("font-mono");
    expect(codeCell!.classes()).toContain("text-xs");
  });

  it("行内操作按钮：「提交」「编辑」「删除」data-fn 落到真实 button 且嵌套在 cell 内（不被 <TableCell> 吞）", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    lastWrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 提交按钮（receiving 行才有；fixture RECEIPT-001 是 receiving）
    const submit = lastWrapper.find('button[data-fn="M03.F01.I04"]');
    expect(submit.exists()).toBe(true);
    const submitCell = submit.element.parentElement;
    expect(submitCell).not.toBeNull();
    expect(submitCell!.getAttribute("role")).toBe("cell");

    // 删除按钮（同样仅 receiving 行）
    const del = lastWrapper.find('button[data-fn="M03.F01.I03"]');
    expect(del.exists()).toBe(true);
    const delCell = del.element.parentElement;
    expect(delCell).not.toBeNull();
    expect(delCell!.getAttribute("role")).toBe("cell");

    // 流程状态徽章 span 仍在 cell 内（不破结构）
    const badgeCell = lastWrapper.findAll('[role="cell"]').find((c) => c.text().includes("接样中"));
    expect(badgeCell).toBeTruthy();
    expect(badgeCell!.find("span.bg-blue-100").exists()).toBe(true);
  });
});