// M04.F06-F09 型号/规格/等级/牌号维护 4 页 smoke（CategoryDictList 参数化）。
//
// 镜像 react 仓 tests/features/dicts/categoryDictPages.dom.test.tsx 12 个 fnTest。
// vue 仓不挂 msw（deps 未引入），用 vi.mock('axios') 拦截；fixture 数据走
// 内联字面量（与 react 仓 inspectionModels / inspectionBrands 同构）。
//
// helper.ts 把 <Teleport> 默认 stub 成 no-op；本文件 per-test 传
// `global: { stubs: { teleport: false } }` 覆盖，让 ConfirmDialog 内容渲染到
// wrapper，然后 wrapper.find('[data-testid=confirm-dialog]') 直接定位。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const INSPECTION_OBJECTS = [
  { code: "P1", name: "水泥", sortOrder: 1 },
  { code: "P2", name: "钢筋（含焊接与机械连接）", sortOrder: 2 },
];

const INSPECTION_MODELS = [
  { id: "M1", code: "M1", name: "HRB400", inspectionObjectCode: "P2", sortOrder: 10, remark: "" },
  { id: "M2", code: "M2", name: "HRB500", inspectionObjectCode: "P2", sortOrder: 20, remark: "" },
];

const INSPECTION_BRANDS = [
  { id: "B1", code: "B1", name: "武钢", inspectionObjectCode: "P2", sortOrder: 10, remark: "" },
];

function wrap(arr: unknown[]): { items: unknown[]; page: number; pageSize: number; total: number } {
  return { items: arr, page: 1, pageSize: arr.length, total: arr.length };
}

