<script setup lang="ts">
// 钢筋力学性能 / 机械连接通用多组数值卡（Sprint 2 Batch 2B-8 镜像 react 仓 303 行）。
// componentPath = rebar-mech-numeric；formulaKey 决定行为：tensile/yield（载荷+直径）、
// passthrough（断后伸长率/最大力总伸长率）、ratio_tensile_over_yield / ratio_measured_over_spec_yield（比值卡）。
import { computed, ref, watch } from "vue";
import type { ParamModelProps, ParamTechReq } from "./types";
import Input from "@/components/ui/Input.vue";
import Select from "@/components/ui/Select.vue";
import SelectContent from "@/components/ui/SelectContent.vue";
import SelectItem from "@/components/ui/SelectItem.vue";
import SelectTrigger from "@/components/ui/SelectTrigger.vue";
import SelectValue from "@/components/ui/SelectValue.vue";
import Table from "@/components/ui/Table.vue";
import TableHeader from "@/components/ui/TableHeader.vue";
import TableBody from "@/components/ui/TableBody.vue";
import TableRow from "@/components/ui/TableRow.vue";
import TableHead from "@/components/ui/TableHead.vue";
import TableCell from "@/components/ui/TableCell.vue";
import { autoVerdict } from "./cement-strength";
import {
  parseRebarMechResult,
  computeStrengths,
  ratioTensileOverYield,
  ratioMeasuredOverSpec,
  meanOf,
  rounderFor,
  type RebarMechResult,
  type RebarMechFormula,
} from "./rebar-mechanics";

const MANUAL_VERDICTS = ["合格", "不合格"] as const;
// reka-ui SelectItem 禁 value=""；原 <option value="">未评定/未选/—</option> 走哨兵值。
const NONE = "__none__";
// 触发器视觉对齐原 raw <select>：行内、内容自适应、比默认 h-9 矮一档。
const TRIGGER_CLS = "inline-flex h-8 w-auto min-w-24 gap-1 px-2 text-sm";

interface NumericConfig {
  formulaKey?: RebarMechFormula;
  specimenCount?: number;
  needsDiameter?: boolean;
  inputLabel?: string;
  valueLabel?: string;
  connectionMode?: boolean;
  fractureLocationOptions?: string[];
}

