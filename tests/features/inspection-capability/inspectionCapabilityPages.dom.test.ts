// Sprint 2 Batch 2B-4：M06 检测能力 6 薄页 + 10 I DOM 测试（vue 仓）。
//
// 镜像 react 仓 tests/features/inspection-capability/inspectionCapabilityPages.dom.test.tsx。
// vue 仓不挂 msw（deps 未引入），用 vi.mock('axios') 拦截；fixture 数据走
// 内联字面量（与 react 仓 inspection-specialty / inspection-calculation-method /
// inspection-technical-requirement 同构）。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";
import InspectionCapabilityList from "@/features/inspection-capability/InspectionCapabilityList.vue";
import CalculationMethodList from "@/features/inspection-capability/CalculationMethodList.vue";
import TechnicalRequirementList from "@/features/inspection-capability/TechnicalRequirementList.vue";

const SPECIALTIES = [
  { id: "SP01", code: "SP01", name: "建筑材料及构配件", officialNo: "一", isOfficial: true, enabled: true, sortOrder: 1 },
  { id: "SP02", code: "SP02", name: "主体结构及装饰装修", officialNo: "二", isOfficial: true, enabled: true, sortOrder: 2 },
];

const OBJECTS = [
  { id: "OBJ-1", code: "OBJ-1", name: "水泥", inspectionSpecialtyCode: "SP01", sortOrder: 1, enabled: true },
];

const PARAMETERS = [
  { id: "P-1", code: "P-1", name: "抗压强度", unit: "MPa", sortOrder: 1 },
];

const STANDARDS = [
  { id: "GB-175", code: "GB 175-2023", name: "通用硅酸盐水泥", version: "2023", status: "active", sortOrder: 1 },
];

const CALC_RULES = [
  {
    id: "cr-OBJ-1-P-1",
    inspectionObjectCode: "OBJ-1",
    inspectionParameterCode: "P-1",
    testingStandardCode: "GB 175-2023",
    algorithmType: "compressive_strength",
    specimenCount: 3,
    remark: "立方体抗压强度取算术平均",
  },
];

const TECH_REQS = [
  {
    id: "tr-OBJ-1-P-1-GB175",
    inspectionObjectCode: "OBJ-1",
    inspectionParameterCode: "P-1",
    judgmentStandardCode: "GB 175-2023",
    model: "P·O 42.5",
    comparison: "≤",
    maxValue: 0.06,
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
    if (u.includes("/api/inspection/specialties")) return { data: wrap(SPECIALTIES) } as never;
    if (u.includes("/api/inspection/objects")) return { data: wrap(OBJECTS) } as never;
    if (u.includes("/api/inspection/parameters")) return { data: wrap(PARAMETERS) } as never;
    if (u.includes("/api/inspection/standards")) return { data: wrap(STANDARDS) } as never;
    if (u.includes("/api/calculation-methods")) return { data: wrap(CALC_RULES) } as never;
    if (u.includes("/api/technical-requirements")) return { data: wrap(TECH_REQS) } as never;
    return { data: wrap([]) } as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  installAdapters();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("M06.F01 检测专项维护", () => {
  fnTest(["M06.F01.I01"], "F01 渲染标题 + 列表行（fixtures 穿透）", async () => {
    const wrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "specialties" },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("检测专项维护");
    expect(wrapper.findAll("tbody tr").length).toBeGreaterThan(0);
  });

  fnTest(["M06.F01.I01"], "F01 新建按钮 + SP01 编码可见", async () => {
    const wrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "specialties" },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("新建检测专项");
    expect(wrapper.text()).toContain("SP01");
  });
});

