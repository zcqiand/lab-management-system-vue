// vue 仓 6 张模型卡 + 算法 dom 测试（concrete / rebar-welding / rebar-mech / particle / soil）。
// 镜像 react 仓同名测试文件，针对 vue 仓 <script setup lang="ts"> 的 selectors 做了调整。

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import ConcreteCompressCard from "@/features/data-entry/models/ConcreteCompressCard.vue";
import ConcretePermeabilityCard from "@/features/data-entry/models/ConcretePermeabilityCard.vue";
import RebarWeldingTensileCard from "@/features/data-entry/models/RebarWeldingTensileCard.vue";
import RebarWeldingBendCard from "@/features/data-entry/models/RebarWeldingBendCard.vue";
import RebarMechNumericCard from "@/features/data-entry/models/RebarMechNumericCard.vue";
import ParticleGradationCard from "@/features/data-entry/models/ParticleGradationCard.vue";
import SoilCompactionCard from "@/features/data-entry/models/SoilCompactionCard.vue";
import SoilCompactionDegreeCard from "@/features/data-entry/models/SoilCompactionDegreeCard.vue";
import StrengthCardBase from "@/features/data-entry/models/StrengthCardBase.vue";
import CementCompressCard from "@/features/data-entry/models/CementCompressCard.vue";
import DefaultParamCard from "@/features/data-entry/models/DefaultParamCard.vue";
import {
  tensileStrength,
  REBAR_DIAMETER_MM,
} from "@/features/data-entry/models/rebar-welding";
import {
  computeStrengths,
  ratioTensileOverYield,
} from "@/features/data-entry/models/rebar-mechanics";
import {
  computeCompactionPeak,
} from "@/features/data-entry/models/soil-compaction";
import {
  computeCompactionDegree,
} from "@/features/data-entry/models/soil-compaction-degree";
import {
  computeConcretePermeability,
} from "@/features/data-entry/models/concrete-permeability";
import type { ParamModelProps } from "@/features/data-entry/models/types";
import type { InspectionParameter } from "@/api/endpoints/endpoints.schemas";

const param = (code: string, name: string, unit?: string): InspectionParameter =>
  ({
    id: code,
    code,
    name,
    rawName: name,
    canonicalName: name,
    aliases: [],
    unit,
    sourceType: "official",
    sortOrder: 1,
    createdAt: "",
    updatedAt: "",
  }) as InspectionParameter;

function makeProps(over: Partial<ParamModelProps> = {}): ParamModelProps {
  return {
    parameter: param("IP-0055", "立方体抗压强度"),
    record: undefined,
    sampleId: "s1",
    standards: [],
    stdParams: [],
    techReqs: [],
    config: undefined,
    onChange: vi.fn(),
    readOnly: false,
    ...over,
  };
}

// ============ 算法纯函数测试 ============

fnTest(["M03.F03.I01"], "rebar-welding：抗拉 Rm=4000·F/(π·d²)（Φ22 硬编码）", () => {
  expect(REBAR_DIAMETER_MM).toBe(22);
  expect(tensileStrength(100, 22)).toBeCloseTo(263.2, 0);
  expect(tensileStrength(0, 22)).toBe(0);
});

fnTest(["M03.F03.I01"], "rebar-mechanics：tensile_strength 算子", () => {
  const s = computeStrengths([100, 110], 22);
  expect(s[0]).toBeCloseTo(263.2, 0);
  expect(s[1]).toBeCloseTo(289.5, 0);
});

fnTest(["M03.F03.I01"], "rebar-mechanics：强屈比", () => {
  const r = ratioTensileOverYield([540, 560], [400, 420], 2);
  expect(r[0]).toBeCloseTo(1.35, 1);
  expect(r[1]).toBeCloseTo(1.33, 1);
});

