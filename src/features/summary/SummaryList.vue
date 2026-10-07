<script setup lang="ts">
// M05.F01 报告汇总 + 仪表盘统计 — 列表页（镜像 react 仓，vue 翻译）。
//
// 数据：
//   - GET /api/summary        报告汇总表（按 categoryCode 过滤）
//   - GET /api/summary/stats  仪表盘统计
//
// 适配层：msw handlers-extra.ts summaryExtraHandlers 直接返回 REF 期望形状，
// 无需 installShapeAdapters 额外兜底。
import { computed, onMounted, ref, watch } from "vue";
import { summaryGetDashboardStats, summaryGetReportSummary } from "@/api/endpoints/summary/summary";
import type { DashboardStats, SummaryData } from "@/api/endpoints/model";
import PageHeader from "@/components/app/PageHeader.vue";
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
import PageLoading from "@/components/app/PageLoading.vue";

// 类型走 orval 生成物（src/api/endpoints/model）——SSOT 是 shared TypeSpec。

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

// REQ-2026-020 I03/I04：与 react SummaryList 同款常量（key 顺序即漏斗段序）
const FUNNEL_LABELS: Array<{
  key: keyof DashboardStats["funnelByStage"];
  label: string;
}> = [
  { key: "pending_collect", label: "待取样" },
  { key: "received", label: "已收样" },
  { key: "testing", label: "试验中" },
  { key: "reporting", label: "报告编制" },
  { key: "reviewing", label: "待审核" },
  { key: "issued", label: "已签发" },
];

const MATERIAL_LABELS: Array<{
  key: keyof DashboardStats["qualifiedRateByMaterial"];
  label: string;
}> = [
  { key: "concrete", label: "混凝土" },
  { key: "rebar", label: "钢筋" },
  { key: "sand", label: "砂石" },
];

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// I04 漏斗合计（funnel-empty 与条形渲染的开关）
const funnelTotal = computed(() =>
  stats.value
    ? FUNNEL_LABELS.reduce((acc, s) => acc + (stats.value!.funnelByStage[s.key] ?? 0), 0)
    : 0,
);

