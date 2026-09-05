<script setup lang="ts">
// 钢筋焊接接头抗拉强度卡（IP-0087，Sprint 2 Batch 2B-8 镜像 react 仓）。
// 1 样品 = 3 试件（JGJ/T 27-2014 §6.1）；共享规格 Φ22 + 技术要求。
// 抗拉强度 Rm = 4000·F/(π·d²)，d=22mm 硬编码；JGJ/T 27 无 ±10% 剔除。
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
  parseTensileRecord,
  recomputeStrengths,
  meanOfSpecimen,
  REBAR_DIAMETER_MM,
  type TensileSpecimen,
} from "./rebar-welding";

const FRACTURE_OPTIONS = ["母材断裂", "焊缝断裂", "热影响区断裂", "其他"];
const MANUAL_VERDICTS = ["合格", "不合格"] as const;
// reka-ui SelectItem 禁 value=""；原 <option value="">未评定/未选</option> 走哨兵值。
const NONE = "__none__";
// 触发器视觉对齐原 raw <select>：行内、内容自适应、比默认 h-9 矮一档。
const TRIGGER_CLS = "inline-flex h-8 w-auto min-w-24 gap-1 px-2 text-sm";

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
    ? "text-success"
    : verdict.value === "不合格"
      ? "text-destructive"
      : "text-muted-foreground",
);

const trialIndices: [0, 1, 2] = [0, 1, 2];
</script>

<template>
  <div class="border rounded p-3 space-y-3">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">
        {{ p.canonicalName || p.name
        }}<span v-if="p.unit">（{{ p.unit }}）</span>
        <span class="ml-2 text-xs text-muted-foreground">3 试件 / JGJ/T 27-2014</span>
      </span>
      <span class="text-xs">
        <span v-if="verdict" :class="verdictClass">{{ verdict }}</span>
        <Select
          v-else
          :model-value="record?.verdict || NONE"
          :disabled="readOnly"
          @update:model-value="(v: string | number) => handleOverallVerdict(v === NONE ? '' : String(v))"
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
      <span class="text-muted-foreground" aria-label="公称直径（硬编码）">
        规格 Φ{{ REBAR_DIAMETER_MM }}
        <span class="ml-1 text-muted-foreground">（硬编码，不录入）</span>
      </span>
      <span class="text-muted-foreground">
        技术要求
        <Select
          :model-value="spec.techReqId || NONE"
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
          <TableHead class="text-left py-1">最大荷重 (kN)</TableHead>
          <TableHead class="text-left py-1">抗拉强度 (MPa)</TableHead>
          <TableHead class="text-left py-1">断口距 (mm)</TableHead>
          <TableHead class="text-left py-1">断裂特征</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="t in trialIndices" :key="t">
          <TableCell class="py-1">{{ t + 1 }}</TableCell>
          <TableCell class="py-1">
            <Input
              type="number"
              step="0.01"
              placeholder="kN"
              :model-value="spec.loads[t] === 0 ? '' : spec.loads[t]"
              :readonly="readOnly"
              :aria-label="`试件 ${t + 1} 最大荷重`"
              class="w-24 read-only:bg-muted read-only:text-muted-foreground"
              @change="(e: Event) => updateLoad(t, (e.target as HTMLInputElement).value)"
            />
          </TableCell>
          <TableCell class="py-1 text-foreground">
            {{ spec.strengths[t] > 0 ? Number(spec.strengths[t]).toFixed(1) : '-' }}
          </TableCell>
          <TableCell class="py-1">
            <Input
              type="number"
              step="0.1"
              placeholder="mm"
              :model-value="spec.fractureDistances[t] === 0 ? '' : spec.fractureDistances[t]"
              :readonly="readOnly"
              :aria-label="`试件 ${t + 1} 断口距`"
              class="w-20 read-only:bg-muted read-only:text-muted-foreground"
              @change="(e: Event) => updateDistance(t, (e.target as HTMLInputElement).value)"
            />
          </TableCell>
          <TableCell class="py-1">
            <Select
              :model-value="spec.fractureCharacteristics[t] || NONE"
              :disabled="readOnly"
              @update:model-value="(v: string | number) => updateFracture(t, v === NONE ? '' : String(v))"
            >
              <SelectTrigger :aria-label="`试件 ${t + 1} 断裂特征`" :class="TRIGGER_CLS">
                <SelectValue placeholder="未选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="NONE">未选</SelectItem>
                <SelectItem v-for="opt in FRACTURE_OPTIONS" :key="opt" :value="opt">{{ opt }}</SelectItem>
              </SelectContent>
            </Select>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <div class="text-xs text-muted-foreground">
      均值：<span class="font-medium text-foreground">{{ mean ?? '—' }}</span>
    </div>
  </div>
</template>