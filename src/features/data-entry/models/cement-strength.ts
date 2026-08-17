// 水泥胶砂抗压强度算法（镜像 react 仓 Batch 2B-2）。
// 6 试件破坏荷载(kN) → 抗压强度(MPa, Rc=F/A, A=1600mm²) → 平均值。

export interface StrengthResult {
  strengths: number[];
  average: number;
}

/** Rc = F(kN) * 1000 / A(mm²)。默认 A=1600mm²（GB/T 17671 水泥胶砂标准面积）。 */
export function computeCementCompress(loads: number[], areaMm2 = 1600): StrengthResult {
  const strengths = loads.map((f) => (f * 1000) / areaMm2);
  const average =
    strengths.length > 0
      ? strengths.reduce((a, b) => a + b, 0) / strengths.length
      : 0;
  return { strengths, average };
}