<script setup lang="ts">
// 土工压实度录入卡（Sprint 2 Batch 2B-8 镜像 react 仓 SoilCompactionDegreeCard.tsx 304 行）。
// 覆盖 RN-109-2 灌砂法 + RN-109-3 环刀法两份报告（环刀法逐行显示「最大干密度」列）。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";
import Table from "@/components/ui/Table.vue";
import TableHeader from "@/components/ui/TableHeader.vue";
import TableBody from "@/components/ui/TableBody.vue";
import TableRow from "@/components/ui/TableRow.vue";
import TableHead from "@/components/ui/TableHead.vue";
import TableCell from "@/components/ui/TableCell.vue";
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

// Phase 2a-4：TableCell 的 `class` prop 是 string 不是 string[]，
// 不能沿用 `:class="[cellCls, 条件色]"` 数组绑定（同 Phase 1.4 的 :class 数组陷阱），
// 必须先在脚本里拼成单个字符串再传。
function verdictCls(verdict: string): string {
  const tone =
    verdict === "不合格"
      ? "text-red-600"
      : verdict === "合格"
        ? "text-green-600"
        : "text-gray-400";
  return `${cellCls} ${tone}`;
}
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

    <Table class="text-sm border-collapse">
      <TableHeader>
        <TableRow class="bg-gray-50">
          <TableHead :class="cellCls">试样编号</TableHead>
          <TableHead :class="cellCls">取样部位</TableHead>
          <TableHead :class="cellCls">层次</TableHead>
          <TableHead :class="cellCls">设计压实度（%）</TableHead>
          <TableHead :class="cellCls">湿密度（g/cm³）</TableHead>
          <TableHead :class="cellCls">含水率（%）</TableHead>
          <TableHead :class="cellCls">干密度（g/cm³）</TableHead>
          <TableHead v-if="showMaxCol" :class="cellCls">最大干密度（g/cm³）</TableHead>
          <TableHead :class="cellCls">压实度（%）</TableHead>
          <TableHead :class="cellCls">单项评定</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="(r, i) in computedRows" :key="i">
          <TableCell :class="cellCls">
            <Input
              :aria-label="`第 ${i + 1} 行试样编号`"
              :class="txtCls"
              :disabled="readOnly"
              :model-value="r.code"
              @change="(e: Event) => updateRow(i, 'code', (e.target as HTMLInputElement).value)"
            />
          </TableCell>
          <TableCell :class="cellCls">
            <Input
              :aria-label="`第 ${i + 1} 行取样部位`"
              :class="txtCls"
              :disabled="readOnly"
              :model-value="r.part"
              @change="(e: Event) => updateRow(i, 'part', (e.target as HTMLInputElement).value)"
            />
          </TableCell>
          <TableCell :class="cellCls">
            <Input
              :aria-label="`第 ${i + 1} 行层次`"
              :class="txtCls"
              :disabled="readOnly"
              :model-value="r.layer"
              @change="(e: Event) => updateRow(i, 'layer', (e.target as HTMLInputElement).value)"
            />
          </TableCell>
          <TableCell :class="cellCls">
            <Input
              type="number"
              step="0.1"
              :aria-label="`第 ${i + 1} 行设计压实度`"
              :class="numCls"
              :disabled="readOnly"
              :model-value="r.designDegree || ''"
              @change="(e: Event) => updateRow(i, 'designDegree', (e.target as HTMLInputElement).value)"
            />
          </TableCell>
          <TableCell :class="cellCls">
            <Input
              type="number"
              step="0.001"
              :aria-label="`第 ${i + 1} 行湿密度`"
              :class="numCls"
              :disabled="readOnly"
              :model-value="r.wetDensity || ''"
              @change="(e: Event) => updateRow(i, 'wetDensity', (e.target as HTMLInputElement).value)"
            />
          </TableCell>
          <TableCell :class="cellCls">
            <Input
              type="number"
              step="0.1"
              :aria-label="`第 ${i + 1} 行含水率`"
              :class="numCls"
              :disabled="readOnly"
              :model-value="r.moisture || ''"
              @change="(e: Event) => updateRow(i, 'moisture', (e.target as HTMLInputElement).value)"
            />
          </TableCell>
          <TableCell :class="cellCls" :data-testid="`dry-density-${i}`">
            {{ r.dryDensity || '—' }}
          </TableCell>
          <TableCell v-if="showMaxCol" :class="cellCls">{{ r.maxDryDensity || '—' }}</TableCell>
          <TableCell :class="cellCls" :data-testid="`degree-${i}`">
            {{ r.degree || '—' }}
          </TableCell>
          <TableCell :class="verdictCls(r.verdict)" :data-testid="`verdict-${i}`">
            {{ r.verdict || '—' }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>