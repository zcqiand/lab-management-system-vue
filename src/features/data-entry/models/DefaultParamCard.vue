<script setup lang="ts">
// M03.F03 通用参数卡（白名单之外的兜底）— vue 仓镜像 react 仓 Batch 2B-2。
import { computed } from "vue";
import type { ParamModelProps } from "./types";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";

const VERDICT_OPTIONS = ["合格", "不合格", "符合", "不符合"] as const;

const props = defineProps<ParamModelProps>();
const { parameter: p, record: rec, standards, stdParams, techReqs, onChange, readOnly = false } = props;

const basisOptions = computed(() =>
  stdParams
    .filter((sp) => sp.inspectionParameterCode === p.code)
    .map((sp) => standards.find((s) => s.code === sp.inspectionStandardCode))
    .filter((s): s is { code: string; name?: string } => Boolean(s)),
);
const reqOptions = computed(() =>
  techReqs.filter((r) => r.inspectionParameterCode === p.code),
);

function requirementLabel(r: (typeof reqOptions.value)[number]): string {
  if (!r) return "—";
  const unit = r.unit ? ` ${r.unit}` : "";
  if (
    (r.valueType === "range" || r.comparison === "range") &&
    r.minValue != null &&
    r.maxValue != null
  )
    return `${r.minValue} ~ ${r.maxValue}${unit}`;
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
</script>

<template>
  <div class="border rounded p-3 space-y-2">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">
        {{ p.canonicalName || p.name }}{{ p.unit ? `（${p.unit}）` : "" }}
      </span>
    </div>
    <div class="grid grid-cols-4 gap-x-3 gap-y-1 text-xs">
      <div>
        <Label class="block text-xs text-slate-500 mb-0.5">检测依据</Label>
        <select
          class="w-full border rounded px-1 py-1 text-sm bg-white"
          :value="rec?.standardCode ?? ''"
          :disabled="readOnly"
          @change="onChange({ standardCode: ($event.target as HTMLSelectElement).value })"
        >
          <option value="">—</option>
          <option v-for="s in basisOptions" :key="s.code" :value="s.code">
            {{ s.code }} {{ s.name }}
          </option>
        </select>
      </div>
      <div>
        <Label class="block text-xs text-slate-500 mb-0.5">技术要求</Label>
        <select
          class="w-full border rounded px-1 py-1 text-sm bg-white"
          :value="rec?.requirementCode ?? ''"
          :disabled="readOnly"
          @change="
            (e) => {
              const v = (e.target as HTMLSelectElement).value;
              const found = reqOptions.find((r) => r.id === v);
              onChange({ requirementCode: v, requirement: found ? requirementLabel(found) : '' });
            }
          "
        >
          <option value="">—</option>
          <option v-for="r in reqOptions" :key="r.id" :value="r.id">
            {{ requirementLabel(r) }}
          </option>
        </select>
      </div>
      <div>
        <Label class="block text-xs text-slate-500 mb-0.5">检测结果</Label>
        <Input
          class="w-full"
          :model-value="rec?.result ?? ''"
          :readonly="readOnly"
          placeholder="录入检测结果"
          @update:model-value="onChange({ result: String($event) })"
        />
      </div>
      <div>
        <Label class="block text-xs text-slate-500 mb-0.5">单项评定</Label>
        <select
          class="w-full border rounded px-1 py-1 text-sm bg-white"
          :value="rec?.verdict ?? ''"
          :disabled="readOnly"
          @change="
            onChange({
              verdict: ($event.target as HTMLSelectElement).value as string,
            })
          "
        >
          <option value="">未评定</option>
          <option v-for="v in VERDICT_OPTIONS" :key="v" :value="v">{{ v }}</option>
        </select>
      </div>
    </div>
  </div>
</template>