// M03.F01.I01 / I02 / I03 / I04 — 接样管理 smoke
//
// 镜像 react 仓 tests/features/receipts/receiptsList.dom.test.tsx 4 个 fnTest。
// vue 仓不挂 msw，用 vi.mock('axios') 拦截；fixture 数据走内联字面量（同 react 仓 contracts/receipts）。
import { describe, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
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