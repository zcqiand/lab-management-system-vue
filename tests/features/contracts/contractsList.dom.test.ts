// M02.F01.I01 / I02 / I03 — 合同管理 smoke
//
// 镜像 react 仓 tests/features/contracts/contractsList.dom.test.tsx 3 个 fnTest。
// vue 仓不挂 msw（deps 未引入），用 vi.mock('axios') 拦截；fixture 数据走
// 内联字面量（与 react 仓 contracts 同构：id + tenantId）。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const CONTRACTS = [
  {
    id: "CONTRACT-001",
    contractCode: "HT-2026-001",
    clientUnit: "市住建工程质量检测中心",
    projectName: "城东综合体一期主体结构检测",
    constructionUnit: "中建八局城东项目部",
    witnessUnit: "城东置业发展有限公司",
    witness: "王见证",
    status: "active",
    entrustedDate: "2026-06-01",
    tenantId: "TENANT-001",
  },
  {
    id: "CONTRACT-002",
    contractCode: "HT-2026-002",
    clientUnit: "市政工程质量监督站",
    projectName: "城南高架桥桥梁工程检测",
    constructionUnit: "中铁大桥局城南分部",
    witnessUnit: "市交通投资集团",
    witness: "赵见证",
    status: "active",
    entrustedDate: "2026-06-15",
    tenantId: "TENANT-001",
  },
  {
    id: "CONTRACT-003",
    contractCode: "HT-2025-098",
    clientUnit: "县建设局",
    projectName: "县城道路改造工程",
    constructionUnit: "县建筑公司",
    witnessUnit: "县建设局",
    witness: "刘见证",
    status: "archived",
    entrustedDate: "2025-12-01",
    tenantId: "TENANT-001",
  },
];

function wrap(arr: unknown[]): { items: unknown[]; page: number; pageSize: number; total: number } {
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
    if (u.includes("/api/contracts")) {
      return { data: wrap(CONTRACTS) } as never;
    }
    return { data: wrap([]) } as never;
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

describe("M02.F01 合同管理", () => {
  fnTest(["M02.F01.I01"], "合同列表：渲染标题 + 列表行（fixture 真数据穿透）", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    const wrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("合同管理");
    expect(wrapper.text()).toContain("HT-2026-001");
    expect(wrapper.text()).toContain("HT-2026-002");
  });

  fnTest(["M02.F01.I02"], "合同管理：新建按钮开弹窗（标题『新建合同』）", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    const wrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = wrapper.findAll("button").find((b) => b.text() === "新建合同");
    expect(createBtn).toBeTruthy();
    await createBtn!.trigger("click");
    await flushPromises();
    // 弹窗标题：dialog 自实现（不是 ConfirmDialog），找 h2 即可
    const h2 = wrapper.findAll("h2").find((h) => h.text().includes("新建合同"));
    expect(h2).toBeTruthy();
  });

  fnTest(["M02.F01.I03"], "合同管理：行内删除按钮开确认弹窗（标题『删除合同』）", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    const wrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const delBtn = wrapper.findAll("button").find((b) => b.text() === "删除");
    expect(delBtn).toBeTruthy();
    await delBtn!.trigger("click");
    await flushPromises();
    // ConfirmDialog 是 Teleport 内容，需要 stub 接管才能 find 到
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("删除合同");
  });
});

