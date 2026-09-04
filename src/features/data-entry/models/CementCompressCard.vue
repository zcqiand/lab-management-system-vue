<script setup lang="ts">
// 水泥胶砂抗压强度卡（Sprint 2 Batch 2B-8 镜像 react 仓 full 版）。
// 6 试件破坏荷载 (kN) → 抗压强度 (MPa) → ±10% 剔除均值 → 单项评定。
// 镜像 react/src/features/data-entry/models/CementCompressCard.tsx（72 行）。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";
import {
  computeCementCompress,
  parseStrengthRecord,
  autoVerdict,
  type StrengthResult,
} from "./cement-strength";

const props = defineProps<ParamModelProps>();
const { parameter: p, record: rec, onChange, readOnly = false, config, sampleId } = props;

const specimenCount = (config?.["specimenCount"] as number) ?? 6;
const area = (config?.["area"] as number) ?? 1600;

const initial = computed(() => parseStrengthRecord(rec?.result));

const loads = ref<number[]>(
  Array.from({ length: specimenCount }, (_, i) => initial.value.loads[i] ?? 0),
);

// 切换样品时（sampleId 变了）→ 重置 loads 到新样品的初始值
watch(
  () => [sampleId, rec?.result, specimenCount],
  () => {
    loads.value = Array.from({ length: specimenCount }, (_, i) => initial.value.loads[i] ?? 0);
  },
);

const result = computed<StrengthResult>(() => computeCementCompress(loads.value, area));

const matchedReq = computed(() => {
  // 简化：取第一条同 IP 的 techReq；完整实现见 react 仓镜像版本
  return props.techReqs.find((r) => r.inspectionParameterCode === p.code);
});

const verdict = computed(() => autoVerdict(result.value.mean, matchedReq.value as never));

function updateLoad(i: number, v: string) {
  if (readOnly) return;
  const num = v === "" ? 0 : parseFloat(v);
  const next = [...loads.value];
  next[i] = Number.isFinite(num) ? (num as number) : 0;
  loads.value = next;
  const computed2 = computeCementCompress(next, area);
  onChange({
    result: JSON.stringify({
      loads: next,
      strengths: computed2.strengths,
      mean: computed2.mean,
      invalid: computed2.invalid,
    }),
    verdict: verdict.value || undefined,
  });
}
</script>

<template>
  <div class="border rounded p-3 space-y-2">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">
        {{ p.canonicalName || p.name }}（{{ p.unit ?? "MPa" }}）
      </span>
      <span class="text-xs text-slate-500">
        代表值：{{ result.mean ?? '—' }} MPa
        <span v-if="result.invalid" class="text-red-600">（作废）</span>
      </span>
    </div>
    <div class="grid grid-cols-6 gap-1">
      <div v-for="(_, i) in loads" :key="i">
        <Label class="block text-xs text-slate-500 mb-0.5">试件 {{ i + 1 }}</Label>
        <Input
          type="number"
          step="0.01"
          class="w-full"
          :model-value="loads[i] || ''"
          :readonly="readOnly"
          placeholder="kN"
          @update:model-value="updateLoad(i, String($event))"
        />
        <div class="text-xs text-slate-400 text-center mt-0.5">
          {{ result.strengths[i] ? Number(result.strengths[i]).toFixed(2) : "—" }}
        </div>
      </div>
    </div>
    <div v-if="verdict" class="text-xs text-gray-600">评定：{{ verdict }}</div>
  </div>
</template>