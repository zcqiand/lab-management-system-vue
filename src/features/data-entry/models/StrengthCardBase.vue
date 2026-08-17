<script setup lang="ts">
// 强度卡基类（Sprint 2 Batch 2B-8 镜像 react 仓 StrengthCardBase.tsx 180 行完整版）。
// 水泥胶砂强度（抗折/抗压）共用：
// N 试件 × 破坏荷载(kN) → 只读强度(MPa) → ±10% 剔除均值 → 单项评定。
// 评定：有 verified 技术要求时按均值自动判；否则回退手选（合格/不合格）。
import { computed, ref, watch } from "vue";
import type { ParamModelProps, ParamTechReq } from "./types";
import type { TestRecord } from "@/api/endpoints/endpoints.schemas";
import { autoVerdict, parseStrengthRecord, type StrengthResult } from "./cement-strength";

const MANUAL_VERDICTS = ["合格", "不合格"] as const;

interface StrengthCardProps extends ParamModelProps {
  /** 试件数（抗折 3 / 抗压 6）。 */
  specimenCount: number;
  /** 荷载(kN) → StrengthResult 的计算函数（含 ±10% 剔除）。 */
  compute: (loads: number[]) => StrengthResult;
  /** 强度列表头，如「抗折强度 (MPa)」。 */
  strengthLabel: string;
}

const props = defineProps<StrengthCardProps>();
const {
  parameter: p,
  record,
  sampleId,
  techReqs,
  compute,
  specimenCount,
  strengthLabel,
  onChange,
  readOnly = false,
} = props;

const initial = computed(() => parseStrengthRecord(record?.result));

const loads = ref<number[]>(
  Array.from({ length: specimenCount }, (_, i) => initial.value.loads[i] ?? 0),
);

// 切换样品(sampleId 变)或落库(result 变)时重置本地荷载，避免跨样品污染。
watch(
  () => [sampleId, record?.result, specimenCount],
  () => {
    loads.value = Array.from({ length: specimenCount }, (_, i) => initial.value.loads[i] ?? 0);
  },
);

// 仅取已核验的技术要求参与自动判；无则回退手选。
const reqOptions = computed(() =>
  (techReqs as ParamTechReq[]).filter((r) => r.verificationStatus === "verified"),
);
const reqId = ref<string>(
  record?.requirementCode ?? ((reqOptions.value[0] as ParamTechReq | undefined)?.id ?? ""),
);
const selectedReq = computed<ParamTechReq | undefined>(() =>
  (reqOptions.value as ParamTechReq[]).find((r) => r.id === reqId.value),
);

const computed2 = computed<StrengthResult>(() => compute(loads.value));
const verdict = computed(() => {
  if (reqOptions.value.length > 0) {
    return autoVerdict(computed2.value.mean, selectedReq.value as never);
  }
  return record?.verdict ?? "";
});

function requirementLabel(r: ParamTechReq): string {
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

function emit(nextLoads: number[], nextReqId: string, manualVerdict?: string) {
  if (readOnly) return;
  const res = compute(nextLoads);
  const req = (reqOptions.value as ParamTechReq[]).find((r) => r.id === nextReqId) ??
    (reqOptions.value[0] as ParamTechReq | undefined);
  const patch: Partial<TestRecord> = {
    result: JSON.stringify({
      loads: nextLoads,
      strengths: res.strengths,
      kept: res.kept,
      mean: res.mean,
      invalid: res.invalid,
    }),
  };
  if (reqOptions.value.length > 0) {
    patch.verdict = autoVerdict(res.mean, req as never);
    patch.requirementCode = nextReqId;
    patch.requirement = req ? requirementLabel(req) : "";
  } else if (manualVerdict !== undefined) {
    patch.verdict = manualVerdict;
  }
  onChange(patch);
}

function onLoadChange(i: number, v: string) {
  if (readOnly) return;
  const num = v === "" ? 0 : Number(v);
  const next = [...loads.value];
  next[i] = Number.isFinite(num) ? num : 0;
  loads.value = next;
  emit(next, reqId.value);
}

function onReqChange(e: Event) {
  if (readOnly) return;
  const target = e.target as HTMLSelectElement;
  reqId.value = target.value;
  emit(loads.value, target.value);
}

function onManualVerdictChange(e: Event) {
  if (readOnly) return;
  const target = e.target as HTMLSelectElement;
  emit(loads.value, reqId.value, target.value);
}

const verdictClass = computed(() =>
  verdict.value === "合格"
    ? "text-green-600"
    : verdict.value === "不合格"
      ? "text-red-600"
      : "text-gray-400",
);
</script>

<template>
  <div class="border rounded p-3 space-y-2">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">
        {{ p.canonicalName || p.name
        }}<span v-if="p.unit">（{{ p.unit }}）</span>
      </span>
      <span :class="['text-xs', verdictClass]">{{ verdict || '未评定' }}</span>
    </div>
    <table class="w-full text-xs">
      <thead class="text-gray-500">
        <tr>
          <th class="text-left py-1">#</th>
          <th class="text-left py-1">破坏荷载 (kN)</th>
          <th class="text-left py-1">{{ strengthLabel }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(lv, i) in loads" :key="i">
          <td class="py-1">{{ i + 1 }}</td>
          <td class="py-1">
            <input
              type="number"
              step="0.01"
              :value="lv === 0 ? '' : lv"
              :readonly="readOnly"
              :aria-label="`试件 ${i + 1} 破坏荷载`"
              class="w-32 border rounded px-2 py-1 text-sm read-only:bg-gray-50 read-only:text-gray-500"
              @change="(e) => onLoadChange(i, (e.target as HTMLInputElement).value)"
            />
          </td>
          <td
            :class="[
              'py-1',
              lv > 0 && !computed2.kept[i] ? 'text-gray-400 line-through' : 'text-gray-700',
            ]"
          >
            {{ lv > 0 ? computed2.strengths[i] : '-' }}
          </td>
        </tr>
      </tbody>
    </table>
    <div class="text-xs text-gray-600">
      强度平均值：<span class="font-medium text-gray-900">{{ computed2.mean ?? '—' }}</span>
      <span v-if="computed2.invalid" class="ml-2 text-red-500">（离群值超 ±10%，按 GB/T 17671 结果作废）</span>
    </div>
    <div v-if="reqOptions.length > 0" class="text-xs">
      <label class="text-gray-500 mr-1">技术要求</label>
      <select
        :value="reqId"
        :disabled="readOnly"
        class="border rounded px-1 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-500"
        @change="onReqChange"
      >
        <option v-for="r in reqOptions" :key="r.id" :value="r.id">
          {{ requirementLabel(r) }}
        </option>
      </select>
    </div>
    <div v-else class="text-xs">
      <label class="text-gray-500 mr-1">单项评定</label>
      <select
        :value="record?.verdict ?? ''"
        :disabled="readOnly"
        class="border rounded px-1 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-500"
        @change="onManualVerdictChange"
      >
        <option value="">未评定</option>
        <option v-for="v in MANUAL_VERDICTS" :key="v" :value="v">{{ v }}</option>
      </select>
    </div>
  </div>
</template>