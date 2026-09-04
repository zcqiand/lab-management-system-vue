<script setup lang="ts">
// 钢筋焊接接头弯曲性能卡（IP-0155，Sprint 2 Batch 2B-8 镜像 react 仓）。
// 1 样品 = 3 试件（JGJ/T 27-2014 §6.2）；3 行 = 弯曲角度(deg) + 合格/不合格。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";
import Input from "@/components/ui/Input.vue";
import Table from "@/components/ui/Table.vue";
import TableHeader from "@/components/ui/TableHeader.vue";
import TableBody from "@/components/ui/TableBody.vue";
import TableRow from "@/components/ui/TableRow.vue";
import TableHead from "@/components/ui/TableHead.vue";
import TableCell from "@/components/ui/TableCell.vue";
import { parseBendRecord, type BendSpecimen } from "./rebar-welding";

const BEND_RESULTS = ["合格", "不合格"] as const;

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
    ? "text-green-600"
    : overallComputed.value === "不合格"
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
        <span v-if="overallComputed" :class="overallClass">{{ overallComputed }}</span>
        <select
          v-else
          :value="record?.verdict ?? ''"
          :disabled="readOnly"
          aria-label="整体单项评定"
          class="border rounded px-1 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-500"
          @change="(e) => handleOverallVerdict((e.target as HTMLSelectElement).value)"
        >
          <option value="">未评定</option>
          <option v-for="v in BEND_RESULTS" :key="v" :value="v">{{ v }}</option>
        </select>
      </span>
    </div>

    <Table class="w-full text-xs">
      <TableHeader class="text-gray-500">
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
              class="w-20 read-only:bg-gray-50 read-only:text-gray-500"
              @change="(e: Event) => updateAngle(t, (e.target as HTMLInputElement).value)"
            />
          </TableCell>
          <TableCell class="py-1">
            <select
              :value="spec.results[t]"
              :disabled="readOnly"
              :aria-label="`试件 ${t + 1} 弯曲结果`"
              class="border rounded px-2 py-1 text-sm disabled:bg-gray-50 disabled:text-gray-500"
              @change="(e) => updateResult(t, (e.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in BEND_RESULTS" :key="opt" :value="opt">{{ opt }}</option>
            </select>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>