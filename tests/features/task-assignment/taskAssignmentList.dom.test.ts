// M03.F02.I01 / I02 — 任务分配 smoke
//
// 镜像 react 仓 tests/features/task-assignment/taskAssignmentList.dom.test.tsx 2 个 fnTest。
import { describe, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const RECEIPTS_IN_TASK_ASSIGNMENT = [
  {
    id: "RECEIPT-002",
    commissionCode: "WT-2026-002",
    projectName: "城南高架桥梁检测",
    flowStatus: "task_assignment",
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
      return { data: wrapList(RECEIPTS_IN_TASK_ASSIGNMENT) } as never;
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

describe("M03.F02 任务分配", () => {
  fnTest(["M03.F02.I01"], "任务分配：渲染标题 + 列表行（fixture 真数据穿透）", async () => {
    const { default: TaskAssignmentList } = await import("@/features/task-assignment/TaskAssignmentList.vue");
    const wrapper = mountWithProviders(TaskAssignmentList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("任务分配");
    expect(wrapper.text()).toContain("WT-2026-002");
  });

  fnTest(["M03.F02.I02"], "任务分配：安排按钮开弹窗（标题含『任务安排』）", async () => {
    const { default: TaskAssignmentList } = await import("@/features/task-assignment/TaskAssignmentList.vue");
    const wrapper = mountWithProviders(TaskAssignmentList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const arrangeBtn = wrapper.findAll("button").find((b) => b.text() === "安排");
    expect(arrangeBtn).toBeTruthy();
    await arrangeBtn!.trigger("click");
    await flushPromises();
    const h2 = wrapper.findAll("h2").find((h) => h.text().includes("任务安排 —"));
    expect(h2).toBeTruthy();
  });
});