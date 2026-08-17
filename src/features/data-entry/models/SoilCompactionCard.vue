<script setup lang="ts">
// 土工击实录入卡（Sprint 2 Batch 2B-8 镜像 react 仓 SoilCompactionCard.tsx 216 行）。
// GB/T 50123-2019 击实试验：N 组（含水率, 干密度）→ 二次拟合峰值 → 最大干密度 / 最优含水率。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";

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
 * 击实曲线峰值：≥3 点时对峰值+左右邻点做二次拟合取顶点（标准做法）。
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

function parseResult(raw: string | undefined, count: number): CompactionPoint[] {
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

const props = defineProps<ParamModelProps>();
const { parameter: param, record, sampleId, config, onChange, readOnly = false } = props;

const count = computed(
  () => Number((config as { pointCount?: number } | undefined)?.pointCount) || DEFAULT_POINT_COUNT,
);

const initial = computed(() => parseResult(record?.result, count.value));
const points = ref<CompactionPoint[]>(initial.value);

watch(
  () => [sampleId, record?.result, count.value],
  () => {
    points.value = initial.value;
  },
);

const peak = computed(() => computeCompactionPeak(points.value));

function emit(next: CompactionPoint[]) {
  const { maxDryDensity, optimalMoisture } = computeCompactionPeak(next);
  const result: CompactionResult = { points: next, maxDryDensity, optimalMoisture };
  onChange({ result: JSON.stringify(result) });
}

function update(i: number, field: keyof CompactionPoint, v: string) {
  if (readOnly) return;
  const num = Number(v);
  const v2 = Number.isFinite(num) ? num : 0;
  const next = points.value.map((p, idx) =>
    idx === i ? { ...p, [field]: v2 } : p,
  );
  points.value = next;
  emit(next);
}

const cellCls = "border px-2 py-1 text-center";
const inputCls =
  "w-20 border rounded px-1 py-0.5 text-right disabled:bg-gray-100 disabled:text-gray-500";
</script>

<template>
  <div class="border rounded p-3 space-y-3" data-fn="M03.F03.I03">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">{{ param.canonicalName || param.name }}</span>
      <span class="text-xs text-gray-500">GB/T 50123-2019 击实试验</span>
    </div>

    <table class="text-sm border-collapse">
      <thead>
        <tr class="bg-gray-50">
          <th :class="cellCls">序号</th>
          <th v-for="(_, i) in points" :key="i" :class="cellCls">{{ i + 1 }}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td :class="cellCls">含水率（%）</td>
          <td v-for="(p, i) in points" :key="i" :class="cellCls">
            <input
              type="number"
              step="0.1"
              :aria-label="`第 ${i + 1} 组含水率`"
              :class="inputCls"
              :disabled="readOnly"
              :value="p.moisture || ''"
              @change="(e) => update(i, 'moisture', (e.target as HTMLInputElement).value)"
            />
          </td>
        </tr>
        <tr>
          <td :class="cellCls">干密度（g/cm³）</td>
          <td v-for="(p, i) in points" :key="i" :class="cellCls">
            <input
              type="number"
              step="0.001"
              :aria-label="`第 ${i + 1} 组干密度`"
              :class="inputCls"
              :disabled="readOnly"
              :value="p.dryDensity || ''"
              @change="(e) => update(i, 'dryDensity', (e.target as HTMLInputElement).value)"
            />
          </td>
        </tr>
      </tbody>
    </table>

    <div class="flex gap-6 text-sm">
      <span>
        最大干密度（g/cm³）：
        <b data-testid="max-dry-density">{{ peak.maxDryDensity ?? '—' }}</b>
      </span>
      <span>
        最优含水率（%）：
        <b data-testid="optimal-moisture">{{ peak.optimalMoisture ?? '—' }}</b>
      </span>
    </div>
  </div>
</template>