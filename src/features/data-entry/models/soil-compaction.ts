// 土工击实算法模块（Sprint 2 Batch 2B-10 抽离）。
// vue 仓 <script setup lang="ts"> 不支持 ES module exports，算法函数单独放在 .ts。
// SoilCompactionCard.vue import 此模块；测试 import 此模块。

export interface CompactionPoint {
  moisture: number; // %
  dryDensity: number; // g/cm³
}

export interface CompactionResult {
  points: CompactionPoint[];
  maxDryDensity: number | undefined;
  optimalMoisture: number | undefined;
}

const DEFAULT_POINT_COUNT = 5;

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/**
 * 击实曲线峰值：≥3 点时对峰值+左右邻点做二次拟合取顶点。
 * 拟合退化或点数不足时回退到实测最大干密度点。
 */
export function computeCompactionPeak(points: CompactionPoint[]): {
  maxDryDensity: number | undefined;
  optimalMoisture: number | undefined;
} {
  const valid = points.filter((p) => p.dryDensity > 0 && p.moisture > 0);
  if (valid.length === 0) return { maxDryDensity: undefined, optimalMoisture: undefined };

  const sorted = [...valid].sort((a, b) => a.moisture - b.moisture);
  let peakIdx = 0;
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i]!.dryDensity > sorted[peakIdx]!.dryDensity) peakIdx = i;
  }
  const peak = sorted[peakIdx]!;
  const fallback = {
    maxDryDensity: round(peak.dryDensity, 3),
    optimalMoisture: round(peak.moisture, 1),
  };

  if (sorted.length < 3 || peakIdx === 0 || peakIdx === sorted.length - 1) return fallback;

  const [p1, p2, p3] = [sorted[peakIdx - 1]!, peak, sorted[peakIdx + 1]!];
  const [x1, y1] = [p1.moisture, p1.dryDensity];
  const [x2, y2] = [p2.moisture, p2.dryDensity];
  const [x3, y3] = [p3.moisture, p3.dryDensity];
  const denom = (x1 - x2) * (x1 - x3) * (x2 - x3);
  if (denom === 0) return fallback;

  const a = (x3 * (y2 - y1) + x2 * (y1 - y3) + x1 * (y3 - y2)) / denom;
  if (a >= 0) return fallback;
  const b = (x3 * x3 * (y1 - y2) + x2 * x2 * (y3 - y1) + x1 * x1 * (y2 - y3)) / denom;
  const c =
    (x2 * x3 * (x2 - x3) * y1 + x3 * x1 * (x3 - x1) * y2 + x1 * x2 * (x1 - x2) * y3) / denom;
  const vertexX = -b / (2 * a);
  const vertexY = a * vertexX * vertexX + b * vertexX + c;

  if (vertexX < x1 || vertexX > x3 || vertexY < peak.dryDensity) return fallback;
  return { maxDryDensity: round(vertexY, 3), optimalMoisture: round(vertexX, 1) };
}

export function parseCompactionResult(raw: string | undefined, count: number): CompactionPoint[] {
  const empty = () => Array.from({ length: count }, () => ({ moisture: 0, dryDensity: 0 }));
  if (!raw || !raw.trimStart().startsWith("{")) return empty();
  try {
    const obj = JSON.parse(raw) as { points?: Array<Partial<CompactionPoint>> };
    if (!Array.isArray(obj.points)) return empty();
    return Array.from({ length: count }, (_, i) => ({
      moisture: Number(obj.points?.[i]?.moisture) || 0,
      dryDensity: Number(obj.points?.[i]?.dryDensity) || 0,
    }));
  } catch {
    return empty();
  }
}

export { DEFAULT_POINT_COUNT };