// M03.F02.I01 / I02 — 任务分配 smoke
//
// 镜像 react 仓 tests/features/task-assignment/taskAssignmentList.dom.test.tsx 2 个 fnTest。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
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
// Phase 1.2b Button 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：<Button> 底层仍是 <button>（原 findAll("button") selector 零回归）、
// data-fn 经 $attrs 落到真实 DOM、CVA base inline-flex 活着、调用方 class 经
// tailwind-merge 压过 CVA 默认值。
let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 1.2b — TaskAssignmentList <Button> 原语回归", () => {
  it("行内安排按钮：<Button variant=outline size=sm> 渲染 <button>，data-fn 落到真实 DOM", async () => {
    const { default: TaskAssignmentList } = await import("@/features/task-assignment/TaskAssignmentList.vue");
    lastWrapper = mountWithProviders(TaskAssignmentList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const arrange = lastWrapper.find('button[data-fn="M03.F02.I02"]');
    expect(arrange.exists()).toBe(true);
    expect(arrange.element.tagName).toBe("BUTTON");
    expect(arrange.classes()).toContain("inline-flex");
    expect(arrange.classes()).toContain("border");
  });

  it("弹窗保存按钮：<Button variant=default class=bg-blue-600> 压过 CVA bg-primary，disabled 落到真实 DOM", async () => {
    const { default: TaskAssignmentList } = await import("@/features/task-assignment/TaskAssignmentList.vue");
    lastWrapper = mountWithProviders(TaskAssignmentList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    await lastWrapper.find('button[data-fn="M03.F02.I02"]').trigger("click");
    await flushPromises();

    const save = lastWrapper.findAll("button").find((b) => b.text() === "保存");
    expect(save).toBeTruthy();
    expect(save!.classes()).toContain("inline-flex");
    expect(save!.classes()).toContain("bg-blue-600");
    expect(save!.classes()).not.toContain("bg-primary");
    // assigneeName 为空 → disabled 必须落到真实 <button>
    expect((save!.element as HTMLButtonElement).disabled).toBe(true);

    const cancel = lastWrapper.findAll("button").find((b) => b.text() === "取消");
    expect(cancel).toBeTruthy();
    expect(cancel!.classes()).toContain("border");
  });
});

// Phase 1.3b Input 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：搜索 <Input> @keyup.enter 落到真实 DOM；
// 弹窗 2 个 form <Input>：检测人员 字符串 + 计划日期 type=date。
describe("Phase 1.3b — TaskAssignmentList 搜索/弹窗 <Input> 原语回归", () => {
  it("搜索框 <Input class=max-w-sm>：渲染 <input>，v-model 双向写回", async () => {
    const { default: TaskAssignmentList } = await import("@/features/task-assignment/TaskAssignmentList.vue");
    lastWrapper = mountWithProviders(TaskAssignmentList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const search = lastWrapper.find('input[placeholder="按委托书编号搜索"]');
    expect(search.exists()).toBe(true);
    expect(search.classes()).toContain("max-w-sm");
    expect(search.classes()).toContain("h-9");
    await search.setValue("WT-2026-002");
    expect((search.element as HTMLInputElement).value).toBe("WT-2026-002");
  });

  it("弹窗 2 个 form <Input>：检测人员 字符串 + 计划日期 type=date 落 DOM", async () => {
    const { default: TaskAssignmentList } = await import("@/features/task-assignment/TaskAssignmentList.vue");
    lastWrapper = mountWithProviders(TaskAssignmentList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    await lastWrapper.find('button[data-fn="M03.F02.I02"]').trigger("click");
    await flushPromises();

    const dialogInputs = lastWrapper.findAll('[data-teleport-stub] input:not([type="checkbox"])');
    expect(dialogInputs.length).toBe(2);

    // 检测人员 placeholder 落到真实 DOM
    const nameInput = lastWrapper.find('input[placeholder="如：张三"]');
    expect(nameInput.exists()).toBe(true);
    await nameInput.setValue("张三");
    expect((nameInput.element as HTMLInputElement).value).toBe("张三");

    // 计划日期 type=date
    const dateInput = lastWrapper.find('[data-teleport-stub] input[type="date"]');
    expect(dateInput.exists()).toBe(true);
    expect(dateInput.attributes("type")).toBe("date");
  });
});
