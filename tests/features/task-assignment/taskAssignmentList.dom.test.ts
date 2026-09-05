// M03.F02.I01 / I02 — 任务分配 smoke
//
// 镜像 react 仓 tests/features/task-assignment/taskAssignmentList.dom.test.tsx 2 个 fnTest。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
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

// Phase 1.4 Label 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：wrapping 模式（<Label> 包 <Input>）不变 —— 隐式 label/input 关联仍靠
// 父子结构成立，点击 label 聚焦子 input 的 HTML 语义不丢。
describe("Phase 1.4 — TaskAssignmentList 弹窗 <Label> 原语回归", () => {
  it("2 个 <Label class=text-xs block> 各自包着一个真实 <input>（wrapping 模式保留）", async () => {
    const { default: TaskAssignmentList } = await import("@/features/task-assignment/TaskAssignmentList.vue");
    lastWrapper = mountWithProviders(TaskAssignmentList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    await lastWrapper.find('button[data-fn="M03.F02.I02"]').trigger("click");
    await flushPromises();

    const labels = lastWrapper.findAll('[data-teleport-stub] label');
    expect(labels.length).toBe(2);
    expect(labels[0].element.tagName).toBe("LABEL");
    expect(labels[0].text()).toContain("检测人员 *");
    // wrapping：<input> 是 <label> 的后代
    expect(labels[0].find("input").exists()).toBe(true);
    expect(labels[1].find('input[type="date"]').exists()).toBe(true);
    // tailwind-merge：调用方 text-xs 压掉基类 text-sm
    expect(labels[0].classes()).toContain("text-xs");
    expect(labels[0].classes()).not.toContain("text-sm");
    expect(labels[0].classes()).toContain("block");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
  });
});

// Phase 2a-2 Table 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁 3 件事：<Table> 渲染 div[role=table] / 6 <TableHead> 文本顺序 /
// 行内安排按钮 data-fn 落到真实 <button>。
describe("Phase 2a-2 — TaskAssignmentList 列表 <Table> 原语回归", () => {
  it("<Table> 渲染 div[role=table]；6 <TableHead> 文本顺序 委托书编号/工程名称/检测人员/计划日期/流程状态/操作", async () => {
    const { default: TaskAssignmentList } = await import("@/features/task-assignment/TaskAssignmentList.vue");
    lastWrapper = mountWithProviders(TaskAssignmentList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const table = lastWrapper.find('[role="table"]');
    expect(table.exists()).toBe(true);
    const heads = lastWrapper.findAll('[role="columnheader"]');
    expect(heads.length).toBe(6);
    expect(heads.map((h) => h.text())).toEqual([
      "委托书编号",
      "工程名称",
      "检测人员",
      "计划日期",
      "流程状态",
      "操作",
    ]);
  });

  it("1 fixture 行：行内安排按钮 data-fn 落到 div[role=row] 内 <button>，行在 rowgroup[1]", async () => {
    const { default: TaskAssignmentList } = await import("@/features/task-assignment/TaskAssignmentList.vue");
    lastWrapper = mountWithProviders(TaskAssignmentList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const bodyRows = lastWrapper.findAll('[role="rowgroup"]')[1]!.findAll('[role="row"]');
    expect(bodyRows.length).toBe(1);
    // 安排按钮 data-fn 落到真实 <button>，而非 div
    const arrangeBtn = lastWrapper.find('button[data-fn="M03.F02.I02"]');
    expect(arrangeBtn.exists()).toBe(true);
    expect(arrangeBtn.element.tagName).toBe("BUTTON");
  });

  it("TableCell 调用方 class 经 tailwind-merge 合并：委托书编号 cell 带 font-mono + text-xs", async () => {
    const { default: TaskAssignmentList } = await import("@/features/task-assignment/TaskAssignmentList.vue");
    lastWrapper = mountWithProviders(TaskAssignmentList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const codeCell = lastWrapper.findAll('[role="rowgroup"]')[1]!
      .findAll('[role="row"]')[0]!
      .findAll('[role="cell"]')[0];
    expect(codeCell.exists()).toBe(true);
    expect(codeCell.classes()).toContain("font-mono");
    expect(codeCell.classes()).toContain("text-xs");
  });
});

// Phase 2e-3 batch 2 —— 任务安排弹窗从手写 <Teleport>+遮罩 div 换成 <Dialog> 家族。
// 锁「换底座后新拿到的东西」+「@entry / data-fn 这类 L5 锚点没被结构改动吞掉」。
describe("Phase 2e-3 — TaskAssignmentList 安排弹窗走 Dialog 底座", () => {
  async function openAssign(): Promise<VueWrapper> {
    const { default: TaskAssignmentList } = await import(
      "@/features/task-assignment/TaskAssignmentList.vue"
    );
    lastWrapper = mountWithProviders(TaskAssignmentList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    await lastWrapper.find('button[data-fn="M03.F02.I02"]').trigger("click");
    await flushPromises();
    return lastWrapper;
  }

  it("弹窗渲染 div[role=dialog]，标题/描述经 reka context 连上 aria", async () => {
    const w = await openAssign();

    const content = w.find('[role="dialog"]');
    expect(content.exists()).toBe(true);

    const titleId = content.attributes("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(w.find(`#${titleId}`).text()).toBe("任务安排 — WT-2026-002");

    const descId = content.attributes("aria-describedby");
    expect(descId).toBeTruthy();
    expect(w.find(`#${descId}`).text()).toContain("指定检测人员与计划检测日期");
  });

  it("行内安排键的 data-fn 没被结构改动吞掉，仍落在真实 <button> 上且弹窗外只有一个", async () => {
    const w = await openAssign();

    const anchors = w.findAll('button[data-fn="M03.F02.I02"]');
    expect(anchors.length).toBe(1);
    expect(anchors[0]!.element.tagName).toBe("BUTTON");
    expect(anchors[0]!.text()).toBe("安排");
    // 弹窗内没有多出同 data-fn 的按钮（保存键本来就不带锚点）
    expect(w.find('[role="dialog"]').findAll('button[data-fn="M03.F02.I02"]').length).toBe(0);
  });

  it("ESC 关闭弹窗（走 @update:open → assignTarget = null）", async () => {
    const w = await openAssign();
    expect(w.find('[role="dialog"]').exists()).toBe(true);

    await nextTick();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    await nextTick();
    await flushPromises();

    expect(w.find('[role="dialog"]').exists()).toBe(false);
  });
});
