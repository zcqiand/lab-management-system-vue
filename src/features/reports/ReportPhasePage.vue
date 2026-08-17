<script setup lang="ts">
// M03.F05/F06/F07/F08 报告 4 阶段页（vue 镜像 react 仓 Batch 2B-3）。
//
// 镜像 react 仓 src/features/reports/ReportPhasePage.tsx 简化版：
//   - 共享 ReportPhasePage（参数：stage + submitLabel + i01DataFn + i02DataFn）
//   - 4 个 page wrapper 各传一组 stage/submitLabel/data-fn
//   - 列表按 flowStatus={stage} 过滤接样单 + 多选 + 批量 submit 按钮
//   - 行内「退回」按钮 + 退回 Dialog（reason 可选）

import { onMounted, ref } from "vue";
import axios from "axios";
import { API_ROUTES } from "@/api/legacy-client";

type FlowStage =
  | "receiving"
  | "task_assignment"
  | "data_entry"
  | "review"
  | "approval"
  | "issuance"
  | "archived"
  | "completed";

type PhaseStage = "review" | "approval" | "issuance" | "archived";

interface SampleReceipt {
  id: string;
  commissionCode: string;
  projectName?: string;
  flowStatus: FlowStage;
  result?: "pass" | "fail" | "";
}

const FLOW_STAGE_LABELS: Record<FlowStage, string> = {
  receiving: "接样中",
  task_assignment: "分配中",
  data_entry: "录入中",
  review: "审核中",
  approval: "批准中",
  issuance: "发放中",
  archived: "归档中",
  completed: "已归档",
};

const PREV_STAGE: Record<PhaseStage, FlowStage> = {
  review: "data_entry",
  approval: "review",
  issuance: "approval",
  archived: "issuance",
};

const props = defineProps<{
  title: string;
  subtitle: string;
  stage: PhaseStage;
  submitLabel: string;
  i01DataFn: string;
  i02DataFn: string;
}>();

const rows = ref<SampleReceipt[]>([]);
const total = ref(0);
const keyword = ref("");
const loading = ref(false);
const selected = ref<Set<string>>(new Set());
const submitting = ref(false);
const returnTarget = ref<SampleReceipt | null>(null);
const returnReason = ref("");

const allSelected = () => rows.value.length > 0 && selected.value.size === rows.value.length;

function toggleAll(): void {
  if (allSelected()) {
    selected.value = new Set();
  } else {
    selected.value = new Set(rows.value.map((r) => r.id));
  }
}

