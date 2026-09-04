<script setup lang="ts">
// 土工压实度录入卡（Sprint 2 Batch 2B-8 镜像 react 仓 SoilCompactionDegreeCard.tsx 304 行）。
// 覆盖 RN-109-2 灌砂法 + RN-109-3 环刀法两份报告（环刀法逐行显示「最大干密度」列）。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";
import {
  computeCompactionDegree,
  parseDegreeResult,
  DEFAULT_ROW_COUNT,
  EMPTY_DEGREE_ROW,
  type CompactionDegreeRow,
  type CompactionDegreeComputed,
} from "./soil-compaction-degree";

interface ParsedState {
  maxDryDensity: number;
  rows: CompactionDegreeRow[];
}

function parseResult(raw: string | undefined, count: number): ParsedState {
  const r = parseDegreeResult(raw, count);
  return { maxDryDensity: r.maxDryDensity, rows: r.rows };
}

const props = defineProps<ParamModelProps>();
const { parameter: param, record, sampleId, config, onChange, readOnly = false } = props;

const cfg = computed(() => (config ?? {}) as { rowCount?: number; showMaxDensityColumn?: boolean });
const count = computed(() => Number(cfg.value.rowCount) || DEFAULT_ROW_COUNT);
const showMaxCol = computed(() => cfg.value.showMaxDensityColumn === true);

const initial = computed(() => parseResult(record?.result, count.value));
const state = ref<ParsedState>(initial.value);

watch(
  () => [sampleId, record?.result, count.value],
  () => {
    state.value = initial.value;
  },
);

const computedRows = computed<CompactionDegreeComputed[]>(() =>
  state.value.rows.map((r) => ({
    ...r,
    ...computeCompactionDegree(r, state.value.maxDryDensity),
    maxDryDensity: state.value.maxDryDensity,
  })),
);

function emit(next: ParsedState) {
  const rows = next.rows.map((r) => ({
    ...r,
    ...computeCompactionDegree(r, next.maxDryDensity),
    maxDryDensity: next.maxDryDensity,
  }));
  const filled = rows.filter((r) => r.verdict !== "");
  const overall =
    filled.length === 0
      ? undefined
      : filled.every((r) => r.verdict === "合格")
        ? "合格"
        : "不合格";
  onChange({
    result: JSON.stringify({ maxDryDensity: next.maxDryDensity, rows }),
    ...(overall ? { verdict: overall } : {}),
  });
}

function updateRow(i: number, field: keyof CompactionDegreeRow, v: string | number) {
  if (readOnly) return;
  const next: ParsedState = {
    ...state.value,
    rows: state.value.rows.map((r, idx) => (idx === i ? { ...r, [field]: v } : r)),
  };
  state.value = next;
  emit(next);
}

function updateMax(v: string) {
  if (readOnly) return;
  const num = Number(v);
  const v2 = Number.isFinite(num) ? num : 0;
  const next: ParsedState = { ...state.value, maxDryDensity: v2 };
  state.value = next;
  emit(next);
}

const cellCls = "border px-1 py-1 text-center";
const numCls =
  "w-20 border rounded px-1 py-0.5 text-right disabled:bg-gray-100 disabled:text-gray-500";
const txtCls = "w-24 border rounded px-1 py-0.5 disabled:bg-gray-100 disabled:text-gray-500";
</script>

<template>
  <div class="border rounded p-3 space-y-3" data-fn="M03.F03.I03">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium">{{ param.canonicalName || param.name }}</span>
      <Label class="text-xs text-gray-600">
        最大干密度（g/cm³）：
        <Input
          type="number"
          step="0.001"
          aria-label="最大干密度"
          :class="`${numCls} ml-1`"
          :disabled="readOnly"
          :model-value="state.maxDryDensity || ''"
          @change="(e: Event) => updateMax((e.target as HTMLInputElement).value)"
        />
      </Label>
    </div>

    <table class="text-sm border-collapse">
      <thead>
        <tr class="bg-gray-50">
          <th :class="cellCls">试样编号</th>
          <th :class="cellCls">取样部位</th>
          <th :class="cellCls">层次</th>
          <th :class="cellCls">设计压实度（%）</th>
          <th :class="cellCls">湿密度（g/cm³）</th>
          <th :class="cellCls">含水率（%）</th>
          <th :class="cellCls">干密度（g/cm³）</th>
          <th v-if="showMaxCol" :class="cellCls">最大干密度（g/cm³）</th>
          <th :class="cellCls">压实度（%）</th>
          <th :class="cellCls">单项评定</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(r, i) in computedRows" :key="i">
          <td :class="cellCls">
            <Input
              :aria-label="`第 ${i + 1} 行试样编号`"
              :class="txtCls"
              :disabled="readOnly"
              :model-value="r.code"
              @change="(e: Event) => updateRow(i, 'code', (e.target as HTMLInputElement).value)"
            />
          </td>
          <td :class="cellCls">
            <Input
              :aria-label="`第 ${i + 1} 行取样部位`"
              :class="txtCls"
              :disabled="readOnly"
              :model-value="r.part"
              @change="(e: Event) => updateRow(i, 'part', (e.target as HTMLInputElement).value)"
            />
          </td>
          <td :class="cellCls">
            <Input
              :aria-label="`第 ${i + 1} 行层次`"
              :class="txtCls"
              :disabled="readOnly"
              :model-value="r.layer"
              @change="(e: Event) => updateRow(i, 'layer', (e.target as HTMLInputElement).value)"
            />
          </td>
          <td :class="cellCls">
            <Input
              type="number"
              step="0.1"
              :aria-label="`第 ${i + 1} 行设计压实度`"
              :class="numCls"
              :disabled="readOnly"
              :model-value="r.designDegree || ''"
              @change="(e: Event) => updateRow(i, 'designDegree', (e.target as HTMLInputElement).value)"
            />
          </td>
          <td :class="cellCls">
            <Input
              type="number"
              step="0.001"
              :aria-label="`第 ${i + 1} 行湿密度`"
              :class="numCls"
              :disabled="readOnly"
              :model-value="r.wetDensity || ''"
              @change="(e: Event) => updateRow(i, 'wetDensity', (e.target as HTMLInputElement).value)"
            />
          </td>
          <td :class="cellCls">
            <Input
              type="number"
              step="0.1"
              :aria-label="`第 ${i + 1} 行含水率`"
              :class="numCls"
              :disabled="readOnly"
              :model-value="r.moisture || ''"
              @change="(e: Event) => updateRow(i, 'moisture', (e.target as HTMLInputElement).value)"
            />
          </td>
          <td :class="cellCls" :data-testid="`dry-density-${i}`">
            {{ r.dryDensity || '—' }}
          </td>
          <td v-if="showMaxCol" :class="cellCls">{{ r.maxDryDensity || '—' }}</td>
          <td :class="cellCls" :data-testid="`degree-${i}`">
            {{ r.degree || '—' }}
          </td>
          <td
            :class="[
              cellCls,
              r.verdict === '不合格'
                ? 'text-red-600'
                : r.verdict === '合格'
                  ? 'text-green-600'
                  : 'text-gray-400',
            ]"
            :data-testid="`verdict-${i}`"
          >
            {{ r.verdict || '—' }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>