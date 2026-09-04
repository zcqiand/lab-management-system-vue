<script setup lang="ts">
// 颗粒级配录入卡（Sprint 2 Batch 2B-8 镜像 react 仓 ParticleGradationCard.tsx 402 行）。
// 砂 / 碎（卵）石 GB/T 14684 / GB/T 14685 颗粒级配表录入；每样品 3 子行（筛余量/分计/累计），
// 末行平均；右侧分筛前/后总量 + 细度模数。
import { computed, ref, watch } from "vue";
import type { ParamModelProps } from "./types";
import Input from "@/components/ui/Input.vue";

type Props = Pick<
  ParamModelProps,
  "parameter" | "record" | "sampleId" | "config" | "readOnly" | "onChange"
>;

const SIEVE_COLS_SAND = [
  "4.75mm",
  "2.36mm",
  "1.18mm",
  "0.60mm",
  "0.30mm",
  "0.15mm",
  "筛底",
];
const SIEVE_COLS_GRAVEL = [
  "90mm",
  "75mm",
  "63mm",
  "53mm",
  "37.5mm",
  "31.5mm",
  "26.5mm",
  "19mm",
  "16mm",
  "9.5mm",
  "4.75mm",
  "2.36mm",
];

interface Row {
  retainedPct: number[];
  totalBefore: number;
  totalAfter: number;
}

interface ParsedResult {
  rows: Row[];
  sieveCount: number;
}

function parseResult(raw: string | undefined, fallbackSieveCount: number): ParsedResult {
  if (!raw) return { rows: [], sieveCount: fallbackSieveCount };
  try {
    const obj = JSON.parse(raw) as { rows?: Row[]; sieveCount?: number };
    if (Array.isArray(obj.rows)) {
      const rows = obj.rows.map((r) => {
        const arr = Array.isArray(r.retainedPct) ? [...r.retainedPct] : [];
        while (arr.length < fallbackSieveCount) arr.push(0);
        return {
          retainedPct: arr.slice(0, fallbackSieveCount),
          totalBefore: r.totalBefore ?? 0,
          totalAfter: r.totalAfter ?? 0,
        };
      });
      return { rows, sieveCount: obj.sieveCount ?? fallbackSieveCount };
    }
  } catch {
    /* fall through */
  }
  return { rows: [], sieveCount: fallbackSieveCount };
}

function computeCumulative(retainedPct: number[]): number[] {
  const out: number[] = [];
  let acc = 0;
  for (const v of retainedPct) {
    acc += Number(v) || 0;
    out.push(Math.round(acc * 100) / 100);
  }
  return out;
}

function computeFinenessModulus(cumulativePct: number[], sieveCount: number): number {
  // GB/T 14684 砂：前 6 个累计筛余之和 / (100 − 筛底累计筛余)
  const topSix = cumulativePct.slice(0, Math.min(6, sieveCount - 1));
  const sum = topSix.reduce((a, b) => a + b, 0);
  const bottom = cumulativePct[sieveCount - 1] ?? 0;
  if (bottom >= 100) return 0;
  return Math.round((sum / (100 - bottom)) * 100) / 100;
}

function averageByCol(rows: Row[]): number[] {
  if (rows.length === 0) return [];
  const len = rows[0]!.retainedPct.length;
  const out: number[] = [];
  for (let c = 0; c < len; c++) {
    let s = 0;
    let n = 0;
    for (const r of rows) {
      const v = Number(r.retainedPct[c]);
      if (Number.isFinite(v) && v > 0) {
        s += v;
        n++;
      }
    }
    out.push(n > 0 ? Math.round((s / n) * 10) / 10 : 0);
  }
  return out;
}

const props = defineProps<Props>();
const { parameter: param, record, sampleId, config, onChange, readOnly = false } = props;

const cfg = computed(() => (config ?? {}) as { sieveCount?: number; sampleRows?: number; gravel?: boolean });
const sieveCols = computed(() => (cfg.value.gravel ? SIEVE_COLS_GRAVEL : SIEVE_COLS_SAND));
const sieveCount = computed(() => sieveCols.value.length);
const sampleRows = computed(() => cfg.value.sampleRows ?? 2);

const initialRows = computed(() => {
  const parsed = parseResult(record?.result, sieveCount.value);
  if (parsed.rows.length > 0) return parsed.rows;
  return Array.from({ length: sampleRows.value }, () => ({
    retainedPct: Array(sieveCount.value).fill(0),
    totalBefore: 0,
    totalAfter: 0,
  }));
});

const rows = ref<Row[]>(initialRows.value);

watch(
  () => [sampleId, record?.result, sieveCount.value, sampleRows.value],
  () => {
    rows.value = initialRows.value;
  },
);

function updatePct(ri: number, ci: number, v: string) {
  if (readOnly) return;
  const num = v === "" ? 0 : Number(v);
  const v2 = Number.isFinite(num) ? num : 0;
  rows.value = rows.value.map((r, i) => {
    if (i !== ri) return r;
    const retainedPct = [...r.retainedPct];
    retainedPct[ci] = v2;
    return { ...r, retainedPct };
  });
}

function updateTotal(ri: number, field: "totalBefore" | "totalAfter", v: string) {
  if (readOnly) return;
  const num = v === "" ? 0 : Number(v);
  const v2 = Number.isFinite(num) ? num : 0;
  rows.value = rows.value.map((r, i) => (i === ri ? { ...r, [field]: v2 } : r));
}

