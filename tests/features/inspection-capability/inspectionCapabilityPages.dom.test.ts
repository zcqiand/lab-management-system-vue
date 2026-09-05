// Sprint 2 Batch 2B-4：M06 检测能力 6 薄页 + 10 I DOM 测试（vue 仓）。
//
// 镜像 react 仓 tests/features/inspection-capability/inspectionCapabilityPages.dom.test.tsx。
// vue 仓不挂 msw（deps 未引入），用 vi.mock('axios') 拦截；fixture 数据走
// 内联字面量（与 react 仓 inspection-specialty / inspection-calculation-method /
// inspection-technical-requirement 同构）。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";
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
    // Phase 2a-2 迁移：<tbody><tr> → <TableBody> 内 <TableRow> 渲染为 div[role=row]
    // 数据行在第二个 rowgroup（TableBody）
    const bodyRows = wrapper.findAll('[role="rowgroup"]')[1]!.findAll('[role="row"]');
    expect(bodyRows.length).toBeGreaterThan(0);
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
    // Phase 2a-2 迁移：<tbody><tr> → <TableBody> 内 <TableRow> 渲染为 div[role=row]
    const bodyRows = wrapper.findAll('[role="rowgroup"]')[1]!.findAll('[role="row"]');
    expect(bodyRows.length).toBeGreaterThan(0);
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
    // Phase 2a-2 迁移：<tbody><tr> → <TableBody> 内 <TableRow> 渲染为 div[role=row]
    const bodyRows = wrapper.findAll('[role="rowgroup"]')[1]!.findAll('[role="row"]');
    expect(bodyRows.length).toBeGreaterThan(0);
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
  it("新建技术要求：<Button variant=default> 渲染 <button>，data-fn 落到真实 DOM", async () => {
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
  it("新建计算方法：<Button variant=default> 渲染 <button>，data-fn 落到真实 DOM", async () => {
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

describe("Phase 1.3a — InspectionCapabilityList 搜索/表单 <Input> 原语回归", () => {
  it("搜索框 <Input class=max-w-sm>：渲染 <input>，placeholder 落到真实 DOM", async () => {
    lastWrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "specialties" },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const search = lastWrapper.find('input[placeholder="搜索编码/名称"]');
    expect(search.exists()).toBe(true);
    // 调用方 max-w-sm 仍生效
    expect(search.classes()).toContain("max-w-sm");
  });

  it("specialties 弹窗编辑模式：编码 <Input :disabled> 真实 <input> 带 disabled 属性", async () => {
    lastWrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "specialties" },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 点编辑按钮打开弹窗
    const editBtn = lastWrapper.findAll('button[aria-label^="编辑 "]')[0];
    expect(editBtn).toBeTruthy();
    await editBtn!.trigger("click");
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 弹窗内的所有非 checkbox <input>：第一个应是「编码」+ disabled
    const dialogInputs = lastWrapper.findAll('[data-teleport-stub] input:not([type="checkbox"])');
    expect(dialogInputs.length).toBeGreaterThan(0);
    const codeInput = dialogInputs[0];
    // :disabled 必须无条件落到 DOM（Phase 0 hotfix）
    expect((codeInput.element as HTMLInputElement).disabled).toBe(true);
  });

  it("standards 排序 <Input type=number v-model.number>：$attrs 转发 type=number", async () => {
    lastWrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "standards" },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 开新建弹窗（standards 视图）
    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建检测标准");
    await createBtn!.trigger("click");
    await flushPromises();

    // 排序 input 是 type=number
    const numInput = lastWrapper.find('input[type="number"]');
    expect(numInput.exists()).toBe(true);
    expect(numInput.attributes("type")).toBe("number");
    await numInput.setValue("42");
    expect((numInput.element as HTMLInputElement).value).toBe("42");
  });
});

describe("Phase 1.3a — TechnicalRequirementList 4 维筛选 <Input> 原语回归", () => {
  it("4 个筛选框：aria-label 落到真实 <input>，调用方 max-w-32 保留", async () => {
    lastWrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    for (const ariaLabel of ["牌号筛选", "型号筛选", "等级筛选", "规格筛选"]) {
      const input = lastWrapper.find(`input[aria-label="${ariaLabel}"]`);
      expect(input.exists()).toBe(true);
      // 调用方 max-w-32 仍生效
      expect(input.classes()).toContain("max-w-32");
    }
  });

  it("牌号筛选 <Input>：v-model 双向写到 brandFilter", async () => {
    lastWrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const brand = lastWrapper.find('input[aria-label="牌号筛选"]');
    await brand.setValue("P·O 42.5");
    expect((brand.element as HTMLInputElement).value).toBe("P·O 42.5");
  });

  it("弹窗内下限/上限 <Input type=number>：$attrs 转发 type=number", async () => {
    lastWrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 开新建弹窗
    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建技术要求");
    await createBtn!.trigger("click");
    await flushPromises();

    const numInputs = lastWrapper.findAll('input[type="number"]');
    expect(numInputs.length).toBe(2); // 下限 + 上限
  });

  it("弹窗内判定标准 <Input class=font-mono>：调用方 class 经 tailwind-merge 合并", async () => {
    lastWrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建技术要求");
    await createBtn!.trigger("click");
    await flushPromises();

    const stdInput = lastWrapper.find('input[placeholder="如 GB 175-2023"]');
    expect(stdInput.exists()).toBe(true);
    // 调用方 font-mono 保留
    expect(stdInput.classes()).toContain("font-mono");
  });
});

// Phase 1.3b Input 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：搜索 <Input> 渲染真实 <input> + placeholder 落到 DOM；
// 弹窗 3 个 form <Input>：specimenCount type=number / roundingRule 字符串 / remark 字符串。
describe("Phase 1.3b — CalculationMethodList 搜索/表单 <Input> 原语回归", () => {
  it("搜索框 <Input class=max-w-sm>：渲染 <input>，placeholder 落到真实 DOM", async () => {
    lastWrapper = mountWithProviders(CalculationMethodList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const search = lastWrapper.find('input[placeholder="搜索项目/参数"]');
    expect(search.exists()).toBe(true);
    expect(search.classes()).toContain("max-w-sm");
    expect(search.classes()).toContain("h-9");
    await search.setValue("OBJ-1");
    expect((search.element as HTMLInputElement).value).toBe("OBJ-1");
  });

  it("弹窗 3 个 form <Input>：type=number 落 DOM + placeholder 转发 + v-model 写回", async () => {
    lastWrapper = mountWithProviders(CalculationMethodList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 开新建弹窗
    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建计算方法");
    await createBtn!.trigger("click");
    await flushPromises();

    // 弹窗内的 3 个 <Input>：试件数量(type=number) + 修约规则 + 备注
    const dialogInputs = lastWrapper.findAll('[data-teleport-stub] input:not([type="checkbox"])');
    expect(dialogInputs.length).toBe(3);

    // type=number 仅试件数量 1 个
    const numInput = lastWrapper.find('[data-teleport-stub] input[type="number"]');
    expect(numInput.exists()).toBe(true);
    expect(numInput.attributes("type")).toBe("number");
    await numInput.setValue("3");
    expect((numInput.element as HTMLInputElement).value).toBe("3");

    // roundingRule placeholder 落到真实 DOM
    const roundInput = lastWrapper.find('input[placeholder="如 修约到 0.1"]');
    expect(roundInput.exists()).toBe(true);
    await roundInput.setValue("修约到 0.1");
    expect((roundInput.element as HTMLInputElement).value).toBe("修约到 0.1");
  });
});

// Phase 1.4 Label 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：3 个列表页的表单 <Label> 落成真实 <label>，Label 基类活着；
// checkbox 旁的裸 <label>（迁移前无 class）迁移后拿到 text-sm font-medium。
describe("Phase 1.4 — InspectionCapabilityList 表单 <Label> 原语回归", () => {
  it("specialties 新建弹窗：编码/名称 <Label> 落成真实 <label> 且带 Label 基类", async () => {
    lastWrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "specialties" },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const createBtn = lastWrapper.findAll("button").find((b) => b.text().startsWith("新建"));
    await createBtn!.trigger("click");
    await flushPromises();

    const labels = lastWrapper.findAll("label");
    expect(labels.length).toBeGreaterThan(0);
    expect(labels[0].element.tagName).toBe("LABEL");
    expect(labels[0].text()).toBe("编码");
    expect(labels[0].classes()).toContain("font-medium");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");

    // checkbox 旁的裸 <label>（迁移前无 class）现在也走 Label 基类
    const officialLabel = labels.find((l) => l.text() === "官方");
    expect(officialLabel).toBeTruthy();
    expect(officialLabel!.classes()).toContain("text-sm");
    expect(officialLabel!.classes()).toContain("font-medium");
    // Phase 2b 后 checkbox 已迁 <Checkbox> 原语（reka-ui CheckboxRoot = <button role=checkbox>）
    expect(lastWrapper.find('[role="checkbox"]').exists()).toBe(true);
  });
});

describe("Phase 1.4 — TechnicalRequirementList 表单 <Label> 原语回归", () => {
  it("新建弹窗 11 个 <Label> 落成真实 <label>，首个文本「检测项目」", async () => {
    lastWrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建技术要求");
    await createBtn!.trigger("click");
    await flushPromises();

    const labels = lastWrapper.findAll("label");
    expect(labels.length).toBe(11);
    expect(labels[0].text()).toBe("检测项目");
    expect(labels[0].classes()).toContain("font-medium");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
    expect(labels[10].text()).toBe("备注");
  });
});

describe("Phase 1.4 — CalculationMethodList 表单 <Label> 原语回归", () => {
  it("新建弹窗 7 个 <Label> 落成真实 <label>，首个文本「检测项目」", async () => {
    lastWrapper = mountWithProviders(CalculationMethodList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === "新建计算方法");
    await createBtn!.trigger("click");
    await flushPromises();

    const labels = lastWrapper.findAll("label");
    expect(labels.length).toBe(7);
    expect(labels[0].text()).toBe("检测项目");
    expect(labels[0].classes()).toContain("font-medium");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
  });
});

// Phase 2a-2 Table 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁 3 件事：<Table> 渲染 div[role=table] / <TableHead> 渲染 div[role=columnheader] /
// <TableRow> 数据行在 rowgroup[1]（TableBody），不带 data-fn。
describe("Phase 2a-2 — InspectionCapabilityList <Table> 原语回归", () => {
  it("specialties 视图：<Table> 渲染 div[role=table]；6 <TableHead>（编码/名称/官方序号/官方/状态 + 操作）", async () => {
    lastWrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "specialties" },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const table = lastWrapper.find('[role="table"]');
    expect(table.exists()).toBe(true);
    const heads = lastWrapper.findAll('[role="columnheader"]');
    // columnHeaders() 给 specialties 返回 5 列 + 操作列 = 6
    expect(heads.length).toBe(6);
    expect(heads.map((h) => h.text())).toEqual([
      "编码",
      "名称",
      "官方序号",
      "官方/自定义",
      "状态",
      "操作",
    ]);
  });

  it("parameters 视图：行内「关联标准」按钮 data-fn 落到真实 <button>，行在 rowgroup[1]", async () => {
    lastWrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "parameters" },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 1 fixture 行
    const bodyRows = lastWrapper.findAll('[role="rowgroup"]')[1]!.findAll('[role="row"]');
    expect(bodyRows.length).toBe(1);

    // 行内关联标准按钮
    const linkBtn = lastWrapper.find('button[data-fn="M06.F03.I02"]');
    expect(linkBtn.exists()).toBe(true);
    expect(linkBtn.attributes("aria-label")).toBe("关联标准 P-1");
  });
});

