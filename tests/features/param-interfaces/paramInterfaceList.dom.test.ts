// M06.F08.I01 — 参数界面维护 smoke
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const PARAM_INTERFACES = [
  {
    code: "default",
    componentPath: "@/features/data-entry/models/DefaultParamCard.vue",
    sortOrder: 1,
  },
  {
    code: "concrete-compress",
    componentPath: "@/features/data-entry/models/ConcreteCompressCard.vue",
    sortOrder: 2,
  },
  {
    code: "rebar-mech-numeric",
    componentPath: "@/features/data-entry/models/RebarMechNumericCard.vue",
    sortOrder: 3,
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
    if (u.includes("/api/inspection-param-interfaces")) {
      return { data: wrap(PARAM_INTERFACES) } as never;
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

describe("M06.F08 参数界面维护", () => {
  fnTest(["M06.F08.I01"], "参数界面：渲染标题 + 列表行（fixture 真数据穿透）", async () => {
    const { default: ParamInterfaceList } = await import(
      "@/features/param-interfaces/ParamInterfaceList.vue"
    );
    const wrapper = mountWithProviders(ParamInterfaceList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("参数界面维护");
    expect(wrapper.text()).toContain("default");
    expect(wrapper.text()).toContain("concrete-compress");
  });

  fnTest(["M06.F08.I01"], "参数界面：新建按钮开弹窗", async () => {
    const { default: ParamInterfaceList } = await import(
      "@/features/param-interfaces/ParamInterfaceList.vue"
    );
    const wrapper = mountWithProviders(ParamInterfaceList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = wrapper.findAll("button").find((b) => b.text() === "新建参数界面");
    expect(createBtn).toBeTruthy();
    await createBtn!.trigger("click");
    await flushPromises();
    const h2 = wrapper.findAll("h2").find((h) => h.text().includes("新建参数界面"));
    expect(h2).toBeTruthy();
  });

  fnTest(["M06.F08.I01"], "参数界面：行内删除按钮开确认弹窗", async () => {
    const { default: ParamInterfaceList } = await import(
      "@/features/param-interfaces/ParamInterfaceList.vue"
    );
    const wrapper = mountWithProviders(ParamInterfaceList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const delBtn = wrapper.findAll("button").find((b) => b.text() === "删除");
    expect(delBtn).toBeTruthy();
    await delBtn!.trigger("click");
    await flushPromises();
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("删除参数界面");
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

describe("Phase 1.2a — ParamInterfaceList <Button> 原语回归", () => {
  it("新建参数界面：<Button variant=default> 渲染 <button>，CVA base 活着，data-fn 落到真实 DOM", async () => {
    const { default: ParamInterfaceList } = await import("@/features/param-interfaces/ParamInterfaceList.vue");
    lastWrapper = mountWithProviders(ParamInterfaceList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const create = lastWrapper.find('button[data-fn="M06.F08.I01"]');
    expect(create.exists()).toBe(true);
    expect(create.classes()).toContain("inline-flex");
    expect(create.classes()).toContain("bg-primary");
  });

  it("行内删除按钮：<Button variant=link>，text-destructive 调用方 class 经 tailwind-merge 合并进来", async () => {
    const { default: ParamInterfaceList } = await import("@/features/param-interfaces/ParamInterfaceList.vue");
    lastWrapper = mountWithProviders(ParamInterfaceList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const delBtn = lastWrapper.findAll("button").find((b) => b.text() === "删除");
    expect(delBtn).toBeTruthy();
    // link variant 不带 h-8（CVA sm size 已移除）
    expect(delBtn!.classes()).not.toContain("h-8");
    expect(delBtn!.classes()).toContain("text-destructive");
  });
});

// Phase 1.3b Input 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：搜索 <Input> 渲染真实 <input> + @keydown.enter 落到 DOM；
// 弹窗 3 个 form <Input>：编辑模式 :disabled 落到真实 <input>，type=number 落到 DOM。
describe("Phase 1.3b — ParamInterfaceList 列表/表单 <Input> 原语回归", () => {
  it("搜索框 <Input class=max-w-sm>：渲染 <input>，v-model 双向写回", async () => {
    const { default: ParamInterfaceList } = await import(
      "@/features/param-interfaces/ParamInterfaceList.vue"
    );
    lastWrapper = mountWithProviders(ParamInterfaceList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const search = lastWrapper.find('input[placeholder="按编码 / 组件路径搜索"]');
    expect(search.exists()).toBe(true);
    expect(search.classes()).toContain("max-w-sm");
    expect(search.classes()).toContain("h-9");
    await search.setValue("default");
    expect((search.element as HTMLInputElement).value).toBe("default");
  });

  it("弹窗 3 个 form <Input>：编辑模式 :disabled 落到真实 <input>，type=number 落 DOM", async () => {
    const { default: ParamInterfaceList } = await import(
      "@/features/param-interfaces/ParamInterfaceList.vue"
    );
    lastWrapper = mountWithProviders(ParamInterfaceList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 开新建弹窗
    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建参数界面");
    await createBtn!.trigger("click");
    await flushPromises();

    // 弹窗内的 3 个 <Input>：编码 + 组件路径 + 排序
    const dialogInputs = lastWrapper.findAll('[data-teleport-stub] input:not([type="checkbox"])');
    expect(dialogInputs.length).toBe(3);

    // type=number 仅排序 1 个
    const numInput = lastWrapper.find('[data-teleport-stub] input[type="number"]');
    expect(numInput.exists()).toBe(true);
    expect(numInput.attributes("type")).toBe("number");
    await numInput.setValue("42");
    expect((numInput.element as HTMLInputElement).value).toBe("42");

    // 新建模式下，编码不应 disabled
    const codeInput = dialogInputs[0];
    expect((codeInput.element as HTMLInputElement).disabled).toBe(false);
  });
});

// Phase 1.4 Label 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：表单 3 个 <Label> 落成真实 <label>，Label 基类活着。
describe("Phase 1.4 — ParamInterfaceList 表单 <Label> 原语回归", () => {
  it("新建弹窗 3 个 <Label> 落成真实 <label>，文本 编码/组件路径/排序", async () => {
    const { default: ParamInterfaceList } = await import(
      "@/features/param-interfaces/ParamInterfaceList.vue"
    );
    lastWrapper = mountWithProviders(ParamInterfaceList, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建参数界面");
    await createBtn!.trigger("click");
    await flushPromises();

    const labels = lastWrapper.findAll("label");
    expect(labels.length).toBe(3);
    expect(labels.map((l) => l.text())).toEqual(["编码 *", "组件路径 *", "排序"]);
    expect(labels[0].element.tagName).toBe("LABEL");
    expect(labels[0].classes()).toContain("font-medium");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
  });
});