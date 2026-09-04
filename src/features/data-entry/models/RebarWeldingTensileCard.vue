<script setup lang="ts">
// 钢筋焊接接头抗拉强度卡（IP-0087，Sprint 2 Batch 2B-8 镜像 react 仓）。
// 1 样品 = 3 试件（JGJ/T 27-2014 §6.1）；共享规格 Φ22 + 技术要求。
// 抗拉强度 Rm = 4000·F/(π·d²)，d=22mm 硬编码；JGJ/T 27 无 ±10% 剔除。
import { computed, ref, watch } from "vue";
import type { ParamModelProps, ParamTechReq } from "./types";
import Input from "@/components/ui/Input.vue";
import { autoVerdict } from "./cement-strength";
import {
  parseTensileRecord,
  recomputeStrengths,
  meanOfSpecimen,
  REBAR_DIAMETER_MM,
  type TensileSpecimen,
} from "./rebar-welding";

const FRACTURE_OPTIONS = ["母材断裂", "焊缝断裂", "热影响区断裂", "其他"];
const MANUAL_VERDICTS = ["合格", "不合格"] as const;

function reqLabel(r: ParamTechReq): string {
  const unit = r.unit ? ` ${r.unit}` : "";
  if (
    (r.valueType === "range" || r.comparison === "range") &&
    r.minValue != null &&
    r.maxValue != null
  ) {
    return `${r.minValue} ~ ${r.maxValue}${unit}`;
  }
  if (r.comparison === "≥" && r.minValue != null) return `≥ ${r.minValue}${unit}`;
  if (r.comparison === "≤" && r.maxValue != null) return `≤ ${r.maxValue}${unit}`;
  if (r.targetValue)
    return `${r.comparison === "=" || r.comparison === "eq" ? "= " : ""}${r.targetValue}${unit}`;
  if (r.expression) return r.expression;
  const parts = [r.comparison, r.minValue ?? r.maxValue ?? r.targetValue]
    .filter(Boolean)
    .join(" ");
  return parts ? `${parts}${unit}` : r.remark || "—";
}

const props = defineProps<ParamModelProps>();
const { parameter: p, record, sampleId, techReqs, onChange, readOnly = false } = props;

const initial = computed(() => parseTensileRecord(record?.result));
const spec = ref<TensileSpecimen>(initial.value);

watch(
  () => [sampleId, record?.result],
  () => {
    spec.value = initial.value;
  },
);

const reqOptions = computed(() =>
  (techReqs as ParamTechReq[]).filter((r) => r.verificationStatus === "verified"),
);

const mean = computed(() => meanOfSpecimen(spec.value));
const req = computed<ParamTechReq | undefined>(
  () =>
    (reqOptions.value as ParamTechReq[]).find((r) => r.id === spec.value.techReqId) ??
    (reqOptions.value[0] as ParamTechReq | undefined),
);
const verdict = computed(() => autoVerdict(mean.value, req.value as never));

function emit(next: TensileSpecimen) {
  onChange({ result: JSON.stringify(next) });
}

function update(patch: Partial<TensileSpecimen>) {
  if (readOnly) return;
  const next = recomputeStrengths({ ...spec.value, ...patch });
  spec.value = next;
  emit(next);
}

function updateLoad(t: 0 | 1 | 2, v: string) {
  if (readOnly) return;
  const num = v === "" ? 0 : Number(v);
  const v2 = Number.isFinite(num) ? num : 0;
  const loads: [number, number, number] = [...spec.value.loads] as [number, number, number];
  loads[t] = v2;
  update({ loads });
}
function updateDistance(t: 0 | 1 | 2, v: string) {
  if (readOnly) return;
  const num = v === "" ? 0 : Number(v);
  const v2 = Number.isFinite(num) ? num : 0;
  const fractureDistances: [number, number, number] = [...spec.value.fractureDistances] as [
    number,
    number,
    number,
  ];
  fractureDistances[t] = v2;
  update({ fractureDistances });
}
function updateFracture(t: 0 | 1 | 2, v: string) {
  if (readOnly) return;
  const fractureCharacteristics: [string, string, string] = [...spec.value.fractureCharacteristics] as [
    string,
    string,
    string,
  ];
  fractureCharacteristics[t] = v;
  update({ fractureCharacteristics });
}
function updateReq(reqId: string) {
  if (readOnly) return;
  const r = (reqOptions.value as ParamTechReq[]).find((x) => x.id === reqId);
  update({ techReqId: reqId, techReqLabel: r ? reqLabel(r) : "" });
}
function handleOverallVerdict(v: string) {
  onChange({ verdict: v });
}

