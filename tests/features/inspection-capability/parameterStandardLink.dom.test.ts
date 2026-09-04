// M06.F03.I02 — 参数↔标准关联弹窗 smoke（镜像 react 仓 parameterStandardLink.dom.test.tsx）
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const STANDARDS = [
  { id: "GB 175-2023", code: "GB 175-2023", name: "通用硅酸盐水泥", version: "2023", status: "active", tenantId: "TENANT-001" },
  { id: "GB/T 50081-2019", code: "GB/T 50081-2019", name: "混凝土物理力学性能试验方法标准", version: "2019", status: "active", tenantId: "TENANT-001" },
];

// IP-0001 已关联 GB 175-2023（镜像 msw fixtures 语义）
const LINKS = [
  { inspectionStandardCode: "GB 175-2023", inspectionParameterCode: "IP-0001", createdAt: "", updatedAt: "" },
];

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
    if (u.includes("/api/inspection/standards")) {
      return { data: { items: STANDARDS, total: STANDARDS.length } } as never;
    }
    if (u.includes("/api/inspection/links/standard-parameter")) {
      return { data: LINKS } as never;
    }
    return { data: { items: [] } } as never;
  });
  vi.mocked(axios.post).mockImplementation(async () => ({ status: 204, data: null }) as never);
  vi.mocked(axios.delete).mockImplementation(async () => ({ status: 204, data: null }) as never);
}

beforeEach(() => {
  installAdapters();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const MOUNT_GLOBAL = {
  stubs: {
    teleport: { template: '<div data-teleport-stub><slot /></div>' },
  },
};

function makeProps(paramCode: string) {
  return {
    open: true,
    parameterCode: paramCode,
    parameterName: "抗压强度",
  };
}

describe("M06.F03.I02 参数↔标准关联", () => {
  fnTest(["M06.F03.I02"], "关联弹窗：列出标准 + 已关联态（IP-0001 已关联 GB 175-2023）", async () => {
    const { default: Dialog } = await import(
      "@/features/inspection-capability/ParameterStandardLinkDialog.vue"
    );
    const wrapper = mountWithProviders(Dialog, {
      props: makeProps("IP-0001"),
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain("关联标准 — 抗压强度");
    expect(text).toContain("GB 175-2023");
    // 已关联按钮为「解除关联」
    const unlinkBtn = wrapper.findAll("button").find((b) => b.text() === "解除关联");
    expect(unlinkBtn).toBeTruthy();
  });

  fnTest(["M06.F03.I02"], "toggle：未关联标准 → POST 后按钮翻「解除关联」", async () => {
    const { default: Dialog } = await import(
      "@/features/inspection-capability/ParameterStandardLinkDialog.vue"
    );
    const wrapper = mountWithProviders(Dialog, {
      props: makeProps("IP-0999"),
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    // IP-0999 无既有链接 → 全部「关联」
    const linkBtn = wrapper.findAll("button").find((b) => b.text() === "关联");
    expect(linkBtn).toBeTruthy();
    await linkBtn!.trigger("click");
    await flushPromises();
    expect(axios.post).toHaveBeenCalled();
    const unlinkBtn = wrapper.findAll("button").find((b) => b.text() === "解除关联");
    expect(unlinkBtn).toBeTruthy();
  });
});

// Phase 2a-3 Table 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：<Table> 渲染为 div[role=table] / 5 个 columnheader 文本顺序 /
// 行 data-fn='M06.F03.I02' 落在 rowgroup[1] 内 div[role=row] 的 button 而非 row /
// 状态徽章 span 仍在 cell 内。
describe("Phase 2a-3 — ParameterStandardLinkDialog 关联表 <Table> 原语回归", () => {
  it("<Table> 渲染为 div[role=table]；5 个 <TableHead> 文本顺序 标准编码/名称/版本/状态/操作", async () => {
    const { default: Dialog } = await import(
      "@/features/inspection-capability/ParameterStandardLinkDialog.vue"
    );
    const wrapper = mountWithProviders(Dialog, {
      props: makeProps("IP-0001"),
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const table = wrapper.find('[role="table"]');
    expect(table.exists()).toBe(true);

    const heads = wrapper.findAll('[role="columnheader"]');
    expect(heads.length).toBe(5);
    expect(heads.map((h) => h.text())).toEqual([
      "标准编码",
      "名称",
      "版本",
      "状态",
      "操作",
    ]);
  });

  it("2 行 fixture：行不在 rowgroup[1]（无 data-fn，data-fn 挂在行内 button）", async () => {
    const { default: Dialog } = await import(
      "@/features/inspection-capability/ParameterStandardLinkDialog.vue"
    );
    const wrapper = mountWithProviders(Dialog, {
      props: makeProps("IP-0001"),
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const rowgroups = wrapper.findAll('[role="rowgroup"]');
    expect(rowgroups.length).toBe(2);

    const bodyRows = rowgroups[1]!.findAll('[role="row"]');
    expect(bodyRows.length).toBe(2);

    // 行级无 data-fn（原 raw 也是只在 button 上挂）
    for (const row of bodyRows) {
      expect(row.attributes("data-fn")).toBeUndefined();
    }
  });

  it("行内 button data-fn='M06.F03.I02' 落到真实 button，且嵌套在 cell 内（不被 <TableCell> 吞）", async () => {
    const { default: Dialog } = await import(
      "@/features/inspection-capability/ParameterStandardLinkDialog.vue"
    );
    const wrapper = mountWithProviders(Dialog, {
      props: makeProps("IP-0001"),
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const buttons = wrapper.findAll('button[data-fn="M06.F03.I02"]');
    expect(buttons.length).toBe(2);
    for (const btn of buttons) {
      expect(btn.element.tagName).toBe("BUTTON");
      const cell = btn.element.parentElement;
      expect(cell).not.toBeNull();
      expect(cell!.getAttribute("role")).toBe("cell");
    }
  });

  it("TableCell 调用方 class 经 tailwind-merge 合并（font-mono + text-xs 落标准编码 cell）", async () => {
    const { default: Dialog } = await import(
      "@/features/inspection-capability/ParameterStandardLinkDialog.vue"
    );
    const wrapper = mountWithProviders(Dialog, {
      props: makeProps("IP-0001"),
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const cells = wrapper.findAll('[role="cell"]');
    expect(cells.length).toBeGreaterThan(0);
    // 第一个标准编码 cell
    const codeCell = cells.find((c) => c.text().includes("GB 175-2023"));
    expect(codeCell).toBeTruthy();
    expect(codeCell!.classes()).toContain("font-mono");
    expect(codeCell!.classes()).toContain("text-xs");
  });
});
