<script setup lang="ts">
// M03.F03 数据录入 — vue 仓镜像 react 仓 Batch 2B-2。
//
// 镜像 react 仓 src/features/data-entry/DataEntryPage.tsx（vue 翻译规则 4 条同 Batch 2B-1）：
//   1. JSX → template；className → class
//   2. useState → ref / useEffect → onMounted/watch
//   3. 数据获取走全局 axios（http-client.ts 已装 baseUrl + Bearer）
//   4. 弹窗走 <Dialog> 原语家族（Phase 2e-3；reka-ui 底座，与 ConfirmDialog 同代）
//
// 功能 ID：
//   M03.F03.I01 数据录入页（@entry）
//   M03.F03.I02 保存检测记录（弹窗内「保存」按钮 data-fn）
//   M03.F03.I03 行内「录入结果」按钮（data-fn）
import { computed, onMounted, reactive, ref } from "vue";
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
import DefaultParamCard from "@/features/data-entry/models/DefaultParamCard.vue";
import CementCompressCard from "@/features/data-entry/models/CementCompressCard.vue";

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
  categoryCode: string;
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

import type { TestRecord } from "@/api/endpoints/endpoints.schemas";
interface Sample { id: string; sampleCode: string }
interface InspectionParameter { code: string; name: string; canonicalName?: string; unit?: string }

const items = ref<SampleReceipt[]>([]);
const total = ref(0);
const keyword = ref("");
const loading = ref(false);
const entryTarget = ref<SampleReceipt | null>(null);
const submitting = ref(false);

const samples = ref<Sample[]>([]);
const parameters = ref<InspectionParameter[]>([]);
const records = reactive<Record<string, TestRecord>>({});
const selectedSampleId = ref<string>("");
const activeParamCode = ref<string>("");