const verdictClass = computed(() =>
  verdict.value === "合格"
    ? "text-green-600"
    : verdict.value === "不合格"
      ? "text-red-600"
      : "text-gray-400",
);

const trialIndices: [0, 1, 2] = [0, 1, 2];
</script>

<template>
  <div class="border rounded p-3 space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">
        {{ p.canonicalName || p.name
        }}<span v-if="p.unit">（{{ p.unit }}）</span>
        <span class="ml-2 text-xs text-gray-500">3 试件 / JGJ/T 27-2014</span>
      </span>
      <span class="text-xs">
        <span v-if="verdict" :class="verdictClass">{{ verdict }}</span>
        <select
          v-else
          :value="record?.verdict ?? ''"
          :disabled="readOnly"
          aria-label="整体单项评定"
          class="border rounded px-1 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-500"
          @change="(e) => handleOverallVerdict((e.target as HTMLSelectElement).value)"
        >
          <option value="">未评定</option>
          <option v-for="v in MANUAL_VERDICTS" :key="v" :value="v">{{ v }}</option>
        </select>
      </span>
    </div>

    <div class="flex items-center gap-3 text-xs bg-gray-50 rounded p-2">
      <span class="text-gray-500" aria-label="公称直径（硬编码）">
        规格 Φ{{ REBAR_DIAMETER_MM }}
        <span class="ml-1 text-gray-400">（硬编码，不录入）</span>
      </span>
      <span class="text-gray-500">
        技术要求
        <select
          :value="spec.techReqId"
          :disabled="readOnly"
          aria-label="技术要求"
          class="ml-1 border rounded px-2 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-500"
          @change="(e) => updateReq((e.target as HTMLSelectElement).value)"
        >
          <option value="">未选</option>
          <option v-for="r in reqOptions" :key="r.id" :value="r.id">{{ reqLabel(r) }}</option>
        </select>
      </span>
    </div>

    <table class="w-full text-xs">
      <thead class="text-gray-500">
        <tr>
          <th class="text-left py-1 w-6">#</th>
          <th class="text-left py-1">最大荷重 (kN)</th>
          <th class="text-left py-1">抗拉强度 (MPa)</th>
          <th class="text-left py-1">断口距 (mm)</th>
          <th class="text-left py-1">断裂特征</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in trialIndices" :key="t">
          <td class="py-1">{{ t + 1 }}</td>
          <td class="py-1">
            <Input
              type="number"
              step="0.01"
              placeholder="kN"
              :model-value="spec.loads[t] === 0 ? '' : spec.loads[t]"
              :readonly="readOnly"
              :aria-label="`试件 ${t + 1} 最大荷重`"
              class="w-24 read-only:bg-gray-50 read-only:text-gray-500"
              @change="(e: Event) => updateLoad(t, (e.target as HTMLInputElement).value)"
            />
          </td>
          <td class="py-1 text-gray-700">
            {{ spec.strengths[t] > 0 ? Number(spec.strengths[t]).toFixed(1) : '-' }}
          </td>
          <td class="py-1">
            <Input
              type="number"
              step="0.1"
              placeholder="mm"
              :model-value="spec.fractureDistances[t] === 0 ? '' : spec.fractureDistances[t]"
              :readonly="readOnly"
              :aria-label="`试件 ${t + 1} 断口距`"
              class="w-20 read-only:bg-gray-50 read-only:text-gray-500"
              @change="(e: Event) => updateDistance(t, (e.target as HTMLInputElement).value)"
            />
          </td>
          <td class="py-1">
            <select
              :value="spec.fractureCharacteristics[t]"
              :disabled="readOnly"
              :aria-label="`试件 ${t + 1} 断裂特征`"
              class="border rounded px-2 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-500"
              @change="(e) => updateFracture(t, (e.target as HTMLSelectElement).value)"
            >
              <option value="">未选</option>
              <option v-for="opt in FRACTURE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="text-xs text-gray-600">
      均值：<span class="font-medium text-gray-900">{{ mean ?? '—' }}</span>
    </div>
  </div>
</template>