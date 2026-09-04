<script setup lang="ts">
// M05.F01 报告汇总 + 仪表盘统计 — 列表页（镜像 react 仓，vue 翻译）。
//
// 数据：
//   - GET /api/summary        报告汇总表（按 categoryCode 过滤）
//   - GET /api/summary/stats  仪表盘统计
//
// 适配层：msw handlers-extra.ts summaryExtraHandlers 直接返回 REF 期望形状，
// 无需 installShapeAdapters 额外兜底。
import { onMounted, ref, watch } from "vue";
import axios from "axios";
import { API_ROUTES } from "@/api/legacy-client";
import Label from "@/components/ui/Label.vue";
import Select from "@/components/ui/Select.vue";
import SelectTrigger from "@/components/ui/SelectTrigger.vue";
import SelectContent from "@/components/ui/SelectContent.vue";
import SelectItem from "@/components/ui/SelectItem.vue";
import SelectValue from "@/components/ui/SelectValue.vue";
import Table from "@/components/ui/Table.vue";
import TableHeader from "@/components/ui/TableHeader.vue";
import TableBody from "@/components/ui/TableBody.vue";
import TableRow from "@/components/ui/TableRow.vue";
import TableHead from "@/components/ui/TableHead.vue";
import TableCell from "@/components/ui/TableCell.vue";

interface SummaryColumn {
  key: string;
  label: string;
}

interface SummaryData {
  summaryName: string;
  columns: SummaryColumn[];
  rows: Array<Record<string, string>>;
}

interface DashboardStats {
  contractCount: number;
  receiptCount: number;
  sampleCount: number;
  reportCountByStatus: {
    draft: number;
    reviewing: number;
    issued: number;
  };
  pendingTaskCount: number;
}

const STATUS_LABEL: Record<string, string> = {
  receiving: "接样",
  task_assignment: "任务分配",
  data_entry: "数据录入",
  review: "审核",
  approval: "批准",
  issuance: "发放",
  archived: "归档",
  completed: "已完成",
};

const data = ref<SummaryData | null>(null);
const stats = ref<DashboardStats | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const categoryCode = ref("ALL");

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const params: Record<string, string> = {};
    if (categoryCode.value && categoryCode.value !== "ALL") params.categoryCode = categoryCode.value;
    const [summaryRes, statsRes] = await Promise.all([
      axios.get<SummaryData>(API_ROUTES["/summary"], { params }),
      axios.get<DashboardStats>(`${API_ROUTES["/summary"]}/stats`).catch(() => ({ data: null })),
    ]);
    data.value = summaryRes.data ?? null;
    stats.value = statsRes.data ?? null;
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : "汇总加载失败";
    data.value = null;
  } finally {
    loading.value = false;
  }
}

onMounted(() => { void load(); });
watch(categoryCode, () => { void load(); });
</script>

<template>
  <!-- @entry M05.F01.I01 -->
  <!-- @entry M05.F01.I02 -->
  <div data-fn="M05.F01.I01" class="space-y-4">
    <div class="bg-white rounded shadow p-4">
      <div class="mb-3">
        <h1 class="text-2xl font-semibold">报告汇总</h1>
        <p class="text-sm text-slate-500">
          M05.F01 报告汇总表（按报告类别 categoryCode 过滤）——数据来自 lab-msw fixtures
        </p>
      </div>
      <div class="mb-3 flex items-end gap-3">
        <div>
          <Label for="categoryCode">报告类别</Label>
          <Select v-model="categoryCode">
            <SelectTrigger id="categoryCode" class="border rounded h-9 px-2 text-sm bg-white w-48">
              <SelectValue placeholder="请选择类别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部</SelectItem>
              <SelectItem value="RC">建材检测（RC）</SelectItem>
              <SelectItem value="ST">主体结构（ST）</SelectItem>
              <SelectItem value="MT">钢结构（MT）</SelectItem>
              <SelectItem value="AD">建筑节能（AD）</SelectItem>
              <SelectItem value="ID">室内环境（ID）</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div v-if="error" role="alert" class="text-sm text-red-600 bg-red-50 p-2 rounded">{{ error }}</div>

      <div v-if="!loading && data && data.rows.length === 0" class="text-sm text-slate-400 text-center py-8">
        暂无报告
      </div>

      <Table v-else-if="data && data.rows.length > 0" class="w-full text-sm">
        <TableHeader class="bg-slate-50 text-slate-600">
          <TableRow>
            <TableHead v-for="c in data.columns" :key="c.key" class="px-4 py-2 text-left">{{ c.label }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(row, idx) in data.rows" :key="idx" class="border-t hover:bg-slate-50">
            <TableCell v-for="c in data.columns" :key="c.key" class="px-4 py-2 align-top">
              <span v-if="c.key === 'flowStatus'" class="inline-flex items-center rounded border px-2 py-0.5 text-xs">
                {{ (STATUS_LABEL[String(row[c.key] ?? '')] ?? (String(row[c.key] ?? '') || '-')) }}
              </span>
              <span v-else-if="c.key === 'result' && row[c.key] === 'qualified'" class="inline-flex items-center rounded bg-green-100 text-green-700 px-2 py-0.5 text-xs">合格</span>
              <span v-else-if="c.key === 'result' && row[c.key] === 'unqualified'" class="inline-flex items-center rounded bg-red-100 text-red-700 px-2 py-0.5 text-xs">不合格</span>
              <span v-else>{{ String(row[c.key] ?? '-') }}</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div class="mt-2 text-sm text-slate-500">
        <span v-if="data">共 {{ data.rows.length }} 条 — {{ data.summaryName }}</span>
      </div>
    </div>

    <!-- @entry M05.F01.I02 仪表盘统计卡片 -->
    <div data-fn="M05.F01.I02" class="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div class="bg-white rounded shadow p-3">
        <div class="text-xs text-slate-500">合同数</div>
        <div class="text-3xl font-semibold">{{ stats?.contractCount ?? '-' }}</div>
      </div>
      <div class="bg-white rounded shadow p-3">
        <div class="text-xs text-slate-500">接样数</div>
        <div class="text-3xl font-semibold">{{ stats?.receiptCount ?? '-' }}</div>
      </div>
      <div class="bg-white rounded shadow p-3">
        <div class="text-xs text-slate-500">样品数</div>
        <div class="text-3xl font-semibold">{{ stats?.sampleCount ?? '-' }}</div>
      </div>
      <div class="bg-white rounded shadow p-3">
        <div class="text-xs text-slate-500">待办任务</div>
        <div class="text-3xl font-semibold text-amber-600">{{ stats?.pendingTaskCount ?? '-' }}</div>
      </div>
      <div class="bg-white rounded shadow p-3">
        <div class="text-xs text-slate-500">按状态分布</div>
        <div class="text-sm space-y-1 pt-1">
          <div>草稿：{{ stats?.reportCountByStatus.draft ?? 0 }}</div>
          <div>审核中：{{ stats?.reportCountByStatus.reviewing ?? 0 }}</div>
          <div>已发：{{ stats?.reportCountByStatus.issued ?? 0 }}</div>
        </div>
      </div>
    </div>
  </div>
</template>