describe("M06.F02 检测项目维护", () => {
  fnTest(["M06.F02.I01"], "F02 渲染标题 + 检测专项筛选下拉", async () => {
    const wrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "objects" },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("检测项目维护");
    const select = wrapper.find('[aria-label="检测专项筛选"]');
    expect(select.exists()).toBe(true);
  });

  fnTest(["M06.F02.I01", "M06.F02.I02"], "F02 新建按钮 + 行内 编辑/删除 按钮", async () => {
    const wrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "objects" },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("新建检测项目");
    const editBtns = wrapper.findAll('button[aria-label^="编辑 "]');
    expect(editBtns.length).toBeGreaterThan(0);
  });
});

describe("M06.F03 检测参数维护", () => {
  fnTest(["M06.F03.I01"], "F03 渲染标题 + 3 级筛选下拉（专项/项目/标准）", async () => {
    const wrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "parameters" },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("检测参数维护");
    expect(wrapper.find('[aria-label="检测专项筛选"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="检测项目筛选"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="检测标准筛选"]').exists()).toBe(true);
  });
});

describe("M06.F04 检测标准维护", () => {
  fnTest(["M06.F04.I01"], "F04 渲染标题 + 列表行（GB 175-2023）", async () => {
    const wrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "standards" },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("检测标准维护");
    expect(wrapper.text()).toContain("GB 175-2023");
  });

  fnTest(["M06.F04.I01", "M06.F04.I02"], "F04 新建按钮 + 编辑按钮", async () => {
    const wrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "standards" },
    });
    await flushPromises();
    expect(wrapper.text()).toContain("新建检测标准");
    const editBtns = wrapper.findAll('button[aria-label^="编辑 "]');
    expect(editBtns.length).toBeGreaterThan(0);
  });
});

describe("M06.F05 计算方法维护", () => {
  fnTest(["M06.F05.I01"], "F05 渲染标题 + 复合主键列表行", async () => {
    const wrapper = mountWithProviders(CalculationMethodList);
    await flushPromises();
    expect(wrapper.text()).toContain("计算方法维护");
    expect(wrapper.findAll("tbody tr").length).toBeGreaterThan(0);
    expect(wrapper.text()).toContain("OBJ-1");
    expect(wrapper.text()).toContain("P-1");
  });

  fnTest(["M06.F05.I01"], "F05 新建 + 删除按钮", async () => {
    const wrapper = mountWithProviders(CalculationMethodList);
    await flushPromises();
    expect(wrapper.text()).toContain("新建计算方法");
    const delBtns = wrapper.findAll('button[aria-label^="删除 "]');
    expect(delBtns.length).toBeGreaterThan(0);
  });
});

describe("M06.F06 技术要求维护", () => {
  fnTest(["M06.F06.I01"], "F06 渲染标题 + 4 维筛选（牌号/型号/等级/规格）", async () => {
    const wrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    expect(wrapper.text()).toContain("技术要求维护");
    expect(wrapper.find('[aria-label="牌号筛选"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="型号筛选"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="等级筛选"]').exists()).toBe(true);
    expect(wrapper.find('[aria-label="规格筛选"]').exists()).toBe(true);
  });

  fnTest(["M06.F06.I01", "M06.F06.I02", "M06.F06.I03"], "F06 列表行 + 新建/编辑/删除按钮", async () => {
    const wrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    expect(wrapper.text()).toContain("新建技术要求");
    expect(wrapper.findAll("tbody tr").length).toBeGreaterThan(0);
    const editBtns = wrapper.findAll('button[aria-label^="编辑 "]');
    const delBtns = wrapper.findAll('button[aria-label^="删除 "]');
    expect(editBtns.length).toBeGreaterThan(0);
    expect(delBtns.length).toBeGreaterThan(0);
  });
});

