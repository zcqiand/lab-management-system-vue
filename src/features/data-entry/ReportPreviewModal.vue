<script setup lang="ts">
// M03.F09.I03 报告预览弹窗（Sprint 2 Batch 2B-8 vue 仓镜像 react 仓）。
//
// 完整版（react 仓 367 行）含 PizZip + Docxtemplater + docx-preview 浏览器渲染；
// vue 仓本批 stub：字段表 + 类别 + 检测参数列表（与 Batch 2B-2 占位同结构，
// 升级到 react 仓同款 docx 渲染见后续 batch）。
//
// 数据获取走 vue-query（@/api/legacy-client 或 orval endpoints）。
import { computed, ref, watch } from "vue";
import { API_ROUTES } from "@/api/legacy-client";

interface SampleReceiptLike {
  id: string;
  commissionCode: string;
  categoryCode: string;
  projectName?: string;
  clientUnit?: string;
  testCategory?: string;
}

interface SampleLike {
  sampleCode?: string;
  sampleName?: string;
  structuralPart?: string;
}

interface TestRecordLike {
  sampleId?: string;
  parameterCode: string;
  result?: string;
  verdict?: string;
  requirement?: string;
}

interface ParamDefLike {
  code: string;
  name: string;
}

const props = defineProps<{
  open: boolean;
  receipt: SampleReceiptLike;
  onClose: () => void;
}>();

const samples = ref<SampleLike[]>([]);
const records = ref<TestRecordLike[]>([]);
const parameters = ref<ParamDefLike[]>([]);

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    try {
      const [s, p] = await Promise.all([
        fetch(API_ROUTES["/samples"]).then((r) => r.json()) as Promise<SampleLike[]>,
        fetch(API_ROUTES["/inspection-parameters"]).then((r) => r.json()) as Promise<ParamDefLike[]>,
      ]);
      samples.value = s;
      parameters.value = p;
      const r = await fetch(`${API_ROUTES["/test-records"]}?receiptId=${props.receipt.id}`).then(
        (resp) => resp.json(),
      ) as TestRecordLike[];
      records.value = r;
    } catch {
      // stub：失败不渲染
    }
  },
);

const categoryName = computed(() => {
  const p = parameters.value.find((x) => x.code === props.receipt.categoryCode);
  return p?.name ?? props.receipt.categoryCode;
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center"
      data-fn="M03.F01.I07"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[94vh] flex flex-col">
        <header class="flex items-center justify-between px-5 py-3 border-b">
          <h2 class="text-base font-semibold">报告预览 — {{ receipt.commissionCode }}</h2>
          <button
            type="button"
            class="text-gray-400 hover:text-gray-600 text-xl leading-none"
            @click="onClose"
          >
            ×
          </button>
        </header>
        <div class="px-5 py-4 overflow-auto">
          <table class="w-full text-xs">
            <tbody>
              <tr>
                <td class="py-1 text-slate-500 w-24">委托单位</td>
                <td class="py-1">{{ receipt.clientUnit ?? "—" }}</td>
                <td class="py-1 text-slate-500 w-24">报告类别</td>
                <td class="py-1">{{ categoryName }}</td>
              </tr>
              <tr>
                <td class="py-1 text-slate-500">工程名称</td>
                <td class="py-1">{{ receipt.projectName ?? "—" }}</td>
                <td class="py-1 text-slate-500">检测类别</td>
                <td class="py-1">{{ receipt.testCategory ?? "—" }}</td>
              </tr>
            </tbody>
          </table>

          <h3 class="mt-4 mb-2 font-medium">检测参数结果</h3>
          <table class="w-full text-xs border-collapse border">
            <thead>
              <tr class="bg-gray-50">
                <th class="border px-2 py-1 text-left">项目</th>
                <th class="border px-2 py-1 text-left">技术要求</th>
                <th class="border px-2 py-1 text-left">检测结果</th>
                <th class="border px-2 py-1 text-left">单项评定</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="rec in records" :key="rec.parameterCode">
                <td class="border px-2 py-1">{{
                  parameters.find((p) => p.code === rec.parameterCode)?.name ??
                  rec.parameterCode
                }}</td>
                <td class="border px-2 py-1">{{ rec.requirement ?? "—" }}</td>
                <td class="border px-2 py-1">{{ rec.result ?? "—" }}</td>
                <td class="border px-2 py-1">{{ rec.verdict ?? "—" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <footer class="flex items-center justify-end gap-2 px-5 py-3 border-t bg-gray-50">
          <button
            type="button"
            class="px-4 py-1.5 text-sm border rounded hover:bg-gray-100"
            @click="onClose"
          >
            关闭
          </button>
          <button
            type="button"
            class="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            打印
          </button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>