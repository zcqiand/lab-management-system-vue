// M02.F01.I01 / I02 / I03 — 合同管理 smoke
//
// 镜像 react 仓 tests/features/contracts/contractsList.dom.test.tsx 3 个 fnTest。
// vue 仓不挂 msw（deps 未引入），用 vi.mock('axios') 拦截；fixture 数据走
// 内联字面量（与 react 仓 contracts 同构：id + tenantId）。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
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