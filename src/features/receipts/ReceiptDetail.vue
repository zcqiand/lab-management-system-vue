<script setup lang="ts">
// M03.F09 接样单详情 — /receipts/:id 详情页（流程历史时间线 + 报告预览 Batch 2B-2 升级版）
//
// 镜像 react 仓 src/features/receipts/ReceiptDetail.tsx
//
// 功能 ID：
//   M03.F09.I01 接样单详情页
//   M03.F09.I02 流程历史时间线
//   M03.F09.I03 报告预览按钮（Batch 2B-2 升级为 ReportPreviewModal 真组件）
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import axios from "axios";
import { API_ROUTES } from "@/api/legacy-client";
import ReportPreviewModal from "@/features/data-entry/ReportPreviewModal.vue";

type FlowStage =
  | "receiving"
  | "task_assignment"
  | "data_entry"
  | "review"
  | "approval"
  | "issuance"
  | "archived"
  | "completed";

interface FlowHistoryEntry {
  action: "submit" | "return" | "withdraw";
  from: FlowStage;
  to: FlowStage;
  operator: string;
  at: string;
  reason?: string;
}

interface SampleReceipt {
  id: string;
  contractId: string;
  commissionCode: string;
  commissionDate: string;
  categoryCode: string;
  projectName?: string;
  clientUnit?: string;
  buildingUnit?: string;
  supervisorUnit?: string;
  constructionUnit?: string;
  witnessUnit?: string;
  witness?: string;
  witnessPhone?: string;
  inspector?: string;
  inspectorPhone?: string;
  samplingLocation?: string;
  receivedBy: string;
  sampleSource: string;
  testCategory: string;
  testParameters?: string[];
  flowStatus: FlowStage;
  flowHistory: FlowHistoryEntry[];
  assigneeName?: string;
  plannedTestDate?: string;
  reportCode?: string;
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

const route = useRoute();
const router = useRouter();
const receipt = ref<SampleReceipt | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);
const previewOpen = ref(false);

const id = computed(() => String(route.params.id ?? ""));

async function fetchReceipt(): Promise<void> {
  if (!id.value) return;
  loading.value = true;
  error.value = null;
  try {
    const res = await axios.get<SampleReceipt>(`${API_ROUTES["/receipts"]}/${id.value}`);
    receipt.value = res.data;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "加载失败";
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void fetchReceipt();
});
watch(id, () => void fetchReceipt());

const history = computed(() =>
  [...(receipt.value?.flowHistory ?? [])].sort((a, b) => b.at.localeCompare(a.at)),
);

function alertError(msg: string): void {
  if (typeof globalThis.alert === "function") globalThis.alert(msg);
}
</script>

<template>
  <div class="space-y-4">
    <div v-if="loading" class="p-8 text-center text-slate-500">加载中…</div>
    <div v-else-if="error" class="p-8 text-red-600">{{ error }}</div>
    <template v-else-if="receipt">
      <!-- @entry M03.F09.I01 接样单详情页 -->
      <div class="bg-white rounded shadow p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-base font-semibold text-slate-700">
            接样单详情 — {{ receipt.commissionCode }}
          </h3>
          <div class="flex items-center gap-2">
            <button
              data-fn="M03.F09.I03"
              class="border border-blue-300 text-blue-600 rounded px-3 py-1 text-sm hover:text-blue-700"
              @click="previewOpen = true"
            >
              报告预览
            </button>
            <button
              class="border rounded px-3 py-1 text-sm text-slate-500 hover:text-slate-700"
              @click="router.back()"
            >
              返回
            </button>
          </div>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-4 gap-x-4 gap-y-2 text-sm">
          <div><span class="text-slate-500">委托书编号：</span>{{ receipt.commissionCode }}</div>
          <div><span class="text-slate-500">委托日期：</span>{{ receipt.commissionDate }}</div>
          <div><span class="text-slate-500">工程名称：</span>{{ receipt.projectName ?? "—" }}</div>
          <div><span class="text-slate-500">委托单位：</span>{{ receipt.clientUnit ?? "—" }}</div>
          <div><span class="text-slate-500">建设单位：</span>{{ receipt.buildingUnit ?? "—" }}</div>
          <div><span class="text-slate-500">监理单位：</span>{{ receipt.supervisorUnit ?? "—" }}</div>
          <div><span class="text-slate-500">施工单位：</span>{{ receipt.constructionUnit ?? "—" }}</div>
          <div><span class="text-slate-500">见证单位：</span>{{ receipt.witnessUnit ?? "—" }}</div>
          <div><span class="text-slate-500">见证人：</span>{{ receipt.witness ?? "—" }}</div>
          <div><span class="text-slate-500">送检人：</span>{{ receipt.inspector ?? "—" }}</div>
          <div><span class="text-slate-500">取样地点：</span>{{ receipt.samplingLocation ?? "—" }}</div>
          <div><span class="text-slate-500">接样人：</span>{{ receipt.receivedBy }}</div>
          <div><span class="text-slate-500">报告类别：</span>{{ receipt.categoryCode }}</div>
          <div><span class="text-slate-500">检测类别：</span>{{ receipt.testCategory }}</div>
          <div><span class="text-slate-500">样品来源：</span>{{ receipt.sampleSource }}</div>
          <div><span class="text-slate-500">合同 ID：</span>{{ receipt.contractId }}</div>
          <div>
            <span class="text-slate-500">流程状态：</span>
            {{ FLOW_STAGE_LABELS[receipt.flowStatus] ?? receipt.flowStatus }}
          </div>
          <div>
            <span class="text-slate-500">检测结果：</span>
            {{ receipt.result === "pass" ? "合格" : receipt.result === "fail" ? "不合格" : "—" }}
          </div>
          <div v-if="receipt.assigneeName">
            <span class="text-slate-500">检测负责人：</span>{{ receipt.assigneeName }}
          </div>
          <div v-if="receipt.plannedTestDate">
            <span class="text-slate-500">计划检测日期：</span>{{ receipt.plannedTestDate }}
          </div>
          <div v-if="receipt.reportCode">
            <span class="text-slate-500">报告编号：</span>{{ receipt.reportCode }}
          </div>
        </div>
      </div>

      <!-- @entry M03.F09.I02 流程历史时间线（按 at 倒序） -->
      <div data-fn="M03.F09.I02" class="bg-white rounded shadow p-4">
        <h3 class="text-base font-semibold mb-3">流程历史</h3>
        <div v-if="history.length === 0" class="py-4 text-center text-sm text-slate-400">
          （暂无流程操作记录）
        </div>
        <ol v-else class="space-y-2">
          <li
            v-for="(h, i) in history"
            :key="i"
            class="flex items-center gap-3 border-l-2 border-slate-200 pl-3"
          >
            <span class="text-xs text-slate-400">{{ h.at }}</span>
            <span class="font-medium">
              {{ h.action === "submit" ? "提交" : h.action === "return" ? "退回" : "撤回" }}
            </span>
            <span class="text-sm text-slate-600">
              {{ FLOW_STAGE_LABELS[h.from] }} → {{ FLOW_STAGE_LABELS[h.to] }}
            </span>
            <span class="text-xs text-slate-500">操作人：{{ h.operator }}</span>
            <span v-if="h.reason" class="text-xs text-slate-500">备注：{{ h.reason }}</span>
          </li>
        </ol>
      </div>

      <ReportPreviewModal
        :open="previewOpen"
        :receipt="receipt"
        @close="previewOpen = false"
      />
    </template>
  </div>
</template>