<script setup lang="ts">
// 钢筋焊接接头弯曲性能卡（IP-0155，Sprint 2 Batch 2B-8 镜像 react 仓）。
// 1 样品 = 3 试件（JGJ/T 27-2014 §6.2）；3 行 = 弯曲角度(deg) + 合格/不合格。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";
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
import { parseBendRecord, type BendSpecimen } from "./rebar-welding";

const BEND_RESULTS = ["合格", "不合格"] as const;
// reka-ui SelectItem 禁 value=""；原 <option value="">未评定</option> 走哨兵值。
const NONE = "__none__";
// 触发器视觉对齐原 raw <select>：行内、内容自适应、比默认 h-9 矮一档。
const TRIGGER_CLS = "inline-flex h-8 w-auto min-w-24 gap-1 px-2 text-sm";

const props = defineProps<ParamModelProps>();
const { parameter: p, record, sampleId, onChange, readOnly = false } = props;

const initial = computed(() => parseBendRecord(record?.result));
const spec = ref<BendSpecimen>(initial.value);

// 切换样品时重置
watch(
  () => [sampleId, record?.result],
  () => {
    spec.value = initial.value;
  },
);

// 整体评定：3 件全合格 → 合格；任一不合格 → 不合格；其余 → ''
const overall = computed<"合格" | "不合格" | "">(() => {
  if (spec.value.results.some((r) => r === "不合格")) return "不合格";
  if (spec.value.results.every((r) => r === "合格")) return "合格";
  return "";
});

const overallComputed = computed(() => overall.value);

function emit(next: BendSpecimen, overrideVerdict?: string) {
  onChange({
    result: JSON.stringify(next),
    // 自动判覆盖手选；无自动判时不动 record.verdict（让用户在 record 顶层手选）
    ...(overallComputed.value
      ? { verdict: overallComputed.value }
      : overrideVerdict !== undefined
        ? { verdict: overrideVerdict }
        : {}),
  });
}

function updateAngle(t: 0 | 1 | 2, v: string) {
  if (readOnly) return;
  const num = v === "" ? 0 : Number(v);
  const v2 = Number.isFinite(num) ? num : 0;
  const angles: [number, number, number] = [...spec.value.angles] as [number, number, number];
  angles[t] = v2;
  const next: BendSpecimen = { ...spec.value, angles };
  spec.value = next;
  emit(next);
}

function updateResult(t: 0 | 1 | 2, v: string) {
  if (readOnly) return;
  const results: [string, string, string] = [...spec.value.results] as [string, string, string];
  results[t] = v;
  const next: BendSpecimen = { ...spec.value, results };
  spec.value = next;
  emit(next);
}

function handleOverallVerdict(v: string) {
  emit(spec.value, v);
}

const overallClass = computed(() =>
  overallComputed.value === "合格"
    ? "text-success"
    : overallComputed.value === "不合格"
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
        <span v-if="overallComputed" :class="overallClass">{{ overallComputed }}</span>
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
            <SelectItem v-for="v in BEND_RESULTS" :key="v" :value="v">{{ v }}</SelectItem>
          </SelectContent>
        </Select>
      </span>
    </div>

    <Table class="w-full text-xs">
      <TableHeader class="text-muted-foreground">
        <TableRow>
          <TableHead class="text-left py-1 w-6">#</TableHead>
          <TableHead class="text-left py-1">弯曲角度 (°)</TableHead>
          <TableHead class="text-left py-1">弯曲结果</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="t in trialIndices" :key="t">
          <TableCell class="py-1">{{ t + 1 }}</TableCell>
          <TableCell class="py-1">
            <Input
              type="number"
              step="1"
              placeholder="90"
              :model-value="spec.angles[t] === 0 ? '' : spec.angles[t]"
              :readonly="readOnly"
              :aria-label="`试件 ${t + 1} 弯曲角度`"
              class="w-20 read-only:bg-muted read-only:text-muted-foreground"
              @change="(e: Event) => updateAngle(t, (e.target as HTMLInputElement).value)"
            />
          </TableCell>
          <TableCell class="py-1">
            <Select
              :model-value="spec.results[t]"
              :disabled="readOnly"
              @update:model-value="(v: string | number) => updateResult(t, String(v))"
            >
              <SelectTrigger :aria-label="`试件 ${t + 1} 弯曲结果`" :class="TRIGGER_CLS">
                <SelectValue placeholder="未选" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="opt in BEND_RESULTS" :key="opt" :value="opt">{{ opt }}</SelectItem>
              </SelectContent>
            </Select>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>