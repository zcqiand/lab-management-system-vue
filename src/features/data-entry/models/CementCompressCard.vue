<script setup lang="ts">
// 水泥胶砂抗压强度卡（vue 仓镜像 react 仓 Batch 2B-2）。
// 6 试件破坏荷载 (kN) → 抗压强度 (MPa) → 平均值。简版算法不带 ±10% 剔除均值。
import { computed } from "vue";
import type { ParamModelProps } from "./types";
import { computeCementCompress } from "./cement-strength";

const props = defineProps<ParamModelProps>();
const { parameter: p, record: rec, onChange, readOnly = false, config } = props;

const specimenCount = 6;
const area = (config?.["area"] as number) ?? 1600;

const loads = computed(() => {
  const out = new Array<number>(specimenCount).fill(0);
  if (!rec?.result) return out;
  const parts = rec.result.split(/[,;\n]+/).map((s) => parseFloat(s.trim()));
  for (let i = 0; i < specimenCount && i < parts.length; i++) {
    out[i] = Number.isFinite(parts[i]) ? (parts[i] as number) : 0;
  }
  return out;
});

const result = computed(() => computeCementCompress(loads.value, area));

function updateLoad(i: number, v: string) {
  const num = parseFloat(v);
  const next = [...loads.value];
  next[i] = Number.isFinite(num) ? num : 0;
  onChange({ result: next.join(",") });
}
</script>

<template>
  <div class="border rounded p-3 space-y-2">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">
        {{ p.canonicalName || p.name }}（{{ p.unit ?? "MPa" }}）
      </span>
      <span class="text-xs text-slate-500">平均：{{ result.average.toFixed(2) }} MPa</span>
    </div>
    <div class="grid grid-cols-6 gap-1">
      <div v-for="(_, i) in loads" :key="i">
        <label class="block text-xs text-slate-500 mb-0.5">试件 {{ i + 1 }}</label>
        <input
          type="number"
          step="0.01"
          class="w-full border rounded px-1 py-1 text-sm"
          :value="loads[i] || ''"
          :readonly="readOnly"
          placeholder="kN"
          @input="updateLoad(i, ($event.target as HTMLInputElement).value)"
        />
        <div class="text-xs text-slate-400 text-center mt-0.5">
          {{ result.strengths[i] ? result.strengths[i]!.toFixed(2) : "—" }}
        </div>
      </div>
    </div>
  </div>
</template>