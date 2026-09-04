<script setup lang="ts">
// M03.F03 数据录入 — vue 仓镜像 react 仓 Batch 2B-2。
//
// 镜像 react 仓 src/features/data-entry/DataEntryPage.tsx（vue 翻译规则 4 条同 Batch 2B-1）：
//   1. JSX → template；className → class
//   2. useState → ref / useEffect → onMounted/watch
//   3. 数据获取走全局 axios（http-client.ts 已装 baseUrl + Bearer）
//   4. 弹窗自实现 Dialog（Teleport to body；与 ConfirmDialog 同模式）
//
// 功能 ID：
//   M03.F03.I01 数据录入页（@entry）
//   M03.F03.I02 保存检测记录（弹窗内「保存」按钮 data-fn）
//   M03.F03.I03 行内「录入结果」按钮（data-fn）
import { computed, onMounted, reactive, ref } from "vue";
import axios from "axios";
import { API_ROUTES } from "@/api/legacy-client";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";
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
            <td colspan="6" class="px-4 py-8 text-center text-slate-400">（无待录入接样单）</td>
          </tr>
          <tr v-for="r in items" :key="r.id" class="border-t hover:bg-slate-50">
            <td class="px-4 py-2 font-mono text-xs">
              <router-link :to="`/receipts/${r.id}`" class="text-blue-600 hover:underline">
                {{ r.commissionCode }}
              </router-link>
            </td>
            <td class="px-4 py-2">{{ r.projectName ?? "—" }}</td>
            <td class="px-4 py-2">{{ r.assigneeName ?? "—" }}</td>
            <td class="px-4 py-2">{{ r.plannedTestDate ?? "—" }}</td>
            <td class="px-4 py-2 text-xs">
              {{ FLOW_STAGE_LABELS[r.flowStatus] ?? r.flowStatus }}
            </td>
            <td class="px-4 py-2 text-right">
              <Button
                variant="outline"
                size="sm"
                data-fn="M03.F03.I03"
                @click="openEntry(r)"
              >
                录入结果
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Teleport to="body">
      <div
        v-if="entryTarget"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="entryTarget = null"
      >
        <div class="bg-white rounded shadow-xl sm:max-w-3xl w-full p-6">
          <h2 class="text-lg font-semibold">录入结果 — {{ entryTarget.commissionCode }}</h2>
          <p class="text-sm text-slate-500 mb-3">
            选择样品 + 检测参数后填写检测结果与单项评定。
          </p>

          <div class="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            <Label class="text-xs block">样品
              <select
                v-model="selectedSampleId"
                class="border rounded h-9 px-2 text-sm w-full mt-1 bg-white"
              >
                <option v-if="samples.length === 0" value="">（无样品）</option>
                <option v-for="s in samples" :key="s.id" :value="s.id">
                  {{ s.sampleCode }}
                </option>
              </select>
            </Label>
            <Label class="text-xs block">检测参数
              <select
                v-model="activeParamCode"
                class="border rounded h-9 px-2 text-sm w-full mt-1 bg-white"
              >
                <option v-if="parameters.length === 0" value="">（无参数）</option>
                <option v-for="p in parameters" :key="p.code" :value="p.code">
                  {{ p.canonicalName || p.name }}
                </option>
              </select>
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

          <div class="mt-4 flex justify-end gap-2">
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
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>