fnTest(["M03.F03.I01"], "soil-compaction：二次拟合峰值", () => {
  const r = computeCompactionPeak([
    { moisture: 8, dryDensity: 1.7 },
    { moisture: 12, dryDensity: 1.9 },
    { moisture: 16, dryDensity: 1.8 },
  ]);
  expect(r.maxDryDensity).toBeGreaterThan(1.9);
  expect(r.optimalMoisture).toBeGreaterThan(11);
});

fnTest(["M03.F03.I01"], "soil-compaction-degree：干密度 + 压实度 + 评定", () => {
  const r = computeCompactionDegree(
    { code: "", part: "", layer: "", designDegree: 96, wetDensity: 1.92, moisture: 10 },
    1.9,
  );
  expect(r.dryDensity).toBeCloseTo(1.745, 2);
  expect(r.degree).toBeCloseTo(91.8, 1);
  expect(r.verdict).toBe("不合格");
});

fnTest(["M03.F03.I01"], "concrete-permeability：6 件全未渗 → grade undefined", () => {
  const r = computeConcretePermeability(
    Array.from({ length: 6 }, () => ({ pressure: 0, permeated: "未渗" as const })),
  );
  expect(r.grade).toBeUndefined();
  expect(r.gradeLabel).toBe("—");
});

fnTest(["M03.F03.I01"], "concrete-permeability：3 件已渗 → grade = 第3件压力", () => {
  const r = computeConcretePermeability([
    { pressure: 0.6, permeated: "已渗" },
    { pressure: 0.7, permeated: "已渗" },
    { pressure: 0.8, permeated: "已渗" }, // ← 第 3 个已渗
    { pressure: 0.9, permeated: "未渗" },
    { pressure: 1.0, permeated: "未渗" },
    { pressure: 1.1, permeated: "未渗" },
  ]);
  expect(r.grade).toBe(0.8);
  expect(r.gradeLabel).toBe("P8");
});

// ============ 组件 dom 测试 ============

describe("ConcreteCompressCard", () => {
  beforeEach(() => vi.clearAllMocks());

  fnTest(["M03.F03.I01"], "ConcreteCompressCard 渲染 3 个破坏荷载输入框", () => {
    const wrapper = mount(ConcreteCompressCard, { props: makeProps() });
    expect(
      wrapper.findAll('input[type="number"][placeholder="破坏荷载 (kN)"]').length,
    ).toBe(3);
  });

  fnTest(["M03.F03.I02"], "ConcreteCompressCard 录入荷载 → 上报代表值 JSON", () => {
    const onChange = vi.fn();
    const wrapper = mount(ConcreteCompressCard, { props: makeProps({ onChange }) });
    const inputs = wrapper.findAll('input[type="number"][placeholder="破坏荷载 (kN)"]');
    inputs[0]!.setValue("450");
    inputs[1]!.setValue("450");
    inputs[2]!.setValue("450");
    const last = onChange.mock.calls.at(-1)![0];
    const parsed = JSON.parse(last.result);
    expect(parsed.representative).toBeCloseTo(20, 0);
  });
});

describe("ConcretePermeabilityCard", () => {
  beforeEach(() => vi.clearAllMocks());

  fnTest(["M03.F03.I01"], "ConcretePermeabilityCard 渲染 6 个渗水压力输入", () => {
    const wrapper = mount(ConcretePermeabilityCard, {
      props: makeProps({ parameter: param("IP-0190", "抗渗性能") }),
    });
    expect(
      wrapper.findAll('input[aria-label^="试件"][aria-label$="渗水压力"]').length,
    ).toBe(6);
  });
});

describe("RebarWeldingTensileCard", () => {
  beforeEach(() => vi.clearAllMocks());

  fnTest(["M03.F03.I01"], "RebarWeldingTensileCard 渲染 3 行 + 共享规格 Φ22", () => {
    const wrapper = mount(RebarWeldingTensileCard, { props: makeProps() });
    expect(wrapper.text()).toContain("Φ22");
    expect(
      wrapper.findAll('input[aria-label^="试件"][aria-label$="最大荷重"]').length,
    ).toBe(3);
  });
});

