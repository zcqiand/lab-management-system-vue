<script setup lang="ts">
// 土工击实录入卡（Sprint 2 Batch 2B-8 镜像 react 仓 SoilCompactionCard.tsx 216 行）。
// GB/T 50123-2019 击实试验：N 组（含水率, 干密度）→ 二次拟合峰值 → 最大干密度 / 最优含水率。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";
import Input from "@/components/ui/Input.vue";
import {
  computeCompactionPeak,
  parseCompactionResult,
  DEFAULT_POINT_COUNT,
  type CompactionPoint,
  type CompactionResult,
} from "./soil-compaction";

function parseResult(raw: string | undefined, count: number): CompactionPoint[] {
  return parseCompactionResult(raw, count);
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
            <Input
              type="number"
              step="0.1"
              :aria-label="`第 ${i + 1} 组含水率`"
              :class="inputCls"
              :disabled="readOnly"
              :model-value="p.moisture || ''"
              @change="(e) => update(i, 'moisture', (e.target as HTMLInputElement).value)"
            />
          </td>
        </tr>
        <tr>
          <td :class="cellCls">干密度（g/cm³）</td>
          <td v-for="(p, i) in points" :key="i" :class="cellCls">
            <Input
              type="number"
              step="0.001"
              :aria-label="`第 ${i + 1} 组干密度`"
              :class="inputCls"
              :disabled="readOnly"
              :model-value="p.dryDensity || ''"
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