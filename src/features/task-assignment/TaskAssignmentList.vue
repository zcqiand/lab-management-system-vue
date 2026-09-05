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
import Dialog from "@/components/ui/Dialog.vue";
import DialogContent from "@/components/ui/DialogContent.vue";
import DialogDescription from "@/components/ui/DialogDescription.vue";
import DialogFooter from "@/components/ui/DialogFooter.vue";
import DialogHeader from "@/components/ui/DialogHeader.vue";
import DialogTitle from "@/components/ui/DialogTitle.vue";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";
import Table from "@/components/ui/Table.vue";
import TableBody from "@/components/ui/TableBody.vue";
import TableCell from "@/components/ui/TableCell.vue";
import TableHead from "@/components/ui/TableHead.vue";
import TableHeader from "@/components/ui/TableHeader.vue";
import TableRow from "@/components/ui/TableRow.vue";

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
        <p class="text-sm text-muted-foreground">
          M03.F02 为接样单指定检测人员与计划日期（flowStatus=task_assignment）
        </p>
      </div>
    </div>

    <div class="mb-4 flex gap-2">
      <Input
        v-model="keyword"
        placeholder="按委托书编号搜索"
        class="max-w-sm"
        @keyup.enter="load()"
      />
      <Button variant="outline" @click="load()">搜索</Button>
    </div>

    <div class="bg-white rounded shadow">
      <div class="flex items-center justify-between px-4 py-2 border-b">
        <h3 class="text-base font-semibold">待安排接样单（{{ total || "…" }}）</h3>
        <span v-if="loading" class="text-xs text-muted-foreground">加载中…</span>
      </div>
      <Table class="w-full text-sm">
        <TableHeader class="bg-muted text-xs uppercase text-muted-foreground">
          <TableRow>
            <TableHead class="px-4 py-2 text-left">委托书编号</TableHead>
            <TableHead class="px-4 py-2 text-left">工程名称</TableHead>
            <TableHead class="px-4 py-2 text-left">检测人员</TableHead>
            <TableHead class="px-4 py-2 text-left">计划日期</TableHead>
            <TableHead class="px-4 py-2 text-left">流程状态</TableHead>
            <TableHead class="px-4 py-2 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="items.length === 0 && !loading">
            <TableCell colspan="6" class="px-4 py-8 text-center text-muted-foreground">
              （无待安排接样单）
            </TableCell>
          </TableRow>
          <TableRow v-for="r in items" :key="r.id" class="border-t hover:bg-muted">
            <TableCell class="px-4 py-2 font-mono text-xs">
              <router-link :to="`/receipts/${r.id}`" class="text-info hover:underline">
                {{ r.commissionCode }}
              </router-link>
            </TableCell>
            <TableCell class="px-4 py-2">{{ r.projectName ?? "—" }}</TableCell>
            <TableCell class="px-4 py-2">
              <span v-if="r.assigneeName">{{ r.assigneeName }}</span>
              <span v-else class="text-muted-foreground">待安排</span>
            </TableCell>
            <TableCell class="px-4 py-2">{{ r.plannedTestDate ?? "—" }}</TableCell>
            <TableCell class="px-4 py-2 text-xs">
              {{ FLOW_STAGE_LABELS[r.flowStatus] ?? r.flowStatus }}
            </TableCell>
            <TableCell class="px-4 py-2 text-right">
              <Button
                variant="outline"
                size="sm"
                data-fn="M03.F02.I02"
                @click="openAssign(r)"
              >
                安排
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <Dialog
      :open="assignTarget !== null"
      @update:open="
        (v: boolean) => {
          if (!v) assignTarget = null;
        }
      "
    >
      <DialogContent class="sm:max-w-md gap-0">
        <DialogHeader class="mb-3">
          <DialogTitle>任务安排 — {{ assignTarget?.commissionCode ?? "" }}</DialogTitle>
          <DialogDescription>指定检测人员与计划检测日期。</DialogDescription>
        </DialogHeader>
        <div class="space-y-3">
          <Label class="text-xs block">检测人员 *
            <Input
              v-model="assigneeName"
              placeholder="如：张三"
              class="mt-1"
            />
          </Label>
          <Label class="text-xs block">计划检测日期 *
            <Input
              v-model="plannedTestDate"
              type="date"
              class="mt-1"
            />
          </Label>
        </div>
        <DialogFooter class="mt-4 justify-end gap-2">
          <Button variant="outline" @click="assignTarget = null">取消</Button>
          <Button
            variant="default"
            class="bg-info hover:bg-info/90"
            :disabled="saving || !assigneeName.trim() || !plannedTestDate"
            @click="handleSave()"
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>