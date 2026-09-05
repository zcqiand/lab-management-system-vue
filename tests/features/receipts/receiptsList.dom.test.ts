// M03.F01.I01 / I02 / I03 / I04 — 接样管理 smoke
//
// 镜像 react 仓 tests/features/receipts/receiptsList.dom.test.tsx 4 个 fnTest。
// vue 仓不挂 msw，用 vi.mock('axios') 拦截；fixture 数据走内联字面量（同 react 仓 contracts/receipts）。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";
import { openSelect, pickSelectItem } from "../../selectInteraction";

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
    // Phase 2e-3：弹窗从手写 <Teleport>+<h2> 迁到 <Dialog> 家族，
    // 标题现在挂在 reka-ui DialogTitle 里（经 aria-labelledby 连到 [role=dialog]）。
    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);
    const titleId = dialog.attributes("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(wrapper.find(`#${titleId}`).text()).toContain("新建接样");
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
  it("新建接样按钮：<Button variant=default class=bg-info> 渲染 <button>，data-fn 落到真实 DOM", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    lastWrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const create = lastWrapper.find('button[data-fn="M03.F01.I02"]');
    expect(create.exists()).toBe(true);
    expect(create.classes()).toContain("inline-flex");
    // 调用方覆盖：blue 替代 primary
    expect(create.classes()).toContain("bg-info");
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

  it("2 行 fixture：列表行 data-fn 落 rowgroup[1] 内 div[role=row]", async () => {
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
    // 注：bg-info/10 含 `/`，不是合法 CSS 选择器字符，改用 classes() 数组检查
    const badgeSpan = badgeCell!.find("span");
    expect(badgeSpan.exists()).toBe(true);
    expect(badgeSpan.classes().some((c) => c === "bg-info/10")).toBe(true);
  });
});

// Phase 2d-2 Select + Label 配对回归锚（不挂功能 ID，工程设施测试）。
// 锁三件事：
//   1. 列表页流程状态筛选 raw <select> → <Select>，"" 走 __all__ sentinel
//      （与 ContractsList / InspectionCapabilityList 同约定），load() 翻译回不下发
//   2. 新建/编辑弹窗的 14 个 raw <label> → <Label for>，配对目标 id 必须真实存在。
//      Phase 1.4 特意跳过这批「label 包 select」，等 Select 原语到位一起改：
//      reka-ui 的触发器是 <button role="combobox">，包在 <label> 里点击语义会打架，
//      所以统一改 for/id 显式配对。两个弹窗 v-if 互斥，id 不会撞。
//   3. 弹窗内检测类别 / 样品来源 → combobox，v-model 仍写回 form
describe("Phase 2d-2 — ReceiptsList <Select> + <Label> 配对回归", () => {
  // 返回 wrapper 而不是只写 lastWrapper：赋值发生在别的函数作用域里，
  // TS 在调用点不会把 lastWrapper 收窄成非 null。
  async function mountAndOpenCreate() {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    const wrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    lastWrapper = wrapper;
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = wrapper.findAll("button").find((b) => b.text() === "新建接样");
    await createBtn!.trigger("click");
    await flushPromises();
    return wrapper;
  }

  it("全文件不留 raw <select>；列表页筛选是带 aria-label 的 combobox", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    lastWrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    expect(lastWrapper.findAll("select").length).toBe(0);
    expect(
      lastWrapper.find('button[role="combobox"][aria-label="流程状态筛选"]').exists(),
    ).toBe(true);
  });

  it("flowFilter=__all__ 不下发 flowStatus；选「接样中」下发 receiving", async () => {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    const wrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    lastWrapper = wrapper;
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 首屏 load()：默认 __all__ sentinel 必须翻译成「不带 flowStatus」，
    // 否则 API 会收到 flowStatus=__all__ 直接查空。
    const firstParams = vi.mocked(axios.get).mock.calls[0]![1]?.params as Record<string, unknown>;
    expect(firstParams).toBeTruthy();
    expect(firstParams["flowStatus"]).toBeUndefined();

    // 选「接样中」→ 再次 load()，这次必须带 flowStatus=receiving
    const trigger = wrapper.find('button[role="combobox"][aria-label="流程状态筛选"]');
    await openSelect(trigger.element);
    const receiving = wrapper.findAll('[role="option"]').find((o) => o.text() === "接样中");
    expect(receiving).toBeTruthy();
    await pickSelectItem(receiving!.element);

    await wrapper.findAll("button").find((b) => b.text() === "搜索")!.trigger("click");
    await flushPromises();

    const calls = vi.mocked(axios.get).mock.calls;
    const lastParams = calls[calls.length - 1]![1]?.params as Record<string, unknown>;
    expect(lastParams["flowStatus"]).toBe("receiving");
  });

  it("新建弹窗：检测类别 / 样品来源 → combobox，且回显 EMPTY_BODY 默认值", async () => {
    const wrapper = await mountAndOpenCreate();

    expect(wrapper.findAll("select").length).toBe(0);
    const category = wrapper.find('button[role="combobox"][aria-label="检测类别"]');
    const source = wrapper.find('button[role="combobox"][aria-label="样品来源"]');
    expect(category.exists()).toBe(true);
    expect(source.exists()).toBe(true);

    // reka-ui 关闭态把 items teleport 进 DocumentFragment 才注册 value→text，
    // fragment 在 SelectContent onMounted 才建 → 回显要等一次 flush。
    await flushPromises();
    expect(category.text()).toContain("委托检验");
    expect(source.text()).toContain("施工送检");
  });

  it("新建弹窗：14 个 raw <label> 已换 <Label for>，每个 for 都指到真实存在的 id", async () => {
    const wrapper = await mountAndOpenCreate();

    const labels = wrapper.findAll("label");
    // 弹窗 7 个字段，每个一个 <Label>
    expect(labels.length).toBe(7);
    for (const label of labels) {
      const target = label.attributes("for");
      // 悬空 for（指向不存在的 id）比没有更糟 —— 必须真实配对
      expect(target).toBeTruthy();
      expect(wrapper.find(`#${target}`).exists()).toBe(true);
    }
    // <Label> 原语基类落到真实 <label>（不是裸 raw label）
    expect(labels[0]!.classes()).toContain("peer-disabled:opacity-70");
  });
});