// Phase 1.2a Button 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁 3 件事，Phase 后续换原语 / 改 class 时不许回归：
//   1. <Button> 渲染 <button> 底层 — 原有 findAll("button") / data-fn 仍命中
//   2. $attrs 转发 — data-fn 落到真实 <button>，不是被吞掉
//   3. CVA base（inline-flex）活着；调用方 class（如 text-destructive）经 tailwind-merge 合并进来
let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 1.2a — ContractsList 列表 <Button> 原语回归", () => {
  it("新建合同按钮：<Button variant=default> 渲染 <button>，CVA base inline-flex 活着，data-fn 落到真实 DOM", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    lastWrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const create = lastWrapper.find('button[data-fn="M02.F01.I02"]');
    expect(create.exists()).toBe(true);
    expect(create.classes()).toContain("inline-flex");
    // CVA default 变体带 bg-primary
    expect(create.classes()).toContain("bg-primary");
  });

  it("行内删除按钮：<Button variant=link> 保留调用方 text-destructive class，点击仍打开 ConfirmDialog", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    lastWrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const delBtn = lastWrapper.findAll("button").find((b) => b.text() === "删除");
    expect(delBtn).toBeTruthy();
    // 调用方 class 经 tailwind-merge 合并进 link variant
    expect(delBtn!.classes()).toContain("text-destructive");
    // link variant 不带 CVA sm size (h-8) — 高度回归目标（B1 BLOCKER）
    expect(delBtn!.classes()).not.toContain("h-8");
    // link variant 不带 CVA sm padding (px-3)
    expect(delBtn!.classes()).not.toContain("px-3");
    await delBtn!.trigger("click");
    await flushPromises();
    expect(lastWrapper!.find('[data-testid="confirm-dialog"]').exists()).toBe(true);
  });
});

describe("Phase 1.3a — ContractsList 搜索/表单 <Input> 原语回归", () => {
  it("搜索框 <Input class=max-w-sm>：$attrs 转发 @keydown.enter，setValue 后 keyword 实时更新", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    lastWrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const search = lastWrapper.find('input[placeholder="按合同编号 / 项目名称搜索"]');
    expect(search.exists()).toBe(true);
    // 调用方 max-w-sm 仍生效（Input CVA 没覆盖 max-w）
    expect(search.classes()).toContain("max-w-sm");
    // v-model 双向：setValue 后真实 <input> value 即时反映
    await search.setValue("HT-2026-001");
    expect((search.element as HTMLInputElement).value).toBe("HT-2026-001");
  });

  it("新建弹窗内的合同编号 <Input>：v-model 双向写到 form.contractCode", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    lastWrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建合同");
    await createBtn!.trigger("click");
    await flushPromises();

    // 弹窗内找第一个 input（合同编号），它不带 placeholder（与搜索框区分）
    const codeInput = lastWrapper.find("input:not([placeholder])");
    expect(codeInput.exists()).toBe(true);
    await codeInput.setValue("HT-NEW");
    expect((codeInput.element as HTMLInputElement).value).toBe("HT-NEW");
  });
});

// Phase 1.4 Label 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：表单 17 个 <Label> 落成真实 <label>；Label 基类（text-sm font-medium
// leading-none peer-disabled:*）活着 —— 迁移前 raw <label class="text-sm font-medium">
// 没有 peer-disabled: 前缀，这条断言就是红→绿的分界。
// Phase 2a-2 Table 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁 3 件事：<Table> 渲染为 div[role=table] / 行 data-fn 落到真实 <div> /
// TableCell class 经 tailwind-merge 合并（font-mono + text-xs 保留）。
describe("Phase 2a-2 — ContractsList 列表 <Table> 原语回归", () => {
  it("<Table> 渲染为 div[role=table]；7 个 <TableHead> 渲染为 div[role=columnheader]，文本顺序 合同编号/项目名称/委托单位/见证人/状态/委托日期/操作", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    lastWrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // Table 容器 div[role=table]
    const table = lastWrapper.find('[role="table"]');
    expect(table.exists()).toBe(true);

    // 7 个 columnheader，文本顺序对得上 raw <th>
    const heads = lastWrapper.findAll('[role="columnheader"]');
    expect(heads.length).toBe(7);
    expect(heads.map((h) => h.text())).toEqual([
      "合同编号",
      "项目名称",
      "委托单位",
      "见证人",
      "状态",
      "委托日期",
      "操作",
    ]);
  });

  it("3 个 fixture 行：data-fn 落到 div[role=row]，且不在 [role=rowgroup] 内首组（避开 TableHeader 行）", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    lastWrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 2 个 rowgroup（TableHeader + TableBody）
    const rowgroups = lastWrapper.findAll('[role="rowgroup"]');
    expect(rowgroups.length).toBe(2);

    // 数据行在第二个 rowgroup（TableBody），3 行
    const bodyRows = rowgroups[1]!.findAll('[role="row"]');
    expect(bodyRows.length).toBe(3);

    // 行级 data-fn 落到真实 div[role=row]
    for (const row of bodyRows) {
      expect(row.attributes("data-fn")).toBe("M02.F01.I01");
    }
  });

  it("TableCell 调用方 class 经 tailwind-merge 合并（font-mono + text-xs 落到合同编号 cell）", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    lastWrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 第一个 cell 是合同编号 cell，应带 font-mono + text-xs
    const cells = lastWrapper.findAll('[role="cell"]');
    expect(cells.length).toBeGreaterThan(0);
    // 找到文本为 HT-2026-001 的 cell（3 行都有合同编码，但 table 现在是 div[role=cell]）
    const codeCell = cells.find((c) => c.text().includes("HT-2026-001"));
    expect(codeCell).toBeTruthy();
    expect(codeCell!.classes()).toContain("font-mono");
    expect(codeCell!.classes()).toContain("text-xs");
  });
});

