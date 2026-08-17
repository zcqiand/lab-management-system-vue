<script setup lang="ts">
// 混凝土抗渗性能卡（Sprint 2 Batch 2B-8 镜像 react 仓 ConcretePermeabilityCard.tsx 183 行）。
// 6 试件 ×（渗水压力 MPa + 渗水情况）→ 抗渗等级（按 GB/T 50082-2009）。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";

/** 试件数（混凝土抗渗标准为 6 个圆台试件）。 */
const SPECIMEN_COUNT = 6;

type Permeation = "已渗" | "未渗";

interface Specimen {
  pressure: number; // MPa；0 = 未填
  permeated: Permeation;
}

const EMPTY_SPECIMEN: Specimen = { pressure: 0, permeated: "未渗" };

/**
 * 按 GB/T 50082-2009 计算抗渗等级：6 试件中第 3 个渗水试件的渗水压力。
 * 不足 3 个渗水 → grade=undefined。
 */
function computeConcretePermeability(specimens: Specimen[]): {
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

function parseRecordResult(raw: string | undefined): Specimen[] {
  if (!raw) return Array.from({ length: SPECIMEN_COUNT }, () => ({ ...EMPTY_SPECIMEN }));
  try {
    const obj = JSON.parse(raw) as { specimens?: Array<{ pressure?: number; permeated?: Permeation }> };
    const list = obj.specimens;
    if (!Array.isArray(list))
      return Array.from({ length: SPECIMEN_COUNT }, () => ({ ...EMPTY_SPECIMEN }));
    return Array.from({ length: SPECIMEN_COUNT }, (_, i) => {
      const s = list[i];
      return {
        pressure: typeof s?.pressure === "number" ? s.pressure : 0,
        permeated: s?.permeated === "已渗" ? "已渗" : "未渗",
      };
    });
  } catch {
    return Array.from({ length: SPECIMEN_COUNT }, () => ({ ...EMPTY_SPECIMEN }));
  }
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
            <input
              type="number"
              step="0.1"
              placeholder="渗水压力 (MPa)"
              :value="s.pressure === 0 ? '' : s.pressure"
              :readonly="readOnly"
              :aria-label="`试件 ${i + 1} 渗水压力`"
              class="w-32 border rounded px-2 py-1 text-sm read-only:bg-gray-50 read-only:text-gray-500"
              @change="(e) => updatePressure(i, (e.target as HTMLInputElement).value)"
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