const data = ref<SummaryData | null>(null);
const stats = ref<DashboardStats | null>(null);
// B6 加载态：首屏即视为加载中（汇总表 + 仪表盘统计两源到齐才出界面）
const loading = ref(true);
const error = ref<string | null>(null);
const categoryCode = ref("ALL");
// B6 加载态：两源任一未到即整页加载；出过数据后 refetch 不再整页回退（旧表保持可见）
const showPageLoading = computed(() => loading.value && !data.value && !error.value);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const params =
      categoryCode.value && categoryCode.value !== "ALL"
        ? { categoryCode: categoryCode.value }
        : undefined;
    const [summaryRes, statsRes] = await Promise.all([
      summaryGetReportSummary(params),
      summaryGetDashboardStats().catch(() => ({ data: null as DashboardStats | null })),
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

onMounted(() => {
  void load();
});
watch(categoryCode, () => {
  void load();
});
</script>

<template>
  <!-- @entry M05.F01.I01 -->
  <!-- @entry M05.F01.I02 -->
  <!-- @entry M05.F01.I06 仪表盘统计基础端点 （ADR-0033 阶段二自后端仓 M05.F02.I01 改挂 F01） -->
  <!-- B6 加载态：两源到齐前整页 PageLoading，不渲染空壳 -->
  <PageLoading v-if="showPageLoading" />
  <div v-else data-fn="M05.F01.I01" class="space-y-4">
    <PageHeader title="报告汇总" description="按报告类别汇总报告产出与结论" />
    <div>
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

      <div v-if="error" role="alert" class="text-sm text-destructive bg-destructive/10 p-2 rounded">
        {{ error }}
      </div>

      <div
        v-if="!loading && data && data.rows.length === 0"
        class="text-sm text-muted-foreground text-center py-8"
      >
        暂无报告
      </div>

      <Table v-else-if="data && data.rows.length > 0" class="w-full text-sm">
        <TableHeader class="bg-muted text-muted-foreground">
          <TableRow>
            <TableHead v-for="c in data.columns" :key="c.key" class="px-4 py-2 text-left">{{
              c.label
            }}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="(row, idx) in data.rows" :key="idx" class="border-t hover:bg-muted">
            <TableCell v-for="c in data.columns" :key="c.key" class="px-4 py-2 align-top">
              <span
                v-if="c.key === 'flowStatus'"
                class="inline-flex items-center rounded border px-2 py-0.5 text-xs"
              >
                {{ STATUS_LABEL[String(row[c.key] ?? "")] ?? (String(row[c.key] ?? "") || "-") }}
              </span>
              <span
                v-else-if="c.key === 'result' && row[c.key] === 'qualified'"
                class="inline-flex items-center rounded bg-success/10 text-success px-2 py-0.5 text-xs"
                >合格</span
              >
              <span
                v-else-if="c.key === 'result' && row[c.key] === 'unqualified'"
                class="inline-flex items-center rounded bg-destructive/10 text-destructive px-2 py-0.5 text-xs"
                >不合格</span
              >
              <span v-else>{{ String(row[c.key] ?? "-") }}</span>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <div class="mt-2 text-sm text-muted-foreground">
        <span v-if="data">共 {{ data.rows.length }} 条 — {{ data.summaryName }}</span>
      </div>
    </div>

    <!-- @entry M05.F01.I02 仪表盘统计卡片 -->

    <div data-fn="M05.F01.I02" class="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div class="rounded-xl border bg-card p-4">
        <div class="text-xs text-muted-foreground">合同数</div>
        <div class="text-3xl font-semibold">{{ stats?.contractCount ?? "-" }}</div>
      </div>
      <div class="rounded-xl border bg-card p-4">
        <div class="text-xs text-muted-foreground">接样数</div>
        <div class="text-3xl font-semibold">{{ stats?.receiptCount ?? "-" }}</div>
      </div>
      <div class="rounded-xl border bg-card p-4">
        <div class="text-xs text-muted-foreground">样品数</div>
        <div class="text-3xl font-semibold">{{ stats?.sampleCount ?? "-" }}</div>
      </div>
      <div class="rounded-xl border bg-card p-4">
        <div class="text-xs text-muted-foreground">待办任务</div>
        <div class="text-3xl font-semibold text-warning">{{ stats?.pendingTaskCount ?? "-" }}</div>
      </div>
      <div class="rounded-xl border bg-card p-4">
        <div class="text-xs text-muted-foreground">按状态分布</div>
        <div class="text-sm space-y-1 pt-1">
          <div>草稿：{{ stats?.reportCountByStatus.draft ?? 0 }}</div>
          <div>审核中：{{ stats?.reportCountByStatus.reviewing ?? 0 }}</div>
          <div>已发：{{ stats?.reportCountByStatus.issued ?? 0 }}</div>
        </div>
      </div>
    </div>

    <!-- @entry M05.F01.I03 核心指标卡（REQ-2026-020，镜像 react SummaryList 同名区块）-->
    <section data-fn="M05.F01.I03" data-testid="dashboard-metrics" class="space-y-3">
      <h2 class="text-base font-semibold">核心指标</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div data-testid="metric-today-tests" class="rounded-xl border bg-card p-4">
          <div class="text-xs text-muted-foreground">今日试验总数</div>
          <div class="text-2xl font-semibold tabular-nums pt-1">
            {{ stats?.todayTestCount ?? "—" }}
            <span class="text-sm font-normal text-muted-foreground ml-1">项</span>
          </div>
        </div>
        <div data-testid="metric-output" class="rounded-xl border bg-card p-4">
          <div class="text-xs text-muted-foreground">报告产出量</div>
          <div v-if="stats" data-testid="metric-output-detail" class="text-sm space-y-1 pt-1">
            <div>
              已生成：<b>{{ stats.reportOutputByStatus.generated }}</b>
            </div>
            <div>
              待审核：<b>{{ stats.reportOutputByStatus.pending }}</b>
            </div>
            <div>
              已签发：<b>{{ stats.reportOutputByStatus.issued }}</b>
            </div>
          </div>
          <div v-else class="text-2xl font-semibold pt-1">—</div>
        </div>
        <div data-testid="metric-qualified-rate" class="rounded-xl border bg-card p-4">
          <div class="text-xs text-muted-foreground">检测合格率</div>
          <ul v-if="stats" data-testid="metric-qualified-detail" class="text-sm space-y-1 pt-1">
            <li v-for="m in MATERIAL_LABELS" :key="m.key">
              {{ m.label }}：<b>{{ pct(stats.qualifiedRateByMaterial[m.key].rate) }}</b>
              <span class="text-xs text-muted-foreground ml-1">
                ({{ stats.qualifiedRateByMaterial[m.key].pass }}/{{
                  stats.qualifiedRateByMaterial[m.key].total
                }})
              </span>
            </li>
          </ul>
          <div v-else class="text-2xl font-semibold pt-1">—</div>
        </div>
      </div>
    </section>

    <!-- @entry M05.F01.I04 任务状态漏斗（REQ-2026-020，镜像 react SummaryList 同名区块）-->
    <section data-fn="M05.F01.I04" data-testid="dashboard-funnel" class="space-y-3">
      <h2 class="text-base font-semibold">试验任务状态</h2>
      <div
        v-if="stats && funnelTotal > 0"
        data-testid="funnel-bars"
        class="rounded-xl border bg-card p-4 space-y-2"
      >
        <div
          v-for="(s, i) in FUNNEL_LABELS"
          :key="s.key"
          :data-testid="`funnel-stage-${s.key}`"
          class="flex items-center gap-3"
        >
          <div class="w-20 text-xs text-muted-foreground shrink-0">{{ s.label }}</div>
          <div class="flex-1 h-7 bg-muted rounded relative overflow-hidden">
            <div
              class="h-full bg-blue-500 transition-all"
              :style="{
                width: `${(
                  (stats.funnelByStage[s.key] * (100 - (i * 50) / (FUNNEL_LABELS.length - 1))) /
                  funnelTotal
                ).toFixed(2)}%`,
              }"
            />
            <div class="absolute inset-0 flex items-center justify-end pr-2 text-xs tabular-nums">
              {{ stats.funnelByStage[s.key] }} 项
            </div>
          </div>
        </div>
        <div class="text-xs text-muted-foreground pt-1">合计 {{ funnelTotal }} 项</div>
      </div>
      <div
        v-else-if="stats"
        data-testid="funnel-empty"
        class="text-sm text-muted-foreground rounded-xl border bg-card p-4"
      >
        当前无任务
      </div>
      <div v-else class="text-sm text-muted-foreground">载入中…</div>
    </section>
  </div>
</template>
