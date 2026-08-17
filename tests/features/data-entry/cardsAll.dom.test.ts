// vue 仓 6 张模型卡 + 算法 dom 测试（concrete / rebar-welding / rebar-mech / particle / soil）。
// 镜像 react 仓同名测试文件，针对 vue 仓 <script setup lang="ts"> 的 selectors 做了调整。

import { describe, it, expect, vi, beforeEach } from "vitest";
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