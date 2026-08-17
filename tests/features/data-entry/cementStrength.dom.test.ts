// cementStrength 算法 + CementCompressCard / CementFlexuralCard dom 测试（vue 仓）。
// 镜像 react 仓 cementStrength.dom.test.tsx + nextjs REF 218 行版本。

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import {
  flexuralStrength,
  compressStrength,
  reduceStrengths,
  computeCementFlexural,
  computeCementCompress,
  autoVerdict,
  parseStrengthRecord,
} from "@/features/data-entry/models/cement-strength";
import CementCompressCard from "@/features/data-entry/models/CementCompressCard.vue";
import CementFlexuralCard from "@/features/data-entry/models/CementFlexuralCard.vue";
import type { ParamModelProps } from "@/features/data-entry/models/types";
import type { InspectionParameter } from "@/api/endpoints/endpoints.schemas";

fnTest(["M03.F03.I01"], "水泥胶砂强度：抗折 Rf=1.5·F·L/b³（2kN → 4.7 MPa）", () => {
  expect(flexuralStrength(2)).toBe(4.7);
  expect(flexuralStrength(0)).toBe(0);
});

fnTest(["M03.F03.I01"], "水泥胶砂强度：抗压 Rc=F/A（16kN → 10.0；80kN → 50.0 MPa）", () => {
  expect(compressStrength(16)).toBe(10);
  expect(compressStrength(80)).toBe(50);
});

describe("reduceStrengths ±10% 剔除", () => {
  it("全部一致 → 无剔除、均值即该值、有效", () => {
    const r = reduceStrengths([50, 50, 50, 50, 50, 50]);
    expect(r.mean).toBe(50);
    expect(r.invalid).toBe(false);
    expect(r.kept.every(Boolean)).toBe(true);
  });

  it("单个离群值被剔除、均值取剩余、仍有效", () => {
    const r = reduceStrengths([30, 50, 50, 50, 50, 50]);
    expect(r.mean).toBe(50);
    expect(r.invalid).toBe(false);
    expect(r.kept).toEqual([false, true, true, true, true, true]);
  });

  it("多于一个离群 → 作废 invalid=true（仍给出幸存均值）", () => {
    const r = reduceStrengths([30, 50, 50, 50, 50, 70]);
    expect(r.invalid).toBe(true);
    expect(r.mean).toBe(50);
    expect(r.kept).toEqual([false, true, true, true, true, false]);
  });

  it("无有效荷载 → 均值 undefined、非作废", () => {
    const r = reduceStrengths([0, 0, 0]);
    expect(r.mean).toBeUndefined();
    expect(r.invalid).toBe(false);
  });
});

describe("computeCementFlexural / computeCementCompress", () => {
  it("抗折 3 荷载 → 3 强度 + 均值", () => {
    const r = computeCementFlexural([2, 2, 2]);
    expect(r.strengths).toEqual([4.7, 4.7, 4.7]);
    expect(r.mean).toBe(4.7);
  });

  it("抗压 6 荷载 → 6 强度 + 均值；缺失项记 0/false", () => {
    const r = computeCementCompress([80, 80, 80, 80, 80, 0]);
    expect(r.strengths).toEqual([50, 50, 50, 50, 50, 0]);
    expect(r.mean).toBe(50);
    expect(r.kept[5]).toBe(false);
  });
});

describe("autoVerdict 均值 vs 技术要求", () => {
  const req = (
    over: Partial<{ comparison: string; minValue: number | null; maxValue: number | null; valueType: string }>,
  ): unknown => ({
    inspectionParameterCode: "IP-0556",
    comparison: "≥",
    minValue: 17,
    valueType: "numeric",
    ...over,
  });

  it("≥：均值达标→合格，不达标→不合格", () => {
    expect(autoVerdict(20, req({}) as never)).toBe("合格");
    expect(autoVerdict(15, req({}) as never)).toBe("不合格");
  });

  it("无均值或无要求 → 空（无法判定）", () => {
    expect(autoVerdict(undefined, req({}) as never)).toBe("");
    expect(autoVerdict(20, undefined)).toBe("");
  });
});

