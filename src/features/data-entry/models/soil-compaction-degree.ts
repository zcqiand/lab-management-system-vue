// 土工压实度算法模块（Sprint 2 Batch 2B-10 抽离）。

export interface CompactionDegreeRow {
  code: string;
  part: string;
  layer: string;
  designDegree: number;
  wetDensity: number;
  moisture: number;
}

export interface CompactionDegreeComputed extends CompactionDegreeRow {
  dryDensity: number;
  degree: number;
  verdict: "合格" | "不合格" | "";
  maxDryDensity: number;
}

const DEFAULT_ROW_COUNT = 6;

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

export const EMPTY_DEGREE_ROW: CompactionDegreeRow = {
  code: "",
  part: "",
  layer: "",
  designDegree: 0,
  wetDensity: 0,
  moisture: 0,
};

/** 干密度 / 压实度 / 评定。缺任一必需输入 → 该项为 0 / ''。 */
export function computeCompactionDegree(
  row: CompactionDegreeRow,
  maxDryDensity: number,
): { dryDensity: number; degree: number; verdict: "合格" | "不合格" | "" } {
  if (!(row.wetDensity > 0) || !(row.moisture >= 0)) {
    return { dryDensity: 0, degree: 0, verdict: "" };
  }
  const dryDensity = round(row.wetDensity / (1 + row.moisture / 100), 3);
  if (!(maxDryDensity > 0)) return { dryDensity, degree: 0, verdict: "" };
  const degree = round((dryDensity / maxDryDensity) * 100, 1);
  const verdict: "合格" | "不合格" | "" =
    row.designDegree > 0 ? (degree >= row.designDegree ? "合格" : "不合格") : "";
  return { dryDensity, degree, verdict };
}

interface ParsedState {
  maxDryDensity: number;
  rows: CompactionDegreeRow[];
}

export function parseDegreeResult(raw: string | undefined, count: number): ParsedState {
  const empty = (): ParsedState => ({
    maxDryDensity: 0,
    rows: Array.from({ length: count }, () => ({ ...EMPTY_DEGREE_ROW })),
  });
  if (!raw || !raw.trimStart().startsWith("{")) return empty();
  try {
    const obj = JSON.parse(raw) as {
      maxDryDensity?: number;
      rows?: Array<Partial<CompactionDegreeRow>>;
    };
    const src = Array.isArray(obj.rows) ? obj.rows : [];
    return {
      maxDryDensity: Number(obj.maxDryDensity) || 0,
      rows: Array.from({ length: Math.max(count, src.length) }, (_, i) => ({
        code: String(src[i]?.code ?? ""),
        part: String(src[i]?.part ?? ""),
        layer: String(src[i]?.layer ?? ""),
        designDegree: Number(src[i]?.designDegree) || 0,
        wetDensity: Number(src[i]?.wetDensity) || 0,
        moisture: Number(src[i]?.moisture) || 0,
      })),
    };
  } catch {
    return empty();
  }
}

export { DEFAULT_ROW_COUNT };