function reqLabel(r: ParamTechReq): string {
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

const props = defineProps<ParamModelProps>();
const {
  parameter: p,
  record,
  sampleId,
  techReqs,
  config,
  calcRule,
  crossRecord,
  onChange,
  readOnly = false,
} = props;

const cfg = computed(() => (config ?? {}) as NumericConfig);
const formula = computed<RebarMechFormula>(() => cfg.value.formulaKey ?? "passthrough");
const count = computed(
  () => cfg.value.specimenCount ?? calcRule?.specimenCount ?? 2,
);
const needsDiameter = computed(() => !!cfg.value.needsDiameter);
const inputLabel = computed(() => cfg.value.inputLabel ?? "数值");
const connectionMode = computed(() => !!cfg.value.connectionMode);
const fractureLocationOptions = computed(
  () => cfg.value.fractureLocationOptions ?? ["母材断裂", "断于接头", "热影响区断裂", "其他"],
);
const round = computed(() => rounderFor(formula.value));
const isStrength = computed(
  () => formula.value === "tensile_strength" || formula.value === "yield_strength",
);
const isRatio = computed(
  () =>
    formula.value === "ratio_tensile_over_yield" ||
    formula.value === "ratio_measured_over_spec_yield",
);

const initial = computed(() => parseRebarMechResult(record?.result, count.value));
const state = ref<RebarMechResult>(initial.value);

watch(
  () => [sampleId, record?.result, count.value],
  () => {
    state.value = initial.value;
  },
);

const reqOptions = computed(() =>
  (techReqs as ParamTechReq[]).filter((r) => r.verificationStatus === "verified"),
);
const req = computed<ParamTechReq | undefined>(
  () =>
    (reqOptions.value as ParamTechReq[]).find((r) => r.id === state.value.techReqId) ??
    (reqOptions.value[0] as ParamTechReq | undefined),
);

// 比值卡的自动联立值（抗拉/屈服 或 实测屈服/标准屈服）；缺跨记录数据 → null
const autoStrengths = computed<number[] | null>(() => {
  if (formula.value === "ratio_tensile_over_yield") {
    const t = crossRecord?.tensileStrengths;
    const y = crossRecord?.yieldStrengths;
    if (t && y && t.some((v) => v > 0) && y.some((v) => v > 0))
      return ratioTensileOverYield(t, y, count.value);
  }
  if (formula.value === "ratio_measured_over_spec_yield") {
    const y = crossRecord?.yieldStrengths;
    const spec = crossRecord?.specStandardYield;
    if (y && spec && spec > 0 && y.some((v) => v > 0))
      return ratioMeasuredOverSpec(y, spec, count.value);
  }
  return null;
});
const autoMode = computed(() => autoStrengths.value !== null);

// 有效结果数组
const strengths = computed<number[]>(() => {
  if (isStrength.value) return computeStrengths(state.value.loads, state.value.diameter ?? 0);
  if (autoMode.value) return autoStrengths.value as number[];
  return state.value.loads
    .slice(0, count.value)
    .map((v) => (Number.isFinite(v) && v > 0 ? round.value(v) : 0));
});
const mean = computed(() => meanOf(strengths.value, round.value));
const verdict = computed(() => autoVerdict(mean.value, req.value as never));

function buildResult(next: RebarMechResult, nextStrengths: number[]): RebarMechResult {
  return { ...next, strengths: nextStrengths, mean: meanOf(nextStrengths, round.value) };
}

function emit(next: RebarMechResult, nextStrengths: number[]) {
  const result = buildResult(next, nextStrengths);
  const v = autoVerdict(result.mean, req.value as never);
  onChange({ result: JSON.stringify(result), ...(v ? { verdict: v } : {}) });
}

function updateDiameter(v: string) {
  if (readOnly) return;
  const num = v === "" ? 0 : Number(v);
  const v2 = Number.isFinite(num) ? num : 0;
  const next = { ...state.value, diameter: v2 };
  state.value = next;
  emit(next, computeStrengths(next.loads, next.diameter ?? 0));
}
function updateLoad(i: number, v: string) {
  if (readOnly || autoMode.value) return;
  const num = v === "" ? 0 : Number(v);
  const v2 = Number.isFinite(num) ? num : 0;
  const loads = [...state.value.loads];
  loads[i] = v2;
  const next = { ...state.value, loads };
  const ns = isStrength.value
    ? computeStrengths(loads, next.diameter ?? 0)
    : loads
        .slice(0, count.value)
        .map((x) => (Number.isFinite(x) && x > 0 ? round.value(x) : 0));
  state.value = next;
  emit(next, ns);
}
function updateReq(reqId: string) {
  if (readOnly) return;
  const r = (reqOptions.value as ParamTechReq[]).find((x) => x.id === reqId);
  const next = { ...state.value, techReqId: reqId, techReqLabel: r ? reqLabel(r) : "" };
  state.value = next;
  emit(next, strengths.value);
}
function updateFractureLocation(i: number, value: string) {
  const nextLocs = Array.from(
    { length: count.value },
    (_, j) => state.value.fractureLocations?.[j] ?? "",
  );
  nextLocs[i] = value;
  const next = { ...state.value, fractureLocations: nextLocs };
  state.value = next;
  emit(next, strengths.value);
}
function handleManualVerdict(v: string) {
  onChange({ verdict: v });
}

const verdictClass = computed(() =>
  verdict.value === "合格"
    ? "text-success"
    : verdict.value === "不合格"
      ? "text-destructive"
      : "text-muted-foreground",
);

const indices = computed(() => Array.from({ length: count.value }, (_, i) => i));
</script>

<template>
  <div class="border rounded p-3 space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">
        {{ p.canonicalName || p.name
        }}<span v-if="p.unit">（{{ p.unit }}）</span>
        <span class="ml-2 text-xs text-muted-foreground">
          {{ count }} 组<span v-if="isRatio">{{ autoMode ? ' / 自动计算' : ' / 手动录入' }}</span>
        </span>
      </span>
      <span class="text-xs">
        <span v-if="verdict" :class="verdictClass">{{ verdict }}</span>
        <Select
          v-else
          :model-value="record?.verdict || NONE"
          :disabled="readOnly"
          @update:model-value="(v: string | number) => handleManualVerdict(v === NONE ? '' : String(v))"
        >
          <SelectTrigger aria-label="整体单项评定" :class="TRIGGER_CLS">
            <SelectValue placeholder="未评定" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="NONE">未评定</SelectItem>
            <SelectItem v-for="v in MANUAL_VERDICTS" :key="v" :value="v">{{ v }}</SelectItem>
          </SelectContent>
        </Select>
      </span>
    </div>

    <div class="flex items-center gap-3 text-xs bg-muted rounded p-2">
      <span v-if="needsDiameter" class="text-muted-foreground">
        直径 d (mm)
        <Input
          type="number"
          step="0.1"
          placeholder="直径"
          :model-value="(state.diameter ?? 0) === 0 ? '' : state.diameter"
          :readonly="readOnly"
          aria-label="公称直径"
          class="ml-1 w-24 read-only:bg-muted read-only:text-muted-foreground"
          @change="(e: Event) => updateDiameter((e.target as HTMLInputElement).value)"
        />
      </span>
      <span class="text-muted-foreground">
        技术要求
        <Select
          :model-value="state.techReqId || NONE"
          :disabled="readOnly"
          @update:model-value="(v: string | number) => updateReq(v === NONE ? '' : String(v))"
        >
          <SelectTrigger aria-label="技术要求" :class="`ml-1 ${TRIGGER_CLS}`">
            <SelectValue placeholder="未选" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem :value="NONE">未选</SelectItem>
            <SelectItem v-for="r in reqOptions" :key="r.id" :value="r.id ?? ''">
              {{ reqLabel(r) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </span>
    </div>

    <Table class="w-full text-xs">
      <TableHeader class="text-muted-foreground">
        <TableRow>
          <TableHead class="text-left py-1 w-6">#</TableHead>
          <TableHead class="text-left py-1">{{ inputLabel }}</TableHead>
          <TableHead v-if="isStrength" class="text-left py-1">强度 (MPa)</TableHead>
          <TableHead v-if="isRatio" class="text-left py-1">比值</TableHead>
          <TableHead v-if="connectionMode" class="text-left py-1">断裂位置</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="i in indices" :key="i">
          <TableCell class="py-1">{{ i + 1 }}</TableCell>
          <TableCell class="py-1">
            <Input
              type="number"
              step="0.01"
              :placeholder="inputLabel"
              :model-value="(state.loads[i] ?? 0) === 0 ? '' : state.loads[i]"
              :readonly="readOnly"
              :aria-label="`第 ${i + 1} 组 ${inputLabel}`"
              class="w-28 read-only:bg-muted read-only:text-muted-foreground"
              @change="(e: Event) => updateLoad(i, (e.target as HTMLInputElement).value)"
            />
          </TableCell>
          <TableCell v-if="isStrength" class="py-1 text-foreground">
            {{ (strengths[i] ?? 0) > 0 ? Number(strengths[i]).toFixed(1) : '-' }}
          </TableCell>
          <TableCell v-if="isRatio && autoMode" class="py-1 text-foreground">
            {{ (strengths[i] ?? 0) > 0 ? Number(strengths[i]).toFixed(2) : '-' }}
          </TableCell>
          <TableCell v-if="connectionMode" class="py-1">
            <Select
              :model-value="state.fractureLocations?.[i] || NONE"
              :disabled="readOnly"
              @update:model-value="(v: string | number) => updateFractureLocation(i, v === NONE ? '' : String(v))"
            >
              <SelectTrigger :aria-label="`第 ${i + 1} 试件断裂位置`" :class="TRIGGER_CLS">
                <SelectValue placeholder="—" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="NONE">—</SelectItem>
                <SelectItem v-for="opt in fractureLocationOptions" :key="opt" :value="opt">{{ opt }}</SelectItem>
              </SelectContent>
            </Select>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <div class="text-xs text-muted-foreground">
      均值：<span class="font-medium text-foreground">{{ mean ?? '—' }}</span>
      <span v-if="isStrength && (state.diameter ?? 0) <= 0" class="ml-2 text-warning">（需填公称直径以计算强度）</span>
      <span v-if="isRatio && !autoMode" class="ml-2 text-warning">（同样品抗拉/屈服未录入，暂手动填写比值）</span>
    </div>
  </div>
</template>