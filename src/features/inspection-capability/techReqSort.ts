// M06.F06.I01 技术要求列表展示序 — 纯函数比较器（2026-11-15 用户裁定）。
// 排序键序：检测参数 → 规格 → 型号 → 等级 → 牌号。
// nextjs 同款先例：TechnicalRequirementList sortBy（2026-11-14 排版裁定）；
// 比较语义镜像 nextjs TwoLevelObjectStandardTree（null 排尾 / number 数值序 / 其余字符串序）。
// 后端 V020 ORDER BY 是防翻页漂移的稳定兜底序，不承载展示序——展示序归前端层。
// react 仓同批镜像：src/features/inspection-capability/techReqSort.ts。
export const TECH_REQ_SORT_KEYS = [
  "inspectionParameterCode",
  "spec",
  "model",
  "grade",
  "brand",
] as const;

export function sortTechReqRows<T>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    for (const key of TECH_REQ_SORT_KEYS) {
      const va = (a as Record<string, unknown>)[key];
      const vb = (b as Record<string, unknown>)[key];
      if (va === vb) continue;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (typeof va === "number" && typeof vb === "number") return va - vb;
      return String(va) < String(vb) ? -1 : 1;
    }
    return 0;
  });
}