describe("RebarWeldingBendCard", () => {
  beforeEach(() => vi.clearAllMocks());

  fnTest(["M03.F03.I01"], "RebarWeldingBendCard 渲染 3 行弯曲角度 + 整体评定", () => {
    const wrapper = mount(RebarWeldingBendCard, { props: makeProps() });
    expect(
      wrapper.findAll('input[aria-label^="试件"][aria-label$="弯曲角度"]').length,
    ).toBe(3);
    expect(wrapper.text()).toContain("JGJ/T 27-2014");
    expect(wrapper.find(".text-green-600")?.text()).toBe("合格");
  });
});

describe("RebarMechNumericCard", () => {
  beforeEach(() => vi.clearAllMocks());

  fnTest(["M03.F03.I01"], "RebarMechNumericCard tensile_strength：2 组 + 公称直径输入", () => {
    const wrapper = mount(RebarMechNumericCard, {
      props: makeProps({
        parameter: param("IP-0087", "抗拉强度"),
        config: { formulaKey: "tensile_strength", specimenCount: 2, needsDiameter: true },
      }),
    });
    expect(
      wrapper.findAll('input[aria-label^="第"][aria-label$="组 数值"]').length,
    ).toBe(2);
    expect(wrapper.find('input[aria-label="公称直径"]').exists()).toBe(true);
  });
});

describe("ParticleGradationCard", () => {
  beforeEach(() => vi.clearAllMocks());

  fnTest(["M03.F03.I01"], "ParticleGradationCard 渲染砂 7 筛孔 + 平均行", () => {
    const wrapper = mount(ParticleGradationCard, {
      props: makeProps({ parameter: param("IP-0577", "颗粒级配") }),
    });
    expect(wrapper.text()).toContain("4.75mm");
    expect(wrapper.text()).toContain("筛底");
    expect(wrapper.text()).toContain("平均值(%)");
  });

  fnTest(["M03.F03.I02"], "ParticleGradationCard gravel=true 切换到 12 筛孔", () => {
    const wrapper = mount(ParticleGradationCard, {
      props: makeProps({
        parameter: param("IP-0577", "颗粒级配"),
        config: { gravel: true },
      }),
    });
    expect(wrapper.text()).toContain("90mm");
  });
});

describe("SoilCompactionCard", () => {
  beforeEach(() => vi.clearAllMocks());

  fnTest(["M03.F03.I01"], "SoilCompactionCard 渲染 5 组 + GB/T 50123-2019 标识", () => {
    const wrapper = mount(SoilCompactionCard, { props: makeProps() });
    expect(
      wrapper.findAll('input[aria-label^="第"][aria-label$="组含水率"]').length,
    ).toBe(5);
    expect(wrapper.text()).toContain("GB/T 50123-2019");
  });
});

describe("SoilCompactionDegreeCard", () => {
  beforeEach(() => vi.clearAllMocks());

  fnTest(["M03.F03.I01"], "SoilCompactionDegreeCard 渲染 6 行 + 最大干密度输入", () => {
    const wrapper = mount(SoilCompactionDegreeCard, {
      props: makeProps({ parameter: param("IP-0456", "压实度") }),
    });
    expect(
      wrapper.findAll('input[aria-label^="第"][aria-label$="行试样编号"]').length,
    ).toBe(6);
    expect(wrapper.find('input[aria-label="最大干密度"]').exists()).toBe(true);
  });
});

// Phase 1.3c Input 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：raw <input type=text|number> → <Input> 原语后，aria-label / step / placeholder /
// readonly 经 $attrs 落到真实 <input>；CVA base h-9 + border-input 活着；调用方 class
// (w-32 / w-20 / read-only:bg-gray-50) 经 tailwind-merge 与 CVA base 合成；
// @change 在 blur 时仍触发 cards 的 updateFn，且 onChange 被调用。
let lastCardWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastCardWrapper) {
    lastCardWrapper.unmount();
    lastCardWrapper = null;
  }
});

