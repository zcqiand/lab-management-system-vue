<script setup lang="ts">
// 混凝土抗压强度模型卡（Sprint 2 Batch 2B-8 镜像 react 仓 ConcreteCompressCard.tsx 114 行）。
// N 试件 × 破坏荷载 → 只读抗压强度 → 代表值=均值。无 ±10% 剔除（混凝土按代表值评定）。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";
import Input from "@/components/ui/Input.vue";

const props = defineProps<ParamModelProps>();
const { parameter: p, record, sampleId, config, onChange, readOnly = false } = props;

const specimenCount = (config?.["specimenCount"] as number) ?? 3;
const area = (config?.["area"] as number) ?? 22500;

/** 荷载(kN) + 受压面积(mm²) → 抗压强度(MPa) + 代表值(均值)，保留 2 位。 */
function computeConcreteCompress(loads: number[], areaMm: number) {
  const strengths = loads
    .filter((v) => v !== null && !Number.isNaN(v))
    .map((v) => Math.round(((v * 1000) / areaMm) * 100) / 100);
  if (strengths.length === 0) return { strengths: [] as number[], representative: undefined };
  const mean = strengths.reduce((a, b) => a + b, 0) / strengths.length;
  return { strengths, representative: Math.round(mean * 100) / 100 };
}

function parseRecordResult(raw: string | undefined): { loads: number[]; strengths: number[]; representative?: number } {
  if (!raw) return { loads: [], strengths: [] };
  try {
    const obj = JSON.parse(raw) as { loads?: number[]; strengths?: number[]; representative?: number };
    return {
      loads: Array.isArray(obj.loads) ? obj.loads : [],
      strengths: Array.isArray(obj.strengths) ? obj.strengths : [],
      representative: obj.representative,
    };
  } catch {
    return { loads: [], strengths: [] };
  }
}

const initial = computed(() => parseRecordResult(record?.result));
const loads = ref<number[]>(
  Array.from({ length: specimenCount }, (_, i) => initial.value.loads[i] ?? 0),
);

// 切换样品时（sampleId 变了）→ 重置 loads 到新样品的初始值
watch(
  () => [sampleId, record?.result, specimenCount],
  () => {
    loads.value = Array.from({ length: specimenCount }, (_, i) => initial.value.loads[i] ?? 0);
  },
);

const result = computed(() => computeConcreteCompress(loads.value, area));

function updateLoad(i: number, v: string) {
  if (readOnly) return;
  const num = v === "" ? 0 : Number(v);
  const next = [...loads.value];
  next[i] = Number.isFinite(num) ? num : 0;
  loads.value = next;
  const { strengths: s, representative: rep } = computeConcreteCompress(next, area);
  onChange({
    result: JSON.stringify({ loads: next, strengths: s, representative: rep }),
  });
}
</script>

<template>
  <div class="border rounded p-3 space-y-2">
    <div class="text-sm font-medium">
      {{ p.canonicalName || p.name
      }}<span v-if="p.unit">（{{ p.unit }}）</span>
    </div>
    <table class="w-full text-xs">
      <thead class="text-gray-500">
        <tr>
          <th class="text-left py-1">#</th>
          <th class="text-left py-1">破坏荷载 (kN)</th>
          <th class="text-left py-1">抗压强度 (MPa)</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(lv, i) in loads" :key="i">
          <td class="py-1">{{ i + 1 }}</td>
          <td class="py-1">
            <Input
              type="number"
              placeholder="破坏荷载 (kN)"
              :model-value="lv === 0 ? '' : lv"
              :readonly="readOnly"
              :aria-label="`试件 ${i + 1} 破坏荷载`"
              class="w-32 read-only:bg-gray-50 read-only:text-gray-500"
              @change="(e) => updateLoad(i, (e.target as HTMLInputElement).value)"
            />
          </td>
          <td class="py-1 text-gray-700">{{ lv ? Number((((lv * 1000) / area) * 100) / 100).toFixed(2) : '-' }}</td>
        </tr>
      </tbody>
    </table>
    <div class="text-xs text-gray-600">抗压强度代表值：{{ result.representative ?? '—' }}</div>
  </div>
</template>