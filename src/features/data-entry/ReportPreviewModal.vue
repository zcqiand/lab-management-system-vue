<script setup lang="ts">
// M03.F09.I03 报告预览弹窗（升级版，vue 仓镜像 react 仓 Batch 2B-2）。
// vue 仓无 /templates 静态资源，跳过 docx 渲染，仅展示字段表 + 类别 + 检测参数列表。

type FlowStage =
  | "receiving"
  | "task_assignment"
  | "data_entry"
  | "review"
  | "approval"
  | "issuance"
  | "archived"
  | "completed";

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

defineProps<{
  open: boolean;
  receipt: {
    commissionCode: string;
    commissionDate: string;
    projectName?: string;
    clientUnit?: string;
    categoryCode: string;
    testCategory: string;
    flowStatus: FlowStage;
    result?: "pass" | "fail" | "";
    testParameters?: string[];
  };
}>();
const emit = defineEmits<{ (e: "close"): void }>();

function alertError(msg: string): void {
  if (typeof globalThis.alert === "function") globalThis.alert(msg);
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="emit('close')"
    >
      <div class="bg-white rounded shadow-xl sm:max-w-2xl w-full p-6">
        <h2 class="text-lg font-semibold">报告预览 — {{ receipt.commissionCode }}</h2>
        <p class="text-sm text-slate-500 mb-3">
          M03.F09.I03 报告预览（Batch 2B-2 升级版：字段表 + 类别参数列表 + 状态）
        </p>
        <div class="space-y-3 text-sm">
          <div class="grid grid-cols-2 gap-x-4 gap-y-1">
            <div><span class="text-slate-500">委托书编号：</span>{{ receipt.commissionCode }}</div>
            <div><span class="text-slate-500">委托日期：</span>{{ receipt.commissionDate }}</div>
            <div><span class="text-slate-500">工程名称：</span>{{ receipt.projectName ?? "—" }}</div>
            <div><span class="text-slate-500">委托单位：</span>{{ receipt.clientUnit ?? "—" }}</div>
            <div><span class="text-slate-500">报告类别：</span>{{ receipt.categoryCode }}</div>
            <div><span class="text-slate-500">检测类别：</span>{{ receipt.testCategory }}</div>
            <div><span class="text-slate-500">流程状态：</span>{{ FLOW_STAGE_LABELS[receipt.flowStatus] ?? receipt.flowStatus }}</div>
            <div>
              <span class="text-slate-500">检测结果：</span>
              {{ receipt.result === 'pass' ? '合格' : receipt.result === 'fail' ? '不合格' : '—' }}
            </div>
          </div>
          <div>
            <span class="text-slate-500">检测参数：</span>
            {{ receipt.testParameters && receipt.testParameters.length > 0 ? receipt.testParameters.join("、") : "—" }}
          </div>
          <div class="border-t pt-2 text-xs text-slate-500">
            说明：vue 仓当前不含 docx 模板渲染（无 /templates 静态资源），完整 ReportPreviewModal
            渲染待 Batch 2B-N（shared 算法域 + 模板 JSON 下沉）一并补齐。
          </div>
        </div>
        <div class="mt-4 flex justify-end">
          <button class="px-4 py-2 bg-blue-600 text-white rounded text-sm" @click="emit('close')">
            关闭
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>