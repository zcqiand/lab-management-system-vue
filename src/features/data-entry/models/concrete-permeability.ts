// 混凝土抗渗性能算法模块（Sprint 2 Batch 2B-10 抽离）。

export type Permeation = "已渗" | "未渗";

export interface Specimen {
  pressure: number;
  permeated: Permeation;
}

export const EMPTY_SPECIMEN: Specimen = { pressure: 0, permeated: "未渗" };

export const PERMEATION_SPECIMEN_COUNT = 6;

/**
 * 按 GB/T 50082-2009 计算抗渗等级：6 试件中第 3 个渗水试件的渗水压力。
 * 不足 3 个渗水 → grade=undefined。
 */
export function computeConcretePermeability(specimens: Specimen[]): {
  grade: number | undefined;
  gradeLabel: string;
  reason: string | undefined;
} {
  const permeatedPressures: number[] = [];
  for (const s of specimens) {
    if (s.permeated === "已渗" && s.pressure > 0) permeatedPressures.push(s.pressure);
  }
  if (permeatedPressures.length >= 3) {
    const grade = permeatedPressures[2]!;
    return { grade, gradeLabel: `P${Math.round(grade * 10)}`, reason: undefined };
  }
  if (permeatedPressures.length === 0) {
    const maxPressure = specimens.reduce((m, s) => Math.max(m, s.pressure), 0);
    if (maxPressure > 0) {
      return {
        grade: undefined,
        gradeLabel: `未达到 P${Math.round(maxPressure * 10)}`,
        reason: "已渗试件 < 3，按国标记为未达到",
      };
    }
    return { grade: undefined, gradeLabel: "—", reason: "尚未录入" };
  }
  const last = permeatedPressures[permeatedPressures.length - 1]!;
  return {
    grade: undefined,
    gradeLabel: `未达到 P${Math.round(last * 10)}`,
    reason: "已渗试件 < 3，按国标记为未达到",
  };
}

export function parsePermeationResult(raw: string | undefined): Specimen[] {
  if (!raw) return Array.from({ length: PERMEATION_SPECIMEN_COUNT }, () => ({ ...EMPTY_SPECIMEN }));
  try {
    const obj = JSON.parse(raw) as { specimens?: Array<{ pressure?: number; permeated?: Permeation }> };
    const list = obj.specimens;
    if (!Array.isArray(list))
      return Array.from({ length: PERMEATION_SPECIMEN_COUNT }, () => ({ ...EMPTY_SPECIMEN }));
    return Array.from({ length: PERMEATION_SPECIMEN_COUNT }, (_, i) => {
      const s = list[i];
      return {
        pressure: typeof s?.pressure === "number" ? s.pressure : 0,
        permeated: s?.permeated === "已渗" ? "已渗" : "未渗",
      };
    });
  } catch {
    return Array.from({ length: PERMEATION_SPECIMEN_COUNT }, () => ({ ...EMPTY_SPECIMEN }));
  }
}