describe("Phase 1.3c — 模型卡 <Input> 原语回归", () => {
  it("ConcreteCompressCard：破坏荷载 <Input> 渲染 type=number + aria-label + @change 触发 updateLoad", () => {
    const onChange = vi.fn();
    lastCardWrapper = mount(ConcreteCompressCard, { props: makeProps({ onChange }) });
    const input = lastCardWrapper.find('input[placeholder="破坏荷载 (kN)"]');
    expect(input.exists()).toBe(true);
    expect(input.element.tagName).toBe("INPUT");
    // CVA base h-9 活着
    expect(input.classes()).toContain("h-9");
    // 调用方 w-32 仍生效
    expect(input.classes()).toContain("w-32");
    // type=number 经 $attrs 落 DOM
    expect(input.attributes("type")).toBe("number");
    // @change 触发 updateLoad → onChange 上报代表值
    input.setValue("450");
    input.trigger("change");
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0];
    const parsed = JSON.parse(last.result);
    expect(parsed.loads[0]).toBe(450);
  });

  it("ConcretePermeabilityCard：渗水压力 <Input> aria-label + step 经 $attrs 落到真实 <input>", () => {
    const wrapper = mount(ConcretePermeabilityCard, {
      props: makeProps({ parameter: param("IP-0190", "抗渗性能") }),
    });
    const input = wrapper.find('input[aria-label="试件 1 渗水压力"]');
    expect(input.exists()).toBe(true);
    expect(input.element.tagName).toBe("INPUT");
    expect(input.attributes("type")).toBe("number");
    expect(input.attributes("step")).toBe("0.1");
    expect(input.classes()).toContain("w-32");
  });

  it("RebarWeldingTensileCard：最大荷重 + 断口距 <Input> 双 type=number + aria-label 双落到 DOM", () => {
    const wrapper = mount(RebarWeldingTensileCard, { props: makeProps() });
    const loadInput = wrapper.find('input[aria-label="试件 1 最大荷重"]');
    const distInput = wrapper.find('input[aria-label="试件 1 断口距"]');
    expect(loadInput.exists()).toBe(true);
    expect(distInput.exists()).toBe(true);
    expect(loadInput.attributes("type")).toBe("number");
    expect(distInput.attributes("type")).toBe("number");
    expect(loadInput.attributes("step")).toBe("0.01");
    expect(distInput.attributes("step")).toBe("0.1");
    expect(loadInput.classes()).toContain("w-24");
    expect(distInput.classes()).toContain("w-20");
  });

  it("RebarWeldingBendCard：弯曲角度 <Input> + @change 触发 updateAngle → onChange", () => {
    const onChange = vi.fn();
    const wrapper = mount(RebarWeldingBendCard, { props: makeProps({ onChange }) });
    const input = wrapper.find('input[aria-label="试件 1 弯曲角度"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes("type")).toBe("number");
    input.setValue("90");
    input.trigger("change");
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0];
    const parsed = JSON.parse(last.result);
    expect(parsed.angles[0]).toBe(90);
  });

  it("RebarMechNumericCard tensile_strength：直径 + 2 组荷载 <Input> 共 3 个全数 type=number", () => {
    const wrapper = mount(RebarMechNumericCard, {
      props: makeProps({
        parameter: param("IP-0087", "抗拉强度"),
        config: { formulaKey: "tensile_strength", specimenCount: 2, needsDiameter: true },
      }),
    });
    const dia = wrapper.find('input[aria-label="公称直径"]');
    const l1 = wrapper.find('input[aria-label="第 1 组 数值"]');
    const l2 = wrapper.find('input[aria-label="第 2 组 数值"]');
    expect(dia.exists()).toBe(true);
    expect(l1.exists()).toBe(true);
    expect(l2.exists()).toBe(true);
    expect(dia.attributes("type")).toBe("number");
    expect(l1.attributes("type")).toBe("number");
  });

  it("ParticleGradationCard：分筛前/分计/分筛后 3 类 <Input> 均 type=number + aria-label 落到 DOM", () => {
    const wrapper = mount(ParticleGradationCard, {
      props: makeProps({ parameter: param("IP-0577", "颗粒级配") }),
    });
    const before = wrapper.find('input[aria-label="第 1 行 分筛前总量"]');
    const pct = wrapper.find('input[aria-label="第 1 行 4.75mm 分计筛余"]');
    const after = wrapper.find('input[aria-label="第 1 行 分筛后总量"]');
    expect(before.exists()).toBe(true);
    expect(pct.exists()).toBe(true);
    expect(after.exists()).toBe(true);
    expect(before.attributes("type")).toBe("number");
    expect(pct.attributes("type")).toBe("number");
    expect(after.attributes("type")).toBe("number");
  });

  it("SoilCompactionCard：5 组含水率 + 干密度 <Input> 经 $attrs 全部落 DOM", () => {
    const wrapper = mount(SoilCompactionCard, { props: makeProps() });
    const m1 = wrapper.find('input[aria-label="第 1 组含水率"]');
    const d1 = wrapper.find('input[aria-label="第 1 组干密度"]');
    expect(m1.exists()).toBe(true);
    expect(d1.exists()).toBe(true);
    expect(m1.attributes("type")).toBe("number");
    expect(d1.attributes("type")).toBe("number");
    expect(m1.attributes("step")).toBe("0.1");
    expect(d1.attributes("step")).toBe("0.001");
  });

  it("SoilCompactionDegreeCard：最大干密度 + 6 行 × 6 字段 <Input> aria-label 全部落到 DOM", () => {
    const wrapper = mount(SoilCompactionDegreeCard, {
      props: makeProps({ parameter: param("IP-0456", "压实度") }),
    });
    const max = wrapper.find('input[aria-label="最大干密度"]');
    expect(max.exists()).toBe(true);
    expect(max.attributes("type")).toBe("number");
    expect(max.attributes("step")).toBe("0.001");
    // 6 行试样编号
    expect(
      wrapper.findAll('input[aria-label^="第"][aria-label$="行试样编号"]').length,
    ).toBe(6);
    // 含水率 step=0.1
    expect(
      wrapper.find('input[aria-label="第 1 行含水率"]')?.attributes("step"),
    ).toBe("0.1");
    // 湿密度 step=0.001
    expect(
      wrapper.find('input[aria-label="第 1 行湿密度"]')?.attributes("step"),
    ).toBe("0.001");
  });

  it("StrengthCardBase：破坏荷载 <Input> 经 $attrs 落 readonly + read-only 灰化样式", () => {
    const wrapper = mount(StrengthCardBase, {
      props: {
        ...makeProps(),
        specimenCount: 3,
        compute: (l: number[]) => ({ strengths: l.map(() => 0), mean: 0, kept: [true, true, true], invalid: false }),
        strengthLabel: "抗压 (MPa)",
      },
    });
    const input = wrapper.find('input[aria-label="试件 1 破坏荷载"]');
    expect(input.exists()).toBe(true);
    expect(input.attributes("type")).toBe("number");
    // 调用方 w-32 仍生效
    expect(input.classes()).toContain("w-32");
    // read-only: 灰化样式经 tailwind-merge 合成
    expect(input.classes().some((c) => c.includes("read-only:"))).toBe(true);
  });

  it("RebarWeldingBendCard readOnly：<Input> readonly 落到 DOM，@change 仍不触发 onChange", () => {
    const onChange = vi.fn();
    const wrapper = mount(RebarWeldingBendCard, {
      props: makeProps({ onChange, readOnly: true }),
    });
    const input = wrapper.find('input[aria-label="试件 1 弯曲角度"]');
    // readOnly 经 $attrs 转发为 readonly 属性落到真实 DOM input
    expect((input.element as HTMLInputElement).readOnly).toBe(true);
    input.setValue("90");
    input.trigger("change");
    expect(onChange).not.toHaveBeenCalled();
  });
});