async function load(): Promise<void> {
  loading.value = true;
  try {
    const params: Record<string, string | number> = {
      page: 1,
      pageSize: 50,
      flowStatus: "data_entry",
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

onMounted(() => void load());

async function openEntry(r: SampleReceipt): Promise<void> {
  entryTarget.value = r;
  try {
    const [sRes, pRes, tRes] = await Promise.all([
      axios
        .get<{ items: Sample[] }>(API_ROUTES["/samples"], {
          params: { receiptId: r.id, page: 1, pageSize: 50 },
        })
        .catch(() => ({ data: { items: [] as Sample[] } })),
      axios
        .get<{ items: InspectionParameter[] }>(API_ROUTES["/inspection-parameters"], {
          params: { page: 1, pageSize: 200 },
        })
        .catch(() => ({ data: { items: [] as InspectionParameter[] } })),
      axios
        .get<{ items: TestRecord[] }>(API_ROUTES["/test-records"], {
          params: { receiptId: r.id, page: 1, pageSize: 200 },
        })
        .catch(() => ({ data: { items: [] as TestRecord[] } })),
    ]);
    samples.value = sRes.data?.items ?? [];
    parameters.value = pRes.data?.items ?? [];
    const tItems = tRes.data?.items ?? [];
    for (const t of tItems) {
      const key = `${t.sampleId}#${t.parameterCode}`;
      records[key] = t;
    }
    if (samples.value.length > 0) selectedSampleId.value = samples.value[0]!.id;
    if (parameters.value.length > 0) activeParamCode.value = parameters.value[0]!.code;
  } catch (e) {
    if (typeof globalThis.alert === "function") globalThis.alert((e as Error).message);
  }
}

async function handleSave(): Promise<void> {
  const t = entryTarget.value;
  if (!t || !selectedSampleId.value || !activeParamCode.value) return;
  submitting.value = true;
  try {
    const key = `${selectedSampleId.value}#${activeParamCode.value}`;
    const rec = records[key];
    const body = {
      receiptId: t.id,
      sampleId: selectedSampleId.value,
      parameterCode: activeParamCode.value,
      result: rec?.result ?? "",
      verdict: rec?.verdict ?? "",
      standardCode: rec?.standardCode ?? "",
      requirement: rec?.requirement ?? "",
    };
    if (rec?.id) {
      await axios.put(`${API_ROUTES["/test-records"]}/${rec.id}`, body);
    } else {
      await axios.post(API_ROUTES["/test-records"], body);
    }
    entryTarget.value = null;
    await load();
  } catch (e) {
    if (typeof globalThis.alert === "function") globalThis.alert((e as Error).message);
  } finally {
    submitting.value = false;
  }
}

const activeParam = computed(() =>
  parameters.value.find((p) => p.code === activeParamCode.value),
);

const activeRec = computed<TestRecord | undefined>(() =>
  selectedSampleId.value && activeParamCode.value
    ? records[`${selectedSampleId.value}#${activeParamCode.value}`]
    : undefined,
);

const isCement = computed(() => entryTarget.value?.categoryCode === "cement");

function onParamChange(patch: Partial<TestRecord>): void {
  if (!selectedSampleId.value || !activeParamCode.value) return;
  const key = `${selectedSampleId.value}#${activeParamCode.value}`;
  records[key] = {
    ...(records[key] ?? ({} as TestRecord)),
    id: records[key]?.id ?? "",
    sampleId: selectedSampleId.value,
    parameterCode: activeParamCode.value,
    ...patch,
  } as TestRecord;
}
</script>

<template>
  <div>
    <!-- @entry M03.F03.I01 数据录入页 -->
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">数据录入</h1>
        <p class="text-sm text-slate-500">
          M03.F03 样品检测数据录入与人工改判（flowStatus=data_entry）
        </p>
      </div>
    </div>

    <div class="mb-4 flex gap-2">
      <Input
        v-model="keyword"
        class="max-w-sm bg-white"
        placeholder="按委托书编号搜索"
        @keyup.enter="load()"
      />
      <Button variant="outline" @click="load()">搜索</Button>
    </div>

    <div class="bg-white rounded shadow">
      <div class="flex items-center justify-between px-4 py-2 border-b">
        <h3 class="text-base font-semibold">待录入接样单（{{ total || "…" }}）</h3>
        <span v-if="loading" class="text-xs text-slate-400">加载中…</span>
      </div>
      <Table class="w-full text-sm">
        <TableHeader class="bg-slate-50 text-xs uppercase text-slate-500">
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
            <TableCell colspan="6" class="px-4 py-8 text-center text-slate-400">（无待录入接样单）</TableCell>
          </TableRow>
          <TableRow v-for="r in items" :key="r.id" class="border-t hover:bg-slate-50">
            <TableCell class="px-4 py-2 font-mono text-xs">
              <router-link :to="`/receipts/${r.id}`" class="text-blue-600 hover:underline">
                {{ r.commissionCode }}
              </router-link>
            </TableCell>
            <TableCell class="px-4 py-2">{{ r.projectName ?? "—" }}</TableCell>
            <TableCell class="px-4 py-2">{{ r.assigneeName ?? "—" }}</TableCell>
            <TableCell class="px-4 py-2">{{ r.plannedTestDate ?? "—" }}</TableCell>
            <TableCell class="px-4 py-2 text-xs">
              {{ FLOW_STAGE_LABELS[r.flowStatus] ?? r.flowStatus }}
            </TableCell>
            <TableCell class="px-4 py-2 text-right">
              <Button
                variant="outline"
                size="sm"
                data-fn="M03.F03.I03"
                @click="openEntry(r)"
              >
                录入结果
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <Dialog
      :open="entryTarget !== null"
      @update:open="
        (v: boolean) => {
          if (!v) entryTarget = null;
        }
      "
    >
      <DialogContent class="sm:max-w-3xl gap-0">
        <DialogHeader class="mb-3">
          <DialogTitle>录入结果 — {{ entryTarget?.commissionCode ?? "" }}</DialogTitle>
          <DialogDescription>
            选择样品 + 检测参数后填写检测结果与单项评定。
          </DialogDescription>
        </DialogHeader>

        <div class="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          <Label class="text-xs block">样品
            <Select
              v-model="selectedSampleId"
              class="mt-1"
            >
              <SelectTrigger>
                <SelectValue placeholder="（无样品）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="s in samples" :key="s.id" :value="s.id">
                  {{ s.sampleCode }}
                </SelectItem>
              </SelectContent>
            </Select>
          </Label>
          <Label class="text-xs block">检测参数
            <Select
              v-model="activeParamCode"
              class="mt-1"
            >
              <SelectTrigger>
                <SelectValue placeholder="（无参数）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="p in parameters" :key="p.code" :value="p.code">
                  {{ p.canonicalName || p.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </Label>
        </div>

        <div class="mt-3">
          <template v-if="activeParam && isCement">
            <CementCompressCard
              :parameter="activeParam"
              :record="activeRec"
              :sample-id="selectedSampleId"
              :standards="[]"
              :std-params="[]"
              :tech-reqs="[]"
              :config="undefined"
              :on-change="onParamChange"
            />
          </template>
          <template v-else-if="activeParam">
            <DefaultParamCard
              :parameter="activeParam"
              :record="activeRec"
              :sample-id="selectedSampleId"
              :standards="[]"
              :std-params="[]"
              :tech-reqs="[]"
              :config="undefined"
              :on-change="onParamChange"
            />
          </template>
          <div v-else class="border rounded p-4 text-sm text-slate-400">
            暂无可用检测参数
          </div>
        </div>

        <DialogFooter class="mt-4 justify-end gap-2">
          <Button variant="outline" @click="entryTarget = null">取消</Button>
          <!-- @entry M03.F03.I02 保存检测记录 -->
          <Button
            variant="default"
            class="bg-blue-600 hover:bg-blue-700"
            :disabled="submitting || !selectedSampleId || !activeParamCode"
            data-fn="M03.F03.I02"
            @click="handleSave()"
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>