function emit() {
  const persistedRows = rows.value.map((r) => {
    const cumulativePct = computeCumulative(r.retainedPct);
    return {
      ...r,
      cumulativePct,
      finenessModulus: computeFinenessModulus(cumulativePct, sieveCount.value),
    };
  });
  const result = JSON.stringify({
    rows: persistedRows,
    sieveCount: sieveCount.value,
    average: averageByCol(rows.value),
  });
  onChange({ result });
}

const rowComputed = computed(() =>
  rows.value.map((r) => {
    const cum = computeCumulative(r.retainedPct);
    const fm = computeFinenessModulus(cum, sieveCount.value);
    return { cum, fm, delta: r.totalAfter > 0 ? r.totalBefore - r.totalAfter : 0 };
  }),
);
const avg = computed(() => averageByCol(rows.value));
</script>

<template>
  <!-- @entry M03.F03.I03 颗粒级配录入卡（GB/T 14684 砂 / GB/T 14685 碎卵石）。 -->
  <div class="border rounded p-3 space-y-3" data-fn="M03.F03.I03">
    <div class="flex items-center justify-between">
      <span class="text-sm font-medium text-red-600">
        颗 粒 级 配<span v-if="param?.unit">（{{ param.unit }}）</span>
      </span>
    </div>

    <table class="w-full text-xs border-collapse border border-gray-300">
      <thead class="bg-blue-50 text-gray-700">
        <tr>
          <th class="border border-gray-300 px-2 py-1 text-left w-6">序号</th>
          <th class="border border-gray-300 px-2 py-1 text-left w-20">项目</th>
          <th
            v-for="s in sieveCols"
            :key="s"
            class="border border-gray-300 px-2 py-1 text-center whitespace-nowrap"
          >
            {{ s }}
          </th>
          <th class="border border-gray-300 px-2 py-1 text-left w-32">分筛前总量(g):</th>
        </tr>
      </thead>
      <tbody>
        <template v-for="(row, ri) in rows" :key="ri">
          <tr>
            <td
              class="border border-gray-300 px-2 py-1 text-center font-medium"
              :rowspan="3"
            >
              {{ ri + 1 }}
            </td>
            <td class="border border-gray-300 px-2 py-1">筛余量(g):</td>
            <td
              v-for="(pct, ci) in row.retainedPct"
              :key="ci"
              class="border border-gray-300 px-1 py-1 text-center text-gray-500"
            >
              {{ pct === 0 ? '' : Math.round((pct * (row.totalBefore > 0 ? row.totalBefore : 1)) / 100) }}
            </td>
            <td class="border border-gray-300 px-1 py-1 text-center">
              <Input
                type="number"
                step="1"
                :aria-label="`第 ${ri + 1} 行 分筛前总量`"
                :model-value="row.totalBefore === 0 ? '' : row.totalBefore"
                :readonly="readOnly"
                class="w-20 text-xs text-center read-only:bg-gray-50 read-only:text-gray-500"
                @change="(e) => updateTotal(ri, 'totalBefore', (e.target as HTMLInputElement).value)"
                @blur="emit"
              />
            </td>
          </tr>
          <tr>
            <td class="border border-gray-300 px-2 py-1">分计筛余量(%):</td>
            <td
              v-for="(pct, ci) in row.retainedPct"
              :key="ci"
              class="border border-gray-300 px-1 py-1 text-center"
            >
              <Input
                type="number"
                step="0.1"
                :aria-label="`第 ${ri + 1} 行 ${sieveCols[ci]} 分计筛余`"
                :model-value="pct === 0 ? '' : pct"
                :readonly="readOnly"
                class="w-16 text-xs text-center read-only:bg-gray-50 read-only:text-gray-500"
                @change="(e) => updatePct(ri, ci, (e.target as HTMLInputElement).value)"
                @blur="emit"
              />
            </td>
            <td class="border border-gray-300 px-1 py-1 text-center">
              分筛后总量(g):&nbsp;
              <Input
                type="number"
                step="1"
                :aria-label="`第 ${ri + 1} 行 分筛后总量`"
                :model-value="row.totalAfter === 0 ? '' : row.totalAfter"
                :readonly="readOnly"
                class="w-20 text-xs text-center read-only:bg-gray-50 read-only:text-gray-500"
                @change="(e) => updateTotal(ri, 'totalAfter', (e.target as HTMLInputElement).value)"
                @blur="emit"
              />
              <span v-if="rowComputed[ri]!.delta !== 0" class="ml-1 text-[10px] text-orange-500">
                Δ{{ rowComputed[ri]!.delta }}
              </span>
            </td>
          </tr>
          <tr>
            <td class="border border-gray-300 px-2 py-1">累计筛余量(%):</td>
            <td
              v-for="(c, ci) in rowComputed[ri]!.cum"
              :key="ci"
              class="border border-gray-300 px-1 py-1 text-center text-gray-700"
            >
              {{ c === 0 ? '' : c }}
            </td>
            <td class="border border-gray-300 px-1 py-1 text-center">
              细&nbsp;度&nbsp;模&nbsp;数:&nbsp;
              <span class="font-mono">{{ rowComputed[ri]!.fm === 0 ? '—' : rowComputed[ri]!.fm }}</span>
            </td>
          </tr>
        </template>
        <tr class="bg-gray-50 font-medium">
          <td class="border border-gray-300 px-2 py-1"></td>
          <td class="border border-gray-300 px-2 py-1">平均值(%):</td>
          <td
            v-for="(v, ci) in avg"
            :key="ci"
            class="border border-gray-300 px-2 py-1 text-center"
          >
            {{ v === 0 ? '—' : v }}
          </td>
          <td class="border border-gray-300 px-2 py-1"></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>