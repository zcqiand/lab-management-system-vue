<script setup lang="ts">
// 土工压实度录入卡（Sprint 2 Batch 2B-8 镜像 react 仓 SoilCompactionDegreeCard.tsx 304 行）。
// 覆盖 RN-109-2 灌砂法 + RN-109-3 环刀法两份报告（环刀法逐行显示「最大干密度」列）。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";

export interface CompactionDegreeRow {
  code: string;
  part: string;
  layer: string;
  /** 设计压实度 (%) */
  designDegree: number;
  /** 湿密度 (g/cm³) */
  wetDensity: number;
  /** 含水率 (%) */
  moisture: number;
}

export interface CompactionDegreeComputed extends CompactionDegreeRow {
  dryDensity: number;
  degree: number;
  verdict: "合格" | "不合格" | "";
  maxDryDensity: number;
}

const DEFAULT_ROW_COUNT = 6;

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

const EMPTY_ROW: CompactionDegreeRow = {
  code: "",
  part: "",
  layer: "",
  designDegree: 0,
  wetDensity: 0,
  moisture: 0,
};

/** 干密度 / 压实度 / 评定。缺任一必需输入 → 该项为 0 / ''。 */
export function computeCompactionDegree(
  row: CompactionDegreeRow,
  maxDryDensity: number,
): { dryDensity: number; degree: number; verdict: "合格" | "不合格" | "" } {
  if (!(row.wetDensity > 0) || !(row.moisture >= 0)) {
    return { dryDensity: 0, degree: 0, verdict: "" };
  }
  const dryDensity = round(row.wetDensity / (1 + row.moisture / 100), 3);
  if (!(maxDryDensity > 0)) return { dryDensity, degree: 0, verdict: "" };
  const degree = round((dryDensity / maxDryDensity) * 100, 1);
  const verdict: "合格" | "不合格" | "" =
    row.designDegree > 0 ? (degree >= row.designDegree ? "合格" : "不合格") : "";
  return { dryDensity, degree, verdict };
}

interface ParsedState {
  maxDryDensity: number;
  rows: CompactionDegreeRow[];
}

function parseResult(raw: string | undefined, count: number): ParsedState {
  const empty = (): ParsedState => ({
    maxDryDensity: 0,
    rows: Array.from({ length: count }, () => ({ ...EMPTY_ROW })),
  });
  if (!raw || !raw.trimStart().startsWith("{")) return empty();
  try {
    const obj = JSON.parse(raw) as {
      maxDryDensity?: number;
      rows?: Array<Partial<CompactionDegreeRow>>;
    };
    const src = Array.isArray(obj.rows) ? obj.rows : [];
    return {
      maxDryDensity: Number(obj.maxDryDensity) || 0,
      rows: Array.from({ length: Math.max(count, src.length) }, (_, i) => ({
        code: String(src[i]?.code ?? ""),
        part: String(src[i]?.part ?? ""),
        layer: String(src[i]?.layer ?? ""),
        designDegree: Number(src[i]?.designDegree) || 0,
        wetDensity: Number(src[i]?.wetDensity) || 0,
        moisture: Number(src[i]?.moisture) || 0,
      })),
    };
  } catch {
    return empty();
  }
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
      <label class="text-xs text-gray-600">
        最大干密度（g/cm³）：
        <input
          type="number"
          step="0.001"
          aria-label="最大干密度"
          :class="[numCls, 'ml-1']"
          :disabled="readOnly"
          :value="state.maxDryDensity || ''"
          @change="(e) => updateMax((e.target as HTMLInputElement).value)"
        />
      </label>
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
            <input
              :aria-label="`第 ${i + 1} 行试样编号`"
              :class="txtCls"
              :disabled="readOnly"
              :value="r.code"
              @change="(e) => updateRow(i, 'code', (e.target as HTMLInputElement).value)"
            />
          </td>
          <td :class="cellCls">
            <input
              :aria-label="`第 ${i + 1} 行取样部位`"
              :class="txtCls"
              :disabled="readOnly"
              :value="r.part"
              @change="(e) => updateRow(i, 'part', (e.target as HTMLInputElement).value)"
            />
          </td>
          <td :class="cellCls">
            <input
              :aria-label="`第 ${i + 1} 行层次`"
              :class="txtCls"
              :disabled="readOnly"
              :value="r.layer"
              @change="(e) => updateRow(i, 'layer', (e.target as HTMLInputElement).value)"
            />
          </td>
          <td :class="cellCls">
            <input
              type="number"
              step="0.1"
              :aria-label="`第 ${i + 1} 行设计压实度`"
              :class="numCls"
              :disabled="readOnly"
              :value="r.designDegree || ''"
              @change="(e) => updateRow(i, 'designDegree', (e.target as HTMLInputElement).value)"
            />
          </td>
          <td :class="cellCls">
            <input
              type="number"
              step="0.001"
              :aria-label="`第 ${i + 1} 行湿密度`"
              :class="numCls"
              :disabled="readOnly"
              :value="r.wetDensity || ''"
              @change="(e) => updateRow(i, 'wetDensity', (e.target as HTMLInputElement).value)"
            />
          </td>
          <td :class="cellCls">
            <input
              type="number"
              step="0.1"
              :aria-label="`第 ${i + 1} 行含水率`"
              :class="numCls"
              :disabled="readOnly"
              :value="r.moisture || ''"
              @change="(e) => updateRow(i, 'moisture', (e.target as HTMLInputElement).value)"
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