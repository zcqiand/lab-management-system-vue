<script setup lang="ts">
// 混凝土抗渗性能卡（Sprint 2 Batch 2B-8 镜像 react 仓 ConcretePermeabilityCard.tsx 183 行）。
// 6 试件 ×（渗水压力 MPa + 渗水情况）→ 抗渗等级（按 GB/T 50082-2009）。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";
import Input from "@/components/ui/Input.vue";
import {
  computeConcretePermeability,
  parsePermeationResult,
  type Specimen,
  type Permeation,
} from "./concrete-permeability";

function parseRecordResult(raw: string | undefined): Specimen[] {
  return parsePermeationResult(raw);
}

const props = defineProps<ParamModelProps>();
const { parameter: p, record, sampleId, onChange, readOnly = false } = props;

const initial = computed(() => parseRecordResult(record?.result));
const specimens = ref<Specimen[]>(initial.value);

watch(
  () => [sampleId, record?.result],
  () => {
    specimens.value = initial.value;
  },
);

const { gradeLabel, reason } = computed(() => computeConcretePermeability(specimens.value)).value;

function emit(next: Specimen[]) {
  const { grade, gradeLabel: gL, reason: r } = computeConcretePermeability(next);
  onChange({
    result: JSON.stringify({
      specimens: next,
      grade,
      gradeLabel: gL,
      reason: grade === undefined ? r : undefined,
    }),
  });
}

function updatePressure(i: number, v: string) {
  if (readOnly) return;
  const num = v === "" ? 0 : Number(v);
  const v2 = Number.isFinite(num) ? num : 0;
  const next = specimens.value.map((s, idx) => (idx === i ? { ...s, pressure: v2 } : s));
  specimens.value = next;
  emit(next);
}

function updatePermeated(i: number, v: Permeation) {
  if (readOnly) return;
  const next = specimens.value.map((s, idx) => (idx === i ? { ...s, permeated: v } : s));
  specimens.value = next;
  emit(next);
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
          <th class="text-left py-1">渗水压力 (MPa)</th>
          <th class="text-left py-1">渗水情况</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(s, i) in specimens" :key="i">
          <td class="py-1">{{ i + 1 }}</td>
          <td class="py-1">
            <Input
              type="number"
              step="0.1"
              placeholder="渗水压力 (MPa)"
              :model-value="s.pressure === 0 ? '' : s.pressure"
              :readonly="readOnly"
              :aria-label="`试件 ${i + 1} 渗水压力`"
              class="w-32 read-only:bg-gray-50 read-only:text-gray-500"
              @change="(e: Event) => updatePressure(i, (e.target as HTMLInputElement).value)"
            />
          </td>
          <td class="py-1">
            <select
              :value="s.permeated"
              :disabled="readOnly"
              :aria-label="`试件 ${i + 1} 渗水情况`"
              class="border rounded px-2 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-500"
              @change="(e) => updatePermeated(i, (e.target as HTMLSelectElement).value as '已渗' | '未渗')"
            >
              <option value="未渗">未渗</option>
              <option value="已渗">已渗</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>
    <div class="text-xs text-gray-600">
      抗渗等级：<span class="font-medium text-gray-900">{{ gradeLabel }}</span>
      <span v-if="reason" class="ml-2 text-gray-500">（{{ reason }}）</span>
    </div>
  </div>
</template>