describe("Phase 2a-2 — CalculationMethodList <Table> 原语回归", () => {
  it("<Table> 渲染 div[role=table]；7 <TableHead>（项目/参数/判定标准/算法类型/试件数量/备注 + 操作）", async () => {
    lastWrapper = mountWithProviders(CalculationMethodList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const table = lastWrapper.find('[role="table"]');
    expect(table.exists()).toBe(true);
    const heads = lastWrapper.findAll('[role="columnheader"]');
    expect(heads.length).toBe(7);
    expect(heads.map((h) => h.text())).toEqual([
      "检测项目",
      "检测参数",
      "判定标准",
      "算法类型",
      "试件数量",
      "备注",
      "操作",
    ]);
  });

  it("1 fixture 行：判定标准 cell 用 font-mono + text-xs 渲染（调用方 class 经 tailwind-merge 合并）", async () => {
    lastWrapper = mountWithProviders(CalculationMethodList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 行内第 3 个 cell（0-indexed） 是判定标准 cell（class=\"font-mono text-xs\"）
    const stdCell = lastWrapper.findAll('[role="rowgroup"]')[1]!
      .findAll('[role="row"]')[0]!
      .findAll('[role="cell"]')[2];
    expect(stdCell.exists()).toBe(true);
    expect(stdCell.classes()).toContain("font-mono");
    expect(stdCell.classes()).toContain("text-xs");
  });
});

describe("Phase 2a-2 — TechnicalRequirementList <Table> 原语回归", () => {
  it("<Table> 渲染 div[role=table]；11 <TableHead>（10 列 + 操作列）", async () => {
    lastWrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const table = lastWrapper.find('[role="table"]');
    expect(table.exists()).toBe(true);
    const heads = lastWrapper.findAll('[role="columnheader"]');
    expect(heads.length).toBe(11);
    expect(heads.map((h) => h.text())).toEqual([
      "检测项目",
      "检测参数",
      "判定标准",
      "牌号",
      "型号",
      "等级",
      "规格",
      "判定方式",
      "上限",
      "下限",
      "操作",
    ]);
  });

  it("1 fixture 行：判定标准 cell 用 font-mono + text-xs 渲染", async () => {
    lastWrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 行内第 3 个 cell（0-indexed） 是判定标准 cell
    const stdCell = lastWrapper.findAll('[role="rowgroup"]')[1]!
      .findAll('[role="row"]')[0]!
      .findAll('[role="cell"]')[2];
    expect(stdCell.exists()).toBe(true);
    expect(stdCell.classes()).toContain("font-mono");
    expect(stdCell.classes()).toContain("text-xs");
  });
});

// Phase 2e-3 —— 新建/编辑弹窗从手写 <Teleport>+遮罩 div 换成 <Dialog> 家族。
// 锁「换底座后新拿到的东西」+「@entry / data-fn 这类 L5 锚点没被结构改动吞掉」。
describe("Phase 2e-3 — CalculationMethodList 表单弹窗走 Dialog 底座", () => {
  async function openForm(): Promise<VueWrapper> {
    lastWrapper = mountWithProviders(CalculationMethodList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = lastWrapper
      .findAll("button")
      .find((b) => b.text() === "新建计算方法")!;
    await createBtn.trigger("click");
    await flushPromises();
    return lastWrapper;
  }

  it("弹窗渲染 div[role=dialog]，标题/描述经 reka context 连上 aria", async () => {
    const w = await openForm();

    const content = w.find('[role="dialog"]');
    expect(content.exists()).toBe(true);

    const titleId = content.attributes("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(w.find(`#${titleId}`).text()).toBe("新建计算方法");

    const descId = content.attributes("aria-describedby");
    expect(descId).toBeTruthy();
    expect(w.find(`#${descId}`).text()).toContain("复合主键");
  });

  it("保存按钮的 data-fn 没被结构改动吞掉，仍落在真实 <button> 上且弹窗内只有一个", async () => {
    const w = await openForm();

    const save = w.find('button[data-fn="M06.F05.I01"][class*="inline-flex"]');
    expect(save.exists()).toBe(true);
    // 页头「新建计算方法」同 data-fn，靠文本区分；弹窗内必须是「保存」
    const inDialog = w.find('[role="dialog"]').findAll('button[data-fn="M06.F05.I01"]');
    expect(inDialog.length).toBe(1);
    expect(inDialog[0]!.text()).toBe("保存");
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

// Phase 2e-3 —— 新建/编辑弹窗从手写 <Teleport>+遮罩 div 换成 <Dialog> 家族。
// 锁「换底座后新拿到的东西」+「@entry / data-fn 这类 L5 锚点没被结构改动吞掉」。
describe("Phase 2e-3 — TechnicalRequirementList 表单弹窗走 Dialog 底座", () => {
  async function openForm(): Promise<VueWrapper> {
    lastWrapper = mountWithProviders(TechnicalRequirementList);
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = lastWrapper
      .findAll("button")
      .find((b) => b.text() === "新建技术要求")!;
    await createBtn.trigger("click");
    await flushPromises();
    return lastWrapper;
  }

  it("弹窗渲染 div[role=dialog]，标题/描述经 reka context 连上 aria", async () => {
    const w = await openForm();

    const content = w.find('[role="dialog"]');
    expect(content.exists()).toBe(true);

    const titleId = content.attributes("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(w.find(`#${titleId}`).text()).toBe("新建技术要求");

    const descId = content.attributes("aria-describedby");
    expect(descId).toBeTruthy();
    expect(w.find(`#${descId}`).text()).toContain("复合主键");
  });

  it("保存按钮的 data-fn 没被结构改动吞掉，仍落在真实 <button> 上且弹窗内只有一个", async () => {
    const w = await openForm();

    const save = w.find('button[data-fn="M06.F06.I02"][class*="inline-flex"]');
    expect(save.exists()).toBe(true);
    // 页头「新建技术要求」同 data-fn，靠文本区分；弹窗内必须是「保存」
    const inDialog = w.find('[role="dialog"]').findAll('button[data-fn="M06.F06.I02"]');
    expect(inDialog.length).toBe(1);
    expect(inDialog[0]!.text()).toBe("保存");
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


// Phase 2e-3 batch 2 —— 新建/编辑弹窗从手写 <Teleport>+遮罩 div 换成 <Dialog> 家族。
// 锁「换底座后新拿到的东西」+「@entry / data-fn 这类 L5 锚点没被结构改动吞掉」。
describe("Phase 2e-3 — InspectionCapabilityList 表单弹窗走 Dialog 底座", () => {
  async function openForm(resource: string, label: string): Promise<VueWrapper> {
    lastWrapper = mountWithProviders(InspectionCapabilityList, { props: { resource } });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const createBtn = lastWrapper.findAll("button").find((b) => b.text() === label)!;
    await createBtn.trigger("click");
    await flushPromises();
    return lastWrapper;
  }

  it("弹窗渲染 div[role=dialog]，标题/描述经 reka context 连上 aria", async () => {
    const w = await openForm("specialties", "新建检测专项");

    const content = w.find('[role="dialog"]');
    expect(content.exists()).toBe(true);

    const titleId = content.attributes("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(w.find(`#${titleId}`).text()).toBe("新建检测专项");

    const descId = content.attributes("aria-describedby");
    expect(descId).toBeTruthy();
    expect(w.find(`#${descId}`).text()).toContain("填写后保存");
  });

  it("objects 视图描述文案（关联说明）仍经 DialogDescription 连上 aria-describedby", async () => {
    const w = await openForm("objects", "新建检测项目");

    const content = w.find('[role="dialog"]');
    const descId = content.attributes("aria-describedby");
    expect(descId).toBeTruthy();
    expect(w.find(`#${descId}`).text()).toContain("项目↔专项/参数关联");
  });

  it("保存按钮的 data-fn 没被结构改动吞掉，仍落在真实 <button> 上且弹窗内只有一个", async () => {
    // standards 视图：fnCreate = 标准 CRUD，与页头「新建检测标准」同 data-fn，靠文本区分
    const w = await openForm("standards", "新建检测标准");

    const save = w.find('button[data-fn="M06.F04.I02"][class*="inline-flex"]');
    expect(save.exists()).toBe(true);
    const inDialog = w.find('[role="dialog"]').findAll('button[data-fn="M06.F04.I02"]');
    expect(inDialog.length).toBe(1);
    expect(inDialog[0]!.text()).toBe("保存");
  });

  it("列表行内 data-fn 锚点不受弹窗换底座影响（parameters 视图 根容器 + 关联标准键）", async () => {
    lastWrapper = mountWithProviders(InspectionCapabilityList, {
      props: { resource: "parameters" },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    // 根容器 data-fn 仍在
    expect(lastWrapper.find('[data-fn="M06.F03.I01"]').exists()).toBe(true);
    // 行内「关联标准」按钮 data-fn 仍落在真实 <button>
    const link = lastWrapper.find('button[data-fn="M06.F03.I02"]');
    expect(link.exists()).toBe(true);
    expect(link.element.tagName).toBe("BUTTON");
  });

  it("ESC 关闭弹窗（走 @update:open → closeDialog）", async () => {
    const w = await openForm("specialties", "新建检测专项");
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
