// M04.F06-F09 型号/规格/等级/牌号维护 4 页 smoke（CategoryDictList 参数化）。
//
// 镜像 react 仓 tests/features/dicts/categoryDictPages.dom.test.tsx 12 个 fnTest。
// vue 仓不挂 msw（deps 未引入），用 vi.mock('axios') 拦截；fixture 数据走
// 内联字面量（与 react 仓 inspectionModels / inspectionBrands 同构）。
//
// helper.ts 把 <Teleport> 默认 stub 成 no-op；本文件 per-test 传
// `global: { stubs: { teleport: false } }` 覆盖，让 ConfirmDialog 内容渲染到
// wrapper，然后 wrapper.find('[data-testid=confirm-dialog]') 直接定位。
import { describe, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
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