// vi.mock 必须在 import 之上声明；axios 默认导出对象即可。
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
    if (u.includes("/api/inspection/objects")) {
      return { data: wrap(INSPECTION_OBJECTS) } as never;
    }
    if (u.includes("/api/catalog/models")) {
      return { data: wrap(INSPECTION_MODELS) } as never;
    }
    if (u.includes("/api/catalog/specs")) {
      return { data: wrap(INSPECTION_MODELS) } as never;
    }
    if (u.includes("/api/catalog/grades")) {
      return { data: wrap(INSPECTION_MODELS) } as never;
    }
    if (u.includes("/api/catalog/brands")) {
      return { data: wrap(INSPECTION_BRANDS) } as never;
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

/** 复用的 mount 选项：业务组件需要 Teleport 子内容渲染到 wrapper
 *  把 <Teleport to="body"> 替换成 <div><slot /></div>，内容渲染到 wrapper 内
 *  （vue-test-utils 的 `false` 解 stub 在 Teleport 上无效，必须传自定义组件） */
const MOUNT_GLOBAL = {
  stubs: {
    teleport: { template: "<div data-teleport-stub><slot /></div>" },
  },
};

describe("M04.F06-F09 码表维护 4 页", () => {
  fnTest(
    ["M04.F06.I01"],
    "型号维护：渲染标题 + 检测项目树（vue 翻译 CategoryDictList 镜像 react）",
    async () => {
      const { default: CategoryDictList } = await import(
        "@/features/dicts/CategoryDictList.vue"
      );
      const wrapper = mountWithProviders(CategoryDictList, {
        props: { endpoint: "/models", title: "型号维护", dataFn: "M04.F06.I01" },
        global: MOUNT_GLOBAL,
      });
      await flushPromises();
      await new Promise((r) => setTimeout(r, 50));
      await flushPromises();
      expect(wrapper.text()).toContain("型号维护");
      expect(wrapper.text()).toContain("水泥");
      expect(wrapper.text()).toContain("钢筋");
    },
  );

  fnTest(["M04.F07.I01"], "规格维护：渲染标题不炸", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    const wrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/specifications", title: "规格维护", dataFn: "M04.F07.I01" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    expect(wrapper.text()).toContain("规格维护");
  });

  fnTest(["M04.F08.I01"], "等级维护：渲染标题不炸", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    const wrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/grades", title: "等级维护", dataFn: "M04.F08.I01" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    expect(wrapper.text()).toContain("等级维护");
  });

  fnTest(["M04.F09.I01"], "牌号维护：渲染标题不炸", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    const wrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/brands", title: "牌号维护", dataFn: "M04.F09.I01" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    expect(wrapper.text()).toContain("牌号维护");
  });

  fnTest(["M04.F06.I02"], "型号维护：新建按钮开弹窗（标题『新建型号』）", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    const wrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/models", title: "型号维护", createDataFn: "M04.F06.I02" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = wrapper.findAll("button").find((b) => b.text() === "新建");
    expect(createBtn).toBeTruthy();
    createBtn!.element.click();
    await flushPromises();
    await new Promise((r) => setTimeout(r, 10));
    await flushPromises();
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("新建型号");
  });

  fnTest(["M04.F06.I03"], "型号维护：行内删除按钮开确认弹窗", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    const wrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/models", title: "型号维护", deleteDataFn: "M04.F06.I03" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const rebarBtn = wrapper.findAll("aside button").find((b) => b.text().includes("钢筋"));
    expect(rebarBtn).toBeTruthy();
    await rebarBtn!.trigger("click");
    await flushPromises();
    const delBtn = wrapper.findAll("button").find((b) => b.text() === "删除");
    expect(delBtn).toBeTruthy();
    await delBtn!.trigger("click");
    await flushPromises();
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("删除确认");
  });

  fnTest(["M04.F07.I02"], "规格维护：新建按钮开弹窗", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    const wrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/specifications", title: "规格维护", createDataFn: "M04.F07.I02" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = wrapper.findAll("button").find((b) => b.text() === "新建");
    expect(createBtn).toBeTruthy();
    await createBtn!.trigger("click");
    await flushPromises();
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("新建规格");
  });

  fnTest(["M04.F07.I03"], "规格维护：行内删除按钮开确认弹窗", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    const wrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/specifications", title: "规格维护", deleteDataFn: "M04.F07.I03" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const rebarBtn = wrapper.findAll("aside button").find((b) => b.text().includes("钢筋"));
    expect(rebarBtn).toBeTruthy();
    await rebarBtn!.trigger("click");
    await flushPromises();
    const delBtn = wrapper.findAll("button").find((b) => b.text() === "删除");
    expect(delBtn).toBeTruthy();
    await delBtn!.trigger("click");
    await flushPromises();
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("删除确认");
  });

  fnTest(["M04.F08.I02"], "等级维护：新建按钮开弹窗", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    const wrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/grades", title: "等级维护", createDataFn: "M04.F08.I02" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = wrapper.findAll("button").find((b) => b.text() === "新建");
    expect(createBtn).toBeTruthy();
    await createBtn!.trigger("click");
    await flushPromises();
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("新建等级");
  });

  fnTest(["M04.F08.I03"], "等级维护：行内删除按钮开确认弹窗", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    const wrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/grades", title: "等级维护", deleteDataFn: "M04.F08.I03" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const rebarBtn = wrapper.findAll("aside button").find((b) => b.text().includes("钢筋"));
    expect(rebarBtn).toBeTruthy();
    await rebarBtn!.trigger("click");
    await flushPromises();
    const delBtn = wrapper.findAll("button").find((b) => b.text() === "删除");
    expect(delBtn).toBeTruthy();
    await delBtn!.trigger("click");
    await flushPromises();
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("删除确认");
  });

  fnTest(["M04.F09.I02"], "牌号维护：新建按钮开弹窗", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    const wrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/brands", title: "牌号维护", createDataFn: "M04.F09.I02" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = wrapper.findAll("button").find((b) => b.text() === "新建");
    expect(createBtn).toBeTruthy();
    await createBtn!.trigger("click");
    await flushPromises();
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("新建牌号");
  });

  fnTest(["M04.F09.I03"], "牌号维护：行内删除按钮开确认弹窗", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    const wrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/brands", title: "牌号维护", deleteDataFn: "M04.F09.I03" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const rebarBtn = wrapper.findAll("aside button").find((b) => b.text().includes("钢筋"));
    expect(rebarBtn).toBeTruthy();
    await rebarBtn!.trigger("click");
    await flushPromises();
    const delBtn = wrapper.findAll("button").find((b) => b.text() === "删除");
    expect(delBtn).toBeTruthy();
    await delBtn!.trigger("click");
    await flushPromises();
    const dialog = wrapper.find('[data-testid="confirm-dialog"]');
    expect(dialog.exists()).toBe(true);
    expect(dialog.text()).toContain("删除确认");
  });
});
// Phase 1.2b Button 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁 3 件事：
//   1. <Button> 渲染 <button> 底层 —— 原有 findAll("button") / data-fn selector 零回归
//   2. $attrs 转发 —— data-fn 落到真实 <button>
//   3. link variant 不注入 size（无 h-8 / px-3），delete 用 text-destructive 设计 token
let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 1.2b — CategoryDictList <Button> 原语回归", () => {
  it("新建按钮：<Button variant=default> 渲染 <button>，CVA base inline-flex 活着，data-fn 落到真实 DOM", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    lastWrapper = mountWithProviders(CategoryDictList, {
      props: { endpoint: "/models", title: "型号维护", createDataFn: "M04.F06.I02" },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const create = lastWrapper.find('button[data-fn="M04.F06.I02"]');
    expect(create.exists()).toBe(true);
    expect(create.classes()).toContain("inline-flex");
    // 调用方蓝色定制压过 CVA default 的 bg-primary（tailwind-merge）
    expect(create.classes()).toContain("bg-info");
    expect(create.classes()).not.toContain("bg-primary");
  });

  it("行内编辑/删除：<Button variant=link> 无 h-8/px-3，删除用 text-destructive token", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    lastWrapper = mountWithProviders(CategoryDictList, {
      props: {
        endpoint: "/models",
        title: "型号维护",
        editDataFn: "M04.F06.I02",
        deleteDataFn: "M04.F06.I03",
      },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const rebarBtn = lastWrapper.findAll("aside button").find((b) => b.text().includes("钢筋"));
    expect(rebarBtn).toBeTruthy();
    await rebarBtn!.trigger("click");
    await flushPromises();

    const edit = lastWrapper.find('button[data-fn="M04.F06.I02"]');
    expect(edit.exists()).toBe(true);
    expect(edit.classes()).toContain("inline-flex");
    expect(edit.classes()).toContain("text-primary");
    expect(edit.classes()).not.toContain("h-8");
    expect(edit.classes()).not.toContain("px-3");

    const del = lastWrapper.find('button[data-fn="M04.F06.I03"]');
    expect(del.exists()).toBe(true);
    expect(del.classes()).toContain("text-destructive");
    expect(del.classes()).not.toContain("text-red-600");
    expect(del.classes()).not.toContain("h-8");
  });
});