describe("parseStrengthRecord", () => {
  it("反解析 loads/strengths/mean；坏 JSON 兜底空", () => {
    const p = parseStrengthRecord(
      JSON.stringify({ loads: [1, 2], strengths: [0.6, 1.3], mean: 1 }),
    );
    expect(p.loads).toEqual([1, 2]);
    expect(p.mean).toBe(1);
    expect(parseStrengthRecord("{bad").loads).toEqual([]);
    expect(parseStrengthRecord(undefined).strengths).toEqual([]);
  });
});

const param = (code: string, name: string, unit = "MPa"): InspectionParameter =>
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

function mountCard(
  Component: typeof CementCompressCard | typeof CementFlexuralCard,
  over: Partial<ParamModelProps> = {},
): { wrapper: VueWrapper; onChange: ReturnType<typeof vi.fn> } {
  const onChange = vi.fn();
  const wrapper = mount(Component, {
    props: {
      parameter: param("IP-0556", "3 天抗压强度"),
      record: undefined,
      sampleId: "s1",
      standards: [],
      stdParams: [],
      techReqs: [],
      config: undefined,
      onChange,
      readOnly: false,
      ...over,
    },
  });
  return { wrapper, onChange };
}

const verifiedReq = {
  id: "req-42.5",
  inspectionParameterCode: "IP-0556",
  judgmentStandardCode: "GB 175-2023",
  valueType: "numeric",
  comparison: "≥",
  minValue: 17,
  judgmentMode: "automatic",
  verificationStatus: "verified",
  sortOrder: 1,
};

describe("CementCompressCard 渲染", () => {
  beforeEach(() => vi.clearAllMocks());

  fnTest(["M03.F03.I01"], "CementCompressCard 渲染 6 个破坏荷载输入框", () => {
    const { wrapper } = mountCard(CementCompressCard);
    expect(
      wrapper.findAll('input[type="number"][placeholder="kN"]').length,
    ).toBe(6);
  });

  fnTest(["M03.F03.I02"], "CementCompressCard 有技术要求：录入均值达标 → 自动判合格", () => {
    const { wrapper, onChange } = mountCard(CementCompressCard, {
      techReqs: [verifiedReq as never],
    });
    const inputs = wrapper.findAll('input[type="number"][placeholder="kN"]');
    inputs.forEach((el) => {
      el.setValue("80"); // → 50 MPa ≥ 17
    });
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls.at(-1)![0];
    expect(last.verdict).toBe("合格");
  });

  fnTest(["M03.F03.I03"], "CementCompressCard 无技术要求：标注「评定」前缀", () => {
    const { wrapper } = mountCard(CementCompressCard, { techReqs: [] });
    // vue 翻译版：单项评定显示为「评定：合格/不合格」或未填占位
    expect(wrapper.text()).toMatch(/代表值|评定/);
  });

  fnTest(["M03.F03.I01"], "CementCompressCard readOnly：输入吞掉 onChange", () => {
    const { wrapper, onChange } = mountCard(CementCompressCard, {
      techReqs: [verifiedReq as never],
      readOnly: true,
    });
    const inputs = wrapper.findAll('input[type="number"][placeholder="kN"]');
    inputs[0]!.setValue("80");
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("CementFlexuralCard 渲染", () => {
  fnTest(["M03.F03.I01"], "CementFlexuralCard 渲染 3 个破坏荷载 + 抗折强度列", () => {
    const { wrapper } = mountCard(CementFlexuralCard, {
      parameter: param("IP-0555", "3 天抗折强度"),
    });
    // StrengthCardBase 的输入用 aria-label 而非 placeholder
    expect(
      wrapper.findAll('input[type="number"][aria-label$="破坏荷载"]').length,
    ).toBe(3);
    expect(wrapper.text()).toContain("抗折强度 (MPa)");
  });
});