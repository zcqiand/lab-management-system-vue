// M06.F07.I01 — 报告名称维护 smoke
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const REPORT_NAMES = [
  {
    id: "RN-001",
    code: "RN-001",
    name: "钢筋力学",
    fullName: "钢筋力学性能检测报告",
    templatePath: "/templates/rebar.html",
    sortOrder: 1,
    extFields: [],
    tenantId: "TENANT-001",
  },
  {
    id: "RN-002",
    code: "RN-002",
    name: "水泥强度",
    fullName: "水泥胶砂强度检测报告",
    templatePath: "/templates/cement.html",
    sortOrder: 2,
    extFields: [],
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
    if (u.includes("/api/report-names")) {
      return { data: wrap(REPORT_NAMES) } as never;
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

describe("M06.F07 报告名称维护", () => {
  fnTest(["M06.F07.I01"], "报告名称：渲染标题 + 列表行（fixture 真数据穿透）", async () => {
    const { default: ReportNameList } = await import("@/features/report-names/ReportNameList.vue");
    const wrapper = mountWithProviders(ReportNameList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("报告名称维护");
    expect(wrapper.text()).toContain("RN-001");
    expect(wrapper.text()).toContain("RN-002");
  });

  fnTest(["M06.F07.I01"], "报告名称：新建按钮开弹窗（带 extFields 文本域）", async () => {
    const { default: ReportNameList } = await import("@/features/report-names/ReportNameList.vue");
    const wrapper = mountWithProviders(ReportNameList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = wrapper.findAll("button").find((b) => b.text() === "新建报告名称");
    expect(createBtn).toBeTruthy();
    await createBtn!.trigger("click");
    await flushPromises();
    const h2 = wrapper.findAll("h2").find((h) => h.text().includes("新建报告名称"));
    expect(h2).toBeTruthy();
    // textarea 在 form 内
    expect(wrapper.find("textarea").exists()).toBe(true);
  });

  fnTest(["M06.F07.I01"], "报告名称：行内删除按钮开确认弹窗", async () => {
    const { default: ReportNameList } = await import("@/features/report-names/ReportNameList.vue");
    const wrapper = mountWithProviders(ReportNameList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const delBtn = wrapper.findAll("button").find((b) => b.text() === "删除");
    expect(delBtn).toBeTruthy();
    await delBtn!.trigger("click");
    await flushPromises();
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("删除报告名称");
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

describe("Phase 1.2a — ReportNameList 列表 <Button> 原语回归", () => {
  it("新建报告名称：<Button variant=default> 渲染 <button>，data-fn 落到真实 DOM", async () => {
    const { default: ReportNameList } = await import("@/features/report-names/ReportNameList.vue");
    lastWrapper = mountWithProviders(ReportNameList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const create = lastWrapper.find('button[data-fn="M06.F07.I01"]');
    expect(create.exists()).toBe(true);
    expect(create.classes()).toContain("inline-flex");
    expect(create.classes()).toContain("bg-primary");
  });

  it("行内关联按钮：size=sm variant=outline，CVA h-8 活着，data-fn 落到真实 DOM", async () => {
    const { default: ReportNameList } = await import("@/features/report-names/ReportNameList.vue");
    lastWrapper = mountWithProviders(ReportNameList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const linkBtn = lastWrapper.find('button[data-fn="M06.F07.I02"]');
    expect(linkBtn.exists()).toBe(true);
    expect(linkBtn.classes()).toContain("h-8");
    expect(linkBtn.classes()).toContain("border");
  });
});

// Phase 1.3b Input 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：搜索 <Input class=max-w-sm> 渲染真实 <input> 且 @keydown.enter 落到 DOM；
// 弹窗 6 个 form <Input>（含 type=number v-model.number）v-model 双向写回。
describe("Phase 1.3b — ReportNameList 列表/表单 <Input> 原语回归", () => {
  it("搜索框 <Input class=max-w-sm>：渲染 <input>，placeholder/@keydown.enter 落到真实 DOM", async () => {
    const { default: ReportNameList } = await import("@/features/report-names/ReportNameList.vue");
    lastWrapper = mountWithProviders(ReportNameList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const search = lastWrapper.find('input[placeholder="按编码 / 名称搜索"]');
    expect(search.exists()).toBe(true);
    // 调用方 max-w-sm 仍生效
    expect(search.classes()).toContain("max-w-sm");
    // CVA base h-9 活着
    expect(search.classes()).toContain("h-9");
    // v-model 双向写回
    await search.setValue("RN-001");
    expect((search.element as HTMLInputElement).value).toBe("RN-001");
  });

  it("弹窗 6 个 form <Input>：v-model 双向写回，type=number 落 DOM", async () => {
    const { default: ReportNameList } = await import("@/features/report-names/ReportNameList.vue");
    lastWrapper = mountWithProviders(ReportNameList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 开新建弹窗
    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建报告名称");
    await createBtn!.trigger("click");
    await flushPromises();

    // 弹窗内的 6 个 <Input>（不含 textarea 扩展属性）
    const dialogInputs = lastWrapper.findAll('[data-teleport-stub] input:not([type="checkbox"])');
    // 编码/简称/全称/模板路径/排序/描述 = 6
    expect(dialogInputs.length).toBe(6);
    // type=number 仅排序 1 个
    const numInput = lastWrapper.find('[data-teleport-stub] input[type="number"]');
    expect(numInput.exists()).toBe(true);
    expect(numInput.attributes("type")).toBe("number");
    await numInput.setValue("42");
    // v-model.number → form.sortOrder 写 number
    expect((numInput.element as HTMLInputElement).value).toBe("42");
  });
});

// Phase 1.4 Label 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：表单 7 个 <Label> 落成真实 <label>，Label 基类活着。
describe("Phase 1.4 — ReportNameList 表单 <Label> 原语回归", () => {
  it("新建弹窗 7 个 <Label> 落成真实 <label>，首个文本「编码 *」带 Label 基类", async () => {
    const { default: ReportNameList } = await import("@/features/report-names/ReportNameList.vue");
    lastWrapper = mountWithProviders(ReportNameList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建报告名称");
    await createBtn!.trigger("click");
    await flushPromises();

    const labels = lastWrapper.findAll("label");
    expect(labels.length).toBe(7);
    expect(labels[0].element.tagName).toBe("LABEL");
    expect(labels[0].text()).toBe("编码 *");
    expect(labels[0].classes()).toContain("font-medium");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
    // extFields 的 <textarea> 仍是 raw（留 Phase 2c），它的 label 已是原语
    expect(labels[6].text()).toContain("扩展属性");
  });
});