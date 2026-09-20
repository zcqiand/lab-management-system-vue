<script setup lang="ts">
// M03.F09.I03 报告预览弹窗（Sprint 2 Batch 2B-8 vue 仓镜像 react 仓）。
//
// 完整版（react 仓 367 行）含 PizZip + Docxtemplater + docx-preview 浏览器渲染；
// vue 仓本批 stub：字段表 + 类别 + 检测参数列表（与 Batch 2B-2 占位同结构，
// 升级到 react 仓同款 docx 渲染见后续 batch）。
//
// 数据获取走 orval 具名函数（src/api/endpoints/*）——SSOT 是 shared TypeSpec。
import { computed, ref, watch } from "vue";
import { samplesListSamples } from "@/api/endpoints/samples/samples";
import { inspectionDictionaryListParameters } from "@/api/endpoints/inspection-dictionary/inspection-dictionary";
import { testRecordsListTestRecords } from "@/api/endpoints/test-records/test-records";
import type { InspectionParameter, Sample, SampleReceipt, TestRecord } from "@/api/endpoints/model";
import { normalizeListResponse } from "@/lib/responses";
import Button from "@/components/ui/Button.vue";
import Dialog from "@/components/ui/Dialog.vue";
import DialogContent from "@/components/ui/DialogContent.vue";
import DialogDescription from "@/components/ui/DialogDescription.vue";
import DialogFooter from "@/components/ui/DialogFooter.vue";
import DialogHeader from "@/components/ui/DialogHeader.vue";
import DialogTitle from "@/components/ui/DialogTitle.vue";
import Table from "@/components/ui/Table.vue";
import TableBody from "@/components/ui/TableBody.vue";
import TableCell from "@/components/ui/TableCell.vue";
import TableHead from "@/components/ui/TableHead.vue";
import TableHeader from "@/components/ui/TableHeader.vue";
import TableRow from "@/components/ui/TableRow.vue";

// 类型走 orval 生成物（src/api/endpoints/model）——SSOT 是 shared TypeSpec。
type SampleReceiptLike = Pick<
  SampleReceipt,
  "id" | "commissionCode" | "categoryCode" | "projectName" | "clientUnit" | "testCategory"
>;
type SampleLike = Pick<Sample, "id" | "sampleCode" | "sampleName" | "structuralPart">;
type TestRecordLike = Pick<
  TestRecord,
  "sampleId" | "parameterCode" | "result" | "verdict" | "requirement"
>;
type ParamDefLike = Pick<InspectionParameter, "code" | "name">;

const props = defineProps<{
  open: boolean;
  receipt: SampleReceiptLike;
  onClose: () => void;
}>();

// Dialog 走 v-model:open，受控由父组件的 `open` prop 决定；
// 父组件的 `onClose` 是旧版手写 Teleport 时代的回调，watch 转发。
watch(
  () => props.open,
  (v) => {
    if (!v) props.onClose();
  },
);

const samples = ref<SampleLike[]>([]);
const records = ref<TestRecordLike[]>([]);
const parameters = ref<ParamDefLike[]>([]);

watch(
  () => props.open,
  async (isOpen) => {
    if (!isOpen) return;
    try {
      const [sRes, pRes] = await Promise.all([
        samplesListSamples({ receiptId: props.receipt.id, page: 1, pageSize: 200 }),
        inspectionDictionaryListParameters({ page: 1, pageSize: 200 }),
      ]);
      samples.value = normalizeListResponse<SampleLike>(sRes.data).items;
      parameters.value = normalizeListResponse<ParamDefLike>(pRes.data).items;
      // 契约 test-records 列表只有 sampleId 维度（无 receiptId 过滤）——
      // 按接样单样品逐个取检测记录（GAP 见迁移报告）。
      const tLists = await Promise.all(
        samples.value.map((s) =>
          testRecordsListTestRecords({ sampleId: s.id, page: 1, pageSize: 200 })
            .then((res) => normalizeListResponse<TestRecordLike>(res.data).items)
            .catch(() => [] as TestRecordLike[]),
        ),
      );
      records.value = tLists.flat();
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
  <Dialog
    :open="open"
    @update:open="
      (v: boolean) => {
        if (!v) onClose();
      }
    "
  >
    <DialogContent
      data-fn="M03.F01.I07"
      hide-close
      class="max-w-5xl gap-0 p-0 max-h-[94vh] flex flex-col"
    >
      <DialogHeader class="flex flex-row items-center justify-between px-5 py-3 border-b gap-0">
        <DialogTitle>报告预览 — {{ receipt.commissionCode }}</DialogTitle>
        <DialogDescription class="sr-only">报告预览弹窗</DialogDescription>
      </DialogHeader>
      <div class="px-5 py-4 overflow-auto">
        <Table class="w-full text-xs">
          <TableBody>
            <TableRow>
              <TableCell class="py-1 text-muted-foreground w-24">委托单位</TableCell>
              <TableCell class="py-1">{{ receipt.clientUnit ?? "—" }}</TableCell>
              <TableCell class="py-1 text-muted-foreground w-24">报告类别</TableCell>
              <TableCell class="py-1">{{ categoryName }}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell class="py-1 text-muted-foreground">工程名称</TableCell>
              <TableCell class="py-1">{{ receipt.projectName ?? "—" }}</TableCell>
              <TableCell class="py-1 text-muted-foreground">检测类别</TableCell>
              <TableCell class="py-1">{{ receipt.testCategory ?? "—" }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <h3 class="mt-4 mb-2 font-medium">检测参数结果</h3>
        <Table class="w-full text-xs border-collapse border">
          <TableHeader>
            <TableRow class="bg-muted">
              <TableHead class="border px-2 py-1 text-left">项目</TableHead>
              <TableHead class="border px-2 py-1 text-left">技术要求</TableHead>
              <TableHead class="border px-2 py-1 text-left">检测结果</TableHead>
              <TableHead class="border px-2 py-1 text-left">单项评定</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="rec in records" :key="rec.parameterCode">
              <TableCell class="border px-2 py-1">{{
                parameters.find((p) => p.code === rec.parameterCode)?.name ?? rec.parameterCode
              }}</TableCell>
              <TableCell class="border px-2 py-1">{{ rec.requirement ?? "—" }}</TableCell>
              <TableCell class="border px-2 py-1">{{ rec.result ?? "—" }}</TableCell>
              <TableCell class="border px-2 py-1">{{ rec.verdict ?? "—" }}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <DialogFooter
        class="flex items-center justify-end gap-2 px-5 py-3 border-t bg-muted sm:justify-end"
      >
        <Button variant="outline" class="px-4 py-1.5 text-sm rounded" @click="onClose">
          关闭
        </Button>
        <Button variant="default" class="bg-info hover:bg-info/90 px-4 py-1.5 text-sm rounded">
          打印
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