// Phase 1.4 Label 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：模型卡 raw <label> → <Label> 后仍是真实 <label>；调用方 text-xs 压过基类
// text-sm（卡片小字号视觉不回归）；SoilCompactionDegreeCard 的 wrapping 模式保留。
describe("Phase 1.4 — 模型卡 <Label> 原语回归", () => {
  it("SoilCompactionDegreeCard：<Label class=text-xs> 包着最大干密度 <input>（wrapping 保留）", () => {
    lastCardWrapper = mount(SoilCompactionDegreeCard, {
      props: makeProps({ parameter: param("IP-0200", "压实度") }),
    });
    const labels = lastCardWrapper.findAll("label");
    expect(labels.length).toBe(1);
    expect(labels[0].element.tagName).toBe("LABEL");
    expect(labels[0].text()).toContain("最大干密度");
    // wrapping：<Input> 渲染出的真实 <input> 是 <label> 的后代
    expect(labels[0].find('input[aria-label="最大干密度"]').exists()).toBe(true);
    // tailwind-merge：调用方 text-xs 压掉基类 text-sm
    expect(labels[0].classes()).toContain("text-xs");
    expect(labels[0].classes()).not.toContain("text-sm");
    expect(labels[0].classes()).toContain("font-medium");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
  });

  it("StrengthCardBase：技术要求 <Label> 落成真实 <label>，旁边 <select> 仍是 raw", () => {
    lastCardWrapper = mount(StrengthCardBase, {
      props: {
        ...makeProps(),
        specimenCount: 3,
        compute: (l: number[]) => ({ strengths: l.map(() => 0), mean: 0, kept: [true, true, true], invalid: false }),
        strengthLabel: "抗压 (MPa)",
      },
    });
    const labels = lastCardWrapper.findAll("label");
    expect(labels.length).toBe(1);
    // techReqs 为空 → 渲染「单项评定」分支
    expect(labels[0].text()).toBe("单项评定");
    expect(labels[0].classes()).toContain("text-xs");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
    // <select> 留 Phase 2d，仍是 raw
    expect(lastCardWrapper.find("select").exists()).toBe(true);
  });

  it("CementCompressCard：6 个试件 <Label> 落成真实 <label>，文本「试件 N」", () => {
    lastCardWrapper = mount(CementCompressCard, {
      props: makeProps({ parameter: param("IP-0001", "抗压强度", "MPa") }),
    });
    const labels = lastCardWrapper.findAll("label");
    expect(labels.length).toBe(6);
    expect(labels[0].element.tagName).toBe("LABEL");
    expect(labels[0].text()).toBe("试件 1");
    expect(labels[5].text()).toBe("试件 6");
    expect(labels[0].classes()).toContain("text-xs");
    expect(labels[0].classes()).not.toContain("text-sm");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
  });

  it("DefaultParamCard：4 个 <Label> 落成真实 <label>，text-xs 补回卡片小字号", () => {
    lastCardWrapper = mount(DefaultParamCard, {
      props: makeProps({ parameter: param("IP-9999", "兜底参数") }),
    });
    const labels = lastCardWrapper.findAll("label");
    expect(labels.length).toBe(4);
    expect(labels.map((l) => l.text())).toEqual([
      "检测依据",
      "技术要求",
      "检测结果",
      "单项评定",
    ]);
    // 迁移时补 text-xs：基类 text-sm 会放大卡片字号，这条锁住视觉不回归
    expect(labels[0].classes()).toContain("text-xs");
    expect(labels[0].classes()).not.toContain("text-sm");
    expect(labels[0].classes()).toContain("block");
    expect(labels[0].classes()).toContain("peer-disabled:opacity-70");
  });
});