// Phase 1.3b Input 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：弹窗内 2 个 form <Input> 名称 + 备注 v-model 双向写回。
describe("Phase 1.3b — CategoryDictList 弹窗 <Input> 原语回归", () => {
  it("弹窗 2 个 form <Input>：名称 + 备注 v-model 双向写回", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    lastWrapper = mountWithProviders(CategoryDictList, {
      props: {
        endpoint: "/models",
        title: "型号维护",
        createDataFn: "M04.F06.I02",
      },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 开新建弹窗
    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建");
    expect(createBtn).toBeTruthy();
    await createBtn!.trigger("click");
    await flushPromises();

    // 弹窗内的 2 个 <Input>：名称 + 备注（不含 select 检测项目）
    const dialogInputs = lastWrapper.findAll('[data-teleport-stub] input:not([type="checkbox"])');
    expect(dialogInputs.length).toBe(2);

    // 第一个：名称（input[required] 由 formName 控制必填）
    const nameInput = dialogInputs[0];
    expect(nameInput.classes()).toContain("h-9");
    await nameInput.setValue("HRB400E");
    expect((nameInput.element as HTMLInputElement).value).toBe("HRB400E");

    // 第二个：备注
    const remarkInput = dialogInputs[1];
    await remarkInput.setValue("抗震钢筋");
    expect((remarkInput.element as HTMLInputElement).value).toBe("抗震钢筋");
  });
});

// Phase 1.4 Label 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：弹窗 3 个 <Label> 落成真实 <label>，调用方 text-xs 经 tailwind-merge
// 压过 Label 基类 text-sm（视觉不回归）。
describe("Phase 1.4 — CategoryDictList 弹窗 <Label> 原语回归", () => {
  it("弹窗 3 个 <Label class=text-xs>：text-xs 压过基类 text-sm，font-medium 保留", async () => {
    const { default: CategoryDictList } = await import(
      "@/features/dicts/CategoryDictList.vue"
    );
    lastWrapper = mountWithProviders(CategoryDictList, {
      props: {
        endpoint: "/models",
        title: "型号维护",
        createDataFn: "M04.F06.I02",
      },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建");
    await createBtn!.trigger("click");
    await flushPromises();

    const labels = lastWrapper.findAll('[data-teleport-stub] label');
    expect(labels.length).toBe(3);
    expect(labels.map((l) => l.text())).toEqual(["检测项目", "名称", "备注"]);
    expect(labels[0].element.tagName).toBe("LABEL");
    // tailwind-merge：调用方 text-xs 压掉基类 text-sm
    expect(labels[0].classes()).toContain("text-xs");
    expect(labels[0].classes()).not.toContain("text-sm");
    // 基类其余部分活着
    expect(labels[0].classes()).toContain("font-medium");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
    // 调用方布局 class 仍在
    expect(labels[0].classes()).toContain("mb-1");
    expect(labels[0].classes()).toContain("block");
  });
});