// Phase 1.2a Button 迁移回归锚（不挂功能 ID，工程设施测试）。
// 只覆盖 InspectionCapabilityList；CalculationMethodList / TechnicalRequirementList
// 各自的迁移回归锚留在它们的 commit 里加。
let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 1.2a — InspectionCapabilityList <Button> 原语回归", () => {
  it("parameters 行内关联标准：<Button variant=link class=text-primary> 渲染 <button>，data-fn 落到真实 DOM", async () => {
    lastWrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "parameters" },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const linkBtn = lastWrapper.find('button[data-fn="M06.F03.I02"]');
    expect(linkBtn.exists()).toBe(true);
    expect(linkBtn.classes()).toContain("inline-flex");
    expect(linkBtn.classes()).toContain("text-primary");
  });

  // Phase 1.2a hotfix B3：官方行删除按钮 disabled 且带 disabled:opacity-40
  it("specialties 官方行删除按钮：disabled 落到真实 <button>，class 包含 disabled:opacity-40", async () => {
    lastWrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "specialties" },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // SPECIALTIES fixture 两条都是 isOfficial=true，删除按钮应 :disabled
    const officialDelete = lastWrapper.find('button[data-fn="M06.F01.I01"][aria-label^="删除 "]:disabled');
    expect(officialDelete.exists()).toBe(true);
    expect(officialDelete.classes()).toContain("disabled:opacity-40");
  });

  // Phase 1.2a hotfix B1：行内 link-style 按钮用 variant=link（无 h-8 / px-3）
  it("objects 行内编辑：<Button variant=link> 不带 CVA sm size (h-8) 也不带 sm padding (px-3)", async () => {
    lastWrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "objects" },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const editBtn = lastWrapper.find('button[aria-label^="编辑 OBJ-1"]');
    expect(editBtn.exists()).toBe(true);
    expect(editBtn.classes()).not.toContain("h-8");  // CVA sm size removed
    expect(editBtn.classes()).not.toContain("px-3"); // CVA sm padding removed
  });
});

describe("Phase 1.2a — TechnicalRequirementList <Button> 原语回归", () => {
  it("新建技术要求：<Button variant=default> 渲染 <button>，data-fn M06.F06.I02 落到真实 DOM", async () => {
    lastWrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const create = lastWrapper.find('button[data-fn="M06.F06.I02"]');
    expect(create.exists()).toBe(true);
    expect(create.classes()).toContain("inline-flex");
    expect(create.classes()).toContain("bg-primary");
  });

  it("行内删除：<Button variant=link class=text-destructive hover:underline>，aria-label 转发", async () => {
    lastWrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const delBtns = lastWrapper.findAll('button[aria-label^="删除 "]');
    expect(delBtns.length).toBeGreaterThan(0);
    expect(delBtns[0]!.classes()).toContain("text-destructive");
    // link variant 不带 h-8（CVA sm size 已移除）
    expect(delBtns[0]!.classes()).not.toContain("h-8");
  });
});

describe("Phase 1.2a — CalculationMethodList <Button> 原语回归", () => {
  it("新建计算方法：<Button variant=default> 渲染 <button>，data-fn M06.F05.I01 落到真实 DOM", async () => {
    lastWrapper = mountWithProviders(CalculationMethodList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const create = lastWrapper.findAll('button[data-fn="M06.F05.I01"]').find(
      (b) => b.text() === "新建计算方法",
    );
    expect(create).toBeTruthy();
    expect(create!.classes()).toContain("bg-primary");
  });

  it("行内编辑/删除：<Button variant=link>，aria-label 转发 + 调用方 text-primary / text-destructive 保留", async () => {
    lastWrapper = mountWithProviders(CalculationMethodList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const editBtns = lastWrapper.findAll('button[aria-label^="编辑 "]');
    const delBtns = lastWrapper.findAll('button[aria-label^="删除 "]');
    expect(editBtns.length).toBeGreaterThan(0);
    expect(delBtns.length).toBeGreaterThan(0);
    expect(editBtns[0]!.classes()).toContain("text-primary");
    expect(delBtns[0]!.classes()).toContain("text-destructive");
    // link variant 不带 h-8（CVA sm size 已移除）
    expect(editBtns[0]!.classes()).not.toContain("h-8");
  });
});