describe("Phase 1.4 — ContractsList 表单 <Label> 原语回归", () => {
  it("新建弹窗 17 个 <Label> 渲染成真实 <label>，首个文本「合同编号 *」带 Label 基类", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    lastWrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建合同");
    await createBtn!.trigger("click");
    await flushPromises();

    const labels = lastWrapper.findAll("label");
    expect(labels.length).toBe(17);
    expect(labels[0].element.tagName).toBe("LABEL");
    expect(labels[0].text()).toBe("合同编号 *");
    // Label 基类经 cn() 落到真实 <label>
    expect(labels[0].classes()).toContain("text-sm");
    expect(labels[0].classes()).toContain("font-medium");
    expect(labels[0].classes()).toContain("leading-none");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
    // 末尾「状态」label 与 <Select> 同级
    expect(labels[16].text()).toBe("状态");
  });
});

// Phase 2e-3 —— 新建/编辑弹窗从手写 <Teleport>+遮罩 div 换成 <Dialog> 家族。
// 锁「换底座后新拿到的东西」+「@entry / data-fn 这类 L5 锚点没被结构改动吞掉」。
describe("Phase 2e-3 — ContractsList 表单弹窗走 Dialog 底座", () => {
  async function openForm() {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    const wrapper = mountWithProviders(ContractsList, { global: MOUNT_GLOBAL });
    lastWrapper = wrapper;
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "新建合同")!
      .trigger("click");
    await flushPromises();
    return wrapper;
  }

  it("弹窗渲染 div[role=dialog]，标题/描述经 reka context 连上 aria", async () => {
    const w = await openForm();

    const content = w.find('[role="dialog"]');
    expect(content.exists()).toBe(true);

    const titleId = content.attributes("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(w.find(`#${titleId}`).text()).toBe("新建合同");

    const descId = content.attributes("aria-describedby");
    expect(descId).toBeTruthy();
    expect(w.find(`#${descId}`).text()).toContain("创建一条合同记录");
  });

  it("保存按钮的 data-fn 没被结构改动吞掉，仍落在真实 <button> 上", async () => {
    const w = await openForm();

    const save = w.find('button[data-fn="M02.F01.I02"][class*="inline-flex"]');
    expect(save.exists()).toBe(true);
    // 弹窗内那个是「创建」；页头那个也是同 data-fn，靠文本区分
    const inDialog = w.find('[role="dialog"]').findAll('button[data-fn="M02.F01.I02"]');
    expect(inDialog.length).toBe(1);
    expect(inDialog[0]!.text()).toBe("创建");
  });

  it("ESC 关闭弹窗（走 @update:open → closeDialog）", async () => {
    const w = await openForm();
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