function toggleOne(id: string): void {
  const next = new Set(selected.value);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  selected.value = next;
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const params: Record<string, string | number> = {
      page: 1,
      pageSize: 50,
      flowStatus: props.stage,
    };
    if (keyword.value) params["keyword"] = keyword.value;
    const res = await axios.get<{ items: SampleReceipt[]; total: number }>(
      API_ROUTES["/receipts"],
      { params },
    );
    rows.value = Array.isArray(res.data?.items) ? res.data.items : [];
    total.value = typeof res.data?.total === "number" ? res.data.total : 0;
    selected.value = new Set();
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

async function batchSubmit(): Promise<void> {
  if (selected.value.size === 0) {
    if (typeof globalThis.alert === "function") globalThis.alert("请先选择接样单");
    return;
  }
  submitting.value = true;
  try {
    const res = await axios.post<{
      results: Array<{ id: string; ok: boolean; message?: string }>;
    }>(API_ROUTES["/receipts/flow"], {
      ids: Array.from(selected.value),
      action: "submit",
      operator: "current-user",
    });
    const failed = (res.data?.results ?? []).filter((r) => !r.ok);
    if (failed.length === 0) {
      // toast 替代品：直接 alert；Batch 2A 模板表达式作用域限制
      if (typeof globalThis.alert === "function") globalThis.alert(`${props.submitLabel}完成（${selected.value.size} 单）`);
    } else {
      if (typeof globalThis.alert === "function") globalThis.alert(`${failed.length} 单处理失败：${failed[0]?.message ?? ""}`);
    }
    await load();
  } catch (e) {
    if (typeof globalThis.alert === "function") globalThis.alert((e as Error).message);
  } finally {
    submitting.value = false;
  }
}

function openReturn(t: SampleReceipt): void {
  returnTarget.value = t;
  returnReason.value = "";
}

async function handleReturn(): Promise<void> {
  const t = returnTarget.value;
  if (!t) return;
  submitting.value = true;
  try {
    await axios.post(API_ROUTES["/receipts/flow"], {
      ids: [t.id],
      action: "return",
      operator: "current-user",
      reason: returnReason.value.trim() || undefined,
    });
    returnTarget.value = null;
    returnReason.value = "";
    await load();
  } catch (e) {
    if (typeof globalThis.alert === "function") globalThis.alert((e as Error).message);
  } finally {
    submitting.value = false;
  }
}

function alertError(msg: string): void {
  if (typeof globalThis.alert === "function") globalThis.alert(msg);
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">{{ title }}</h1>
        <p class="text-sm text-slate-500">{{ subtitle }}</p>
      </div>
    </div>

    <div class="mb-4 flex gap-2">
      <input
        v-model="keyword"
        placeholder="按委托书编号搜索"
        class="border rounded h-9 px-2 text-sm bg-white max-w-sm"
        @keyup.enter="load()"
      />
      <button class="border rounded h-9 px-3 text-sm" @click="load()">搜索</button>
      <div class="ml-auto flex gap-2">
        <button
          class="border rounded h-9 px-3 text-sm bg-white disabled:opacity-50"
          :disabled="submitting || selected.size === 0"
          :data-fn="i02DataFn"
          @click="batchSubmit()"
        >
          {{ submitLabel }}（{{ selected.size }}）
        </button>
      </div>
    </div>

    <div class="bg-white rounded shadow">
      <div class="flex items-center justify-between px-4 py-2 border-b">
        <h3 class="text-base font-semibold">{{ title }}（{{ total || "…" }}）</h3>
        <span v-if="loading" class="text-xs text-slate-400">加载中…</span>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-4 py-2 text-left">
              <input type="checkbox" :checked="allSelected()" @change="toggleAll()" aria-label="全选" />
            </th>
            <th class="px-4 py-2 text-left">委托书编号</th>
            <th class="px-4 py-2 text-left">工程名称</th>
            <th class="px-4 py-2 text-left">检测结果</th>
            <th class="px-4 py-2 text-left">流程状态</th>
            <th class="px-4 py-2 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0 && !loading">
            <td colspan="6" class="px-4 py-8 text-center text-slate-400">（无数据）</td>
          </tr>
          <tr v-for="r in rows" :key="r.id" :data-fn="i01DataFn" class="border-t hover:bg-slate-50">
            <td class="px-4 py-2">
              <input
                type="checkbox"
                :checked="selected.has(r.id)"
                :aria-label="`选择 ${r.commissionCode}`"
                @change="toggleOne(r.id)"
              />
            </td>
            <td class="px-4 py-2 font-mono text-xs">
              <router-link :to="`/receipts/${r.id}`" class="text-blue-600 hover:underline">
                {{ r.commissionCode }}
              </router-link>
            </td>
            <td class="px-4 py-2">{{ r.projectName ?? "—" }}</td>
            <td class="px-4 py-2">
              {{ r.result === 'pass' ? '合格' : r.result === 'fail' ? '不合格' : '—' }}
            </td>
            <td class="px-4 py-2 text-xs">
              {{ FLOW_STAGE_LABELS[r.flowStatus] ?? r.flowStatus }}
            </td>
            <td class="px-4 py-2 text-right">
              <button
                class="text-red-600 hover:text-red-700 text-xs px-2 py-0.5"
                @click="openReturn(r)"
              >
                退回
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div
        v-if="returnTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="returnTarget = null"
      >
        <div class="bg-white rounded shadow-xl sm:max-w-md w-full p-6">
          <h2 class="text-lg font-semibold">退回 — {{ returnTarget.commissionCode }}</h2>
          <p class="text-sm text-slate-500 mb-3">
            退回后该接样单回到上一环节（{{ FLOW_STAGE_LABELS[PREV_STAGE[stage]] }}）。
          </p>
          <label class="text-xs block mb-2">退回原因（可选）
            <input
              v-model="returnReason"
              placeholder="如：数据待补正"
              class="border rounded h-9 px-2 text-sm w-full mt-1"
            />
          </label>
          <div class="mt-4 flex justify-end gap-2">
            <button class="px-4 py-2 text-sm" @click="returnTarget = null">取消</button>
            <button
              class="px-4 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-50"
              :disabled="submitting"
              @click="handleReturn()"
            >
              确认退回
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>