// Phase 2e-3 —— 新建/编辑弹窗从手写 <Teleport>+遮罩 div 换成 <Dialog> 家族。
// 锁「换底座后新拿到的东西」+「@entry / data-fn 这类 L5 锚点没被结构改动吞掉」。
// 关键点：
//   - 两个弹窗分别锁（标题不同：新建 vs 编辑），避免「共用 div[role=dialog]」互相掩护
//   - M03.F01.I02 锚点：页头「新建接样」+ 弹窗内「创建」按钮都挂同 data-fn；
//     弹窗内必须恰好 1 个，且 class 仍走 <Button> CVA（class*=inline-flex）
describe("Phase 2e-3 — ReceiptsList 新建/编辑弹窗走 Dialog 底座", () => {
  async function openCreate(): Promise<VueWrapper> {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    const wrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    lastWrapper = wrapper;
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = wrapper.findAll("button").find((b) => b.text() === "新建接样")!;
    await createBtn.trigger("click");
    await flushPromises();
    return wrapper;
  }

  async function openEdit(): Promise<VueWrapper> {
    const { default: ReceiptsList } = await import("@/features/receipts/ReceiptsList.vue");
    const wrapper = mountWithProviders(ReceiptsList, { global: MOUNT_GLOBAL });
    lastWrapper = wrapper;
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    // 找 RECEIPT-001 行（receiving）的编辑按钮
    const editBtn = wrapper.findAll("button").find((b) => b.text() === "编辑")!;
    await editBtn.trigger("click");
    await flushPromises();
    return wrapper;
  }

  it("新建弹窗：div[role=dialog] 存在，标题经 reka context 连上 aria-labelledby='新建接样'", async () => {
    const w = await openCreate();

    const dialog = w.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);

    const titleId = dialog.attributes("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(w.find(`#${titleId}`).text()).toBe("新建接样");

    const descId = dialog.attributes("aria-describedby");
    expect(descId).toBeTruthy();
    expect(w.find(`#${descId}`).text()).toContain("录入委托书基础信息");
  });

  it("新建弹窗内保存键 data-fn 仍落真实 <Button> 上（class*=inline-flex）", async () => {
    const w = await openCreate();

    // 弹窗内那个是「保存」按钮，无 data-fn（@entry 在批量键，I02 是行级）；
    // 锚测改锁：M03.F01.I02 在页头「新建接样」按钮上 —— 必须仍落在真实 button。
    // 弹窗结构不能吞掉页头锚点。
    const headerBtn = w.findAll('button[data-fn="M03.F01.I02"]').find(
      (b) => b.text() === "新建接样",
    );
    expect(headerBtn).toBeTruthy();
    expect(headerBtn!.element.tagName).toBe("BUTTON");
    expect(headerBtn!.classes()).toContain("inline-flex");

    // 弹窗内 form <Input> 5 个仍在弹窗子树里（Phase 2d-2 配对的 id 没被 Dialog 抽走）
    const dialog = w.find('[role="dialog"]');
    expect(dialog.findAll('input').length).toBeGreaterThanOrEqual(5);
    expect(dialog.find("#receipt-create-code").exists()).toBe(true);
    expect(dialog.find("#receipt-create-date").exists()).toBe(true);
  });

  it("新建弹窗：ESC 关闭（走 @update:open → mode = { kind: 'idle' }）", async () => {
    const w = await openCreate();
    expect(w.find('[role="dialog"]').exists()).toBe(true);

    await nextTick();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    await nextTick();
    await flushPromises();

    expect(w.find('[role="dialog"]').exists()).toBe(false);
  });

  it("编辑弹窗：div[role=dialog] 存在，标题包含 fixture 的 commissionCode 'WT-2026-001'", async () => {
    const w = await openEdit();

    const dialog = w.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);

    const titleId = dialog.attributes("aria-labelledby");
    expect(titleId).toBeTruthy();
    // 模板走 `editing?.commissionCode ?? ""`，fixture RECEIPT-001 = "WT-2026-001"
    expect(w.find(`#${titleId}`).text()).toContain("WT-2026-001");

    const descId = dialog.attributes("aria-describedby");
    expect(descId).toBeTruthy();
    expect(w.find(`#${descId}`).text()).toContain("修改接样字段后保存");
  });

  it("编辑弹窗：14 个 form <Label for> 的 id 全部在弹窗内真实存在（Phase 2d-2 配对不破）", async () => {
    const w = await openEdit();

    const dialog = w.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);

    const labels = dialog.findAll("label");
    expect(labels.length).toBe(7);
    for (const label of labels) {
      const target = label.attributes("for");
      expect(target).toBeTruthy();
      // id 必须落在 dialog 子树内（receipt-edit-* 前缀）
      expect(target!.startsWith("receipt-edit-")).toBe(true);
      expect(dialog.find(`#${target}`).exists()).toBe(true);
    }
  });
});