<script setup lang="ts">
// M03.F02 任务分配 — 流程线第二环节（flowStatus='task_assignment'）
//
// 镜像 react 仓 src/features/task-assignment/TaskAssignmentList.tsx
//
// 功能 ID：
//   M03.F02.I01 任务分配队列（页面 @entry）
//   M03.F02.I02 安排按钮（data-fn，调 PUT /receipts/:id 更新 assignee + plannedDate）
import { onMounted, ref } from "vue";
import axios from "axios";
import { API_ROUTES } from "@/api/legacy-client";
import Button from "@/components/ui/Button.vue";

type FlowStage =
  | "receiving"
  | "task_assignment"
  | "data_entry"
  | "review"
  | "approval"
  | "issuance"
  | "archived"
  | "completed";

interface SampleReceipt {
  id: string;
  commissionCode: string;
  projectName?: string;
  flowStatus: FlowStage;
  assigneeName?: string;
  plannedTestDate?: string;
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

const items = ref<SampleReceipt[]>([]);
const total = ref(0);
const keyword = ref("");
const loading = ref(false);
const assignTarget = ref<SampleReceipt | null>(null);
const assigneeName = ref("");
const plannedTestDate = ref("");
const saving = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const params: Record<string, string | number> = {
      page: 1,
      pageSize: 50,
      flowStatus: "task_assignment",
    };
    if (keyword.value) params["keyword"] = keyword.value;
    const res = await axios.get<{ items: SampleReceipt[]; total: number }>(
      API_ROUTES["/receipts"],
      { params },
    );
    items.value = Array.isArray(res.data?.items) ? res.data.items : [];
    total.value = typeof res.data?.total === "number" ? res.data.total : 0;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function openAssign(r: SampleReceipt): void {
  assignTarget.value = r;
  assigneeName.value = r.assigneeName ?? "";
  plannedTestDate.value = r.plannedTestDate ?? new Date().toISOString().slice(0, 10);
}

async function handleSave(): Promise<void> {
  const t = assignTarget.value;
  if (!t) return;
  saving.value = true;
  try {
    await axios.put(`${API_ROUTES["/receipts"]}/${t.id}`, {
      assigneeName: assigneeName.value.trim(),
      assigneeId: assigneeName.value.trim() ? `u-${assigneeName.value.trim()}` : undefined,
      plannedTestDate: plannedTestDate.value,
    });
    assignTarget.value = null;
    await load();
  } catch (e) {
    if (typeof globalThis.alert === "function") globalThis.alert((e as Error).message);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <div>
    <!-- @entry M03.F02.I01 任务分配队列页 -->
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">任务分配</h1>
        <p class="text-sm text-slate-500">
          M03.F02 为接样单指定检测人员与计划日期（flowStatus=task_assignment）
        </p>
      </div>
    </div>

    <div class="mb-4 flex gap-2">
      <input
        v-model="keyword"
        placeholder="按委托书编号搜索"
        class="border rounded h-9 px-2 text-sm bg-white max-w-sm"
        @keyup.enter="load()"
      />
      <Button variant="outline" @click="load()">搜索</Button>
    </div>

    <div class="bg-white rounded shadow">
      <div class="flex items-center justify-between px-4 py-2 border-b">
        <h3 class="text-base font-semibold">待安排接样单（{{ total || "…" }}）</h3>
        <span v-if="loading" class="text-xs text-slate-400">加载中…</span>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-4 py-2 text-left">委托书编号</th>
            <th class="px-4 py-2 text-left">工程名称</th>
            <th class="px-4 py-2 text-left">检测人员</th>
            <th class="px-4 py-2 text-left">计划日期</th>
            <th class="px-4 py-2 text-left">流程状态</th>
            <th class="px-4 py-2 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="items.length === 0 && !loading">
            <td colspan="6" class="px-4 py-8 text-center text-slate-400">
              （无待安排接样单）
            </td>
          </tr>
          <tr v-for="r in items" :key="r.id" class="border-t hover:bg-slate-50">
            <td class="px-4 py-2 font-mono text-xs">
              <router-link :to="`/receipts/${r.id}`" class="text-blue-600 hover:underline">
                {{ r.commissionCode }}
              </router-link>
            </td>
            <td class="px-4 py-2">{{ r.projectName ?? "—" }}</td>
            <td class="px-4 py-2">
              <span v-if="r.assigneeName">{{ r.assigneeName }}</span>
              <span v-else class="text-slate-400">待安排</span>
            </td>
            <td class="px-4 py-2">{{ r.plannedTestDate ?? "—" }}</td>
            <td class="px-4 py-2 text-xs">
              {{ FLOW_STAGE_LABELS[r.flowStatus] ?? r.flowStatus }}
            </td>
            <td class="px-4 py-2 text-right">
              <Button
                variant="outline"
                size="sm"
                data-fn="M03.F02.I02"
                @click="openAssign(r)"
              >
                安排
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div
        v-if="assignTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="assignTarget = null"
      >
        <div class="bg-white rounded shadow-xl sm:max-w-md w-full p-6">
          <h2 class="text-lg font-semibold">任务安排 — {{ assignTarget.commissionCode }}</h2>
          <p class="text-sm text-slate-500 mb-3">指定检测人员与计划检测日期。</p>
          <div class="space-y-3">
            <label class="text-xs block">检测人员 *
              <input
                v-model="assigneeName"
                placeholder="如：张三"
                class="border rounded h-9 px-2 text-sm w-full mt-1"
              />
            </label>
            <label class="text-xs block">计划检测日期 *
              <input
                v-model="plannedTestDate"
                type="date"
                class="border rounded h-9 px-2 text-sm w-full mt-1"
              />
            </label>
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <Button variant="outline" @click="assignTarget = null">取消</Button>
            <Button
              variant="default"
              class="bg-blue-600 hover:bg-blue-700"
              :disabled="saving || !assigneeName.trim() || !plannedTestDate"
              @click="handleSave()"
            >
              保存
            </Button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>