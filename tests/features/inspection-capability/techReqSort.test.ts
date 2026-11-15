// M06.F06.I01 技术要求列表排序 — 纯函数单测（无 DOM 无网络）。
// 展示序（2026-11-15 用户裁定）：检测参数 → 规格 → 型号 → 等级 → 牌号。
// nextjs 同款先例：TechnicalRequirementList sortBy（2026-11-14 排版裁定）；
// react/vue 平铺表格适配为筛选后客户端排序，比较器语义镜像
// nextjs TwoLevelObjectStandardTree（null 排尾 / number 数值序 / 其余字符串序）。
// 后端 V020 ORDER BY 是防翻页漂移的稳定兜底序，不承载展示序——不动。
// react 仓同批镜像：tests/features/inspection-capability/techReqSort.test.ts。
import { describe, expect, it } from "vitest";
import { TECH_REQ_SORT_KEYS, sortTechReqRows } from "@/features/inspection-capability/techReqSort";

type Row = Record<string, string | number | null | undefined>;

const row = (over: Row): Row => ({
  inspectionObjectCode: "P2",
  inspectionParameterCode: "IP-0001",
  judgmentStandardCode: "GB 175-2023",
  ...over,
});

describe("techReqSort 展示序：检测参数→规格→型号→等级→牌号", () => {
  it("键序契约：五键且顺序=参数/规格/型号/等级/牌号", () => {
    expect([...TECH_REQ_SORT_KEYS]).toEqual([
      "inspectionParameterCode",
      "spec",
      "model",
      "grade",
      "brand",
    ]);
  });

  it("主序=检测参数", () => {
    const sorted = sortTechReqRows<Row>([
      row({ inspectionParameterCode: "IP-0002" }),
      row({ inspectionParameterCode: "IP-0001" }),
      row({ inspectionParameterCode: "IP-0003" }),
    ]);
    expect(sorted.map((r) => r.inspectionParameterCode)).toEqual(["IP-0001", "IP-0002", "IP-0003"]);
  });

  it("同参数次级键依序生效：规格→型号→等级", () => {
    const sorted = sortTechReqRows<Row>([
      row({ spec: "C30", model: "M-B", grade: "G1" }),
      row({ spec: "C25", model: "M-A", grade: "G9" }),
      row({ spec: "C30", model: "M-A", grade: "G2" }),
      row({ spec: "C30", model: "M-A", grade: "G1" }),
    ]);
    expect(sorted.map((r) => `${r.spec}/${r.model}/${r.grade}`)).toEqual([
      "C25/M-A/G9",
      "C30/M-A/G1",
      "C30/M-A/G2",
      "C30/M-B/G1",
    ]);
  });

  it("末位键=牌号（前四键全等时由牌号定序）", () => {
    const sorted = sortTechReqRows<Row>([row({ brand: "P·O 42.5" }), row({ brand: "P·C 42.5" })]);
    expect(sorted.map((r) => r.brand)).toEqual(["P·C 42.5", "P·O 42.5"]);
  });

  it("null/undefined 排尾（同键缺省行落后于有值行）", () => {
    const sorted = sortTechReqRows<Row>([
      row({ spec: null }),
      row({ spec: "C30" }),
      row({ spec: undefined }),
    ]);
    expect(sorted.map((r) => r.spec)).toEqual(["C30", null, undefined]);
  });

  it("纯函数不 mutating：入参数组保持原序", () => {
    const input = [
      row({ inspectionParameterCode: "IP-0002" }),
      row({ inspectionParameterCode: "IP-0001" }),
    ];
    sortTechReqRows<Row>(input);
    expect(input.map((r) => r.inspectionParameterCode)).toEqual(["IP-0002", "IP-0001"]);
  });
});
