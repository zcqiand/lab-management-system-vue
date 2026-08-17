<script setup lang="ts">
// M03.F01 接样管理 — 列表 + flowStatus 三态过滤 + 新建/编辑/删除/提交
//
// 镜像 react 仓 src/features/receipts/ReceiptsList.tsx（vue 翻译规则 4 条）：
//   1. JSX → template；className → class
//   2. useState → ref / useEffect → onMounted/watch
//   3. 数据获取走全局 axios（http-client.ts 已装 baseUrl + Bearer 拦截器）
//   4. 弹窗 ConfirmModal → ConfirmDialog（Teleport to body，1:1 API）
//
// 功能 ID：
//   M03.F01.I01 列表（行 data-fn）
//   M03.F01.I02 新建/编辑（按钮 data-fn + @entry）
//   M03.F01.I03 删除（按钮 data-fn）
//   M03.F01.I04 提交（按钮 data-fn，调 /api/receipts/flow 推进状态机）
import { computed, onMounted, reactive, ref } from "vue";
import axios from "axios";
import { API_ROUTES } from "@/api/legacy-client";
import ConfirmDialog from "@/components/app/ConfirmDialog.vue";

// 内联类型（vue 仓无 src/types/ 目录；镜像 react/src/types/process/{sample-receipt,flow}.ts）
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
  samplingLocation?: string;
  witness?: string;
  witnessPhone?: string;
  inspector?: string;
  inspectorPhone?: string;
  receivedBy: string;
  sampleSource: string;
  testCategory: string;
  testParameters?: string[];
  flowStatus: FlowStage;
  flowHistory: FlowHistoryEntry[];
  lastSubmittedBy: string | null;
  assigneeId?: string;
  assigneeName?: string;
  plannedTestDate?: string;
  result?: "pass" | "fail" | "";
  createdAt: string;
  updatedAt: string;
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

type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; id: string };
type FlowFilter = "" | "receiving" | "submitted";

type ReceiptBody = {
  commissionCode: string;
  commissionDate: string;
  projectName: string;
  clientUnit: string;
  testCategory: string;
  sampleSource: string;
  categoryCode: string;
};

const EMPTY_BODY: ReceiptBody = {
  commissionCode: "",
  commissionDate: "",
  projectName: "",
  clientUnit: "",
  testCategory: "委托检验",
  sampleSource: "施工送检",
  categoryCode: "cement",
};

const items = ref<SampleReceipt[]>([]);
const total = ref(0);
const flowFilter = ref<FlowFilter>("");
const keyword = ref("");
const mode = ref<Mode>({ kind: "idle" });
const loading = ref(false);
const deleteTarget = ref<SampleReceipt | null>(null);
const submitting = ref<string | null>(null);
const form = reactive<ReceiptBody>({ ...EMPTY_BODY });

const editing = computed<SampleReceipt | null>(() => {
  if (mode.value.kind !== "edit") return null;
  const id = (mode.value as { kind: "edit"; id: string }).id;
  return items.value.find((r) => r.id === id) ?? null;
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    const params: Record<string, string | number> = { page: 1, pageSize: 50 };
    if (flowFilter.value === "receiving") params["flowStatus"] = "receiving";
    if (flowFilter.value === "submitted") params["flowStatus"] = "task_assignment";
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

function openCreate(): void {
  Object.assign(form, EMPTY_BODY);
  mode.value = { kind: "create" };
}
function openEdit(r: SampleReceipt): void {
  Object.assign(form, {
    commissionCode: r.commissionCode,
    commissionDate: r.commissionDate,
    projectName: r.projectName ?? "",
    clientUnit: r.clientUnit ?? "",
    testCategory: r.testCategory,
    sampleSource: r.sampleSource,
    categoryCode: r.categoryCode,
  });
  mode.value = { kind: "edit", id: r.id };
}

async function handleSubmit(): Promise<void> {
  if (!editing.value) return;
  const r = editing.value;
  mode.value = { kind: "idle" };
  try {
    await axios.put(`${API_ROUTES["/receipts"]}/${r.id}`, form);
    await load();
  } catch (e) {
    alertError((e as Error).message);
  }
}

async function handleCreate(): Promise<void> {
  mode.value = { kind: "idle" };
  try {
    await axios.post(API_ROUTES["/receipts"], {
      ...form,
      contractId: "placeholder-contract",
      receivedBy: "current-user",
    });
    await load();
  } catch (e) {
    alertError((e as Error).message);
  }
}

async function handleSubmitReceipt(id: string): Promise<void> {
  submitting.value = id;
  try {
    const res = await axios.post<{ results: Array<{ ok: boolean; message?: string }> }>(
      API_ROUTES["/receipts/flow"],
      { ids: [id], action: "submit", operator: "current-user" },
    );
    const r = res.data?.results?.[0];
    if (r?.ok) {
      await load();
    } else {
      alertError(r?.message ?? "提交失败");
    }
  } catch (e) {
    alertError((e as Error).message);
  } finally {
    submitting.value = null;
  }
}

async function handleDeleteConfirm(): Promise<void> {
  const t = deleteTarget.value;
  if (!t) return;
  deleteTarget.value = null;
  try {
    await axios.delete(`${API_ROUTES["/receipts"]}/${t.id}`);
    await load();
  } catch (e) {
    alertError((e as Error).message);
  }
}

function alertError(msg: string): void {
  // 模板作用域不识别 window.alert；用代理函数
  if (typeof globalThis.alert === "function") globalThis.alert(msg);
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <!-- @entry M03.F01.I01 接样管理列表页 -->
        <h1 class="text-2xl font-semibold">接样管理</h1>
        <p class="text-sm text-slate-500">M03.F01 接样单 CRUD 与提交</p>
      </div>
      <!-- @entry M03.F01.I02 新建接样按钮 -->
      <button
        @click="openCreate"
        data-fn="M03.F01.I02"
        class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
      >
        新建接样
      </button>
    </div>

    <div class="mb-4 flex gap-2">
      <select
        v-model="flowFilter"
        class="border rounded h-9 px-2 text-sm bg-white"
      >
        <option value="">全部状态</option>
        <option value="receiving">接样中</option>
        <option value="submitted">已提交</option>
      </select>
      <input
        v-model="keyword"
        placeholder="按委托书编号搜索"
        class="border rounded h-9 px-2 text-sm bg-white max-w-sm"
        @keyup.enter="load()"
      />
      <button class="border rounded h-9 px-3 text-sm" @click="load()">搜索</button>
    </div>

    <div class="bg-white rounded shadow">
      <div class="flex items-center justify-between px-4 py-2 border-b">
        <h3 class="text-base font-semibold">接样列表（{{ total || "…" }}）</h3>
        <span v-if="loading" class="text-xs text-slate-400">加载中…</span>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-4 py-2 text-left">委托书编号</th>
            <th class="px-4 py-2 text-left">工程名称</th>
            <th class="px-4 py-2 text-left">委托单位</th>
            <th class="px-4 py-2 text-left">检测类别</th>
            <th class="px-4 py-2 text-left">流程状态</th>
            <th class="px-4 py-2 text-left">创建时间</th>
            <th class="px-4 py-2 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="items.length === 0 && !loading">
            <td colspan="7" class="px-4 py-8 text-center text-slate-400">（无数据）</td>
          </tr>
          <tr
            v-for="r in items"
            :key="r.id"
            data-fn="M03.F01.I01"
            class="border-t hover:bg-slate-50"
          >
            <td class="px-4 py-2 font-mono text-xs">
              <router-link :to="`/receipts/${r.id}`" class="text-blue-600 hover:underline">
                {{ r.commissionCode }}
              </router-link>
            </td>
            <td class="px-4 py-2">{{ r.projectName ?? "—" }}</td>
            <td class="px-4 py-2">{{ r.clientUnit ?? "—" }}</td>
            <td class="px-4 py-2">{{ r.testCategory }}</td>
            <td class="px-4 py-2">
              <span
                class="inline-block rounded px-2 py-0.5 text-xs"
                :class="{
                  'bg-blue-100 text-blue-700': r.flowStatus === 'receiving',
                  'bg-green-100 text-green-700': r.flowStatus === 'completed',
                  'bg-slate-200 text-slate-600':
                    r.flowStatus !== 'receiving' && r.flowStatus !== 'completed',
                }"
              >
                {{ FLOW_STAGE_LABELS[r.flowStatus] ?? r.flowStatus }}
              </span>
            </td>
            <td class="px-4 py-2 text-xs text-slate-500">
              {{ (r.createdAt ?? "").slice(0, 10) }}
            </td>
            <td class="px-4 py-2 text-right space-x-1">
              <button
                v-if="r.flowStatus === 'receiving'"
                class="border rounded px-2 py-0.5 text-xs"
                :disabled="submitting === r.id"
                data-fn="M03.F01.I04"
                @click="handleSubmitReceipt(r.id)"
              >
                提交
              </button>
              <button
                class="border rounded px-2 py-0.5 text-xs"
                @click="openEdit(r)"
              >
                编辑
              </button>
              <button
                v-if="r.flowStatus === 'receiving'"
                class="border rounded px-2 py-0.5 text-xs text-red-600 hover:text-red-700"
                data-fn="M03.F01.I03"
                @click="deleteTarget = r"
              >
                删除
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 新建 Dialog -->
    <Teleport to="body">
      <div
        v-if="mode.kind === 'create'"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="mode = { kind: 'idle' }"
      >
        <div class="bg-white rounded shadow-xl sm:max-w-xl w-full p-6">
          <h2 class="text-lg font-semibold">新建接样</h2>
          <p class="text-sm text-slate-500 mb-3">录入委托书基础信息（带 * 字段必填）。</p>
          <div class="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            <label class="text-xs">委托书编号 *<input v-model="form.commissionCode" class="border rounded h-9 px-2 text-sm w-full mt-1" /></label>
            <label class="text-xs">委托日期 *<input v-model="form.commissionDate" type="date" class="border rounded h-9 px-2 text-sm w-full mt-1" /></label>
            <label class="text-xs">工程名称 *<input v-model="form.projectName" class="border rounded h-9 px-2 text-sm w-full mt-1" /></label>
            <label class="text-xs">委托单位 *<input v-model="form.clientUnit" class="border rounded h-9 px-2 text-sm w-full mt-1" /></label>
            <label class="text-xs">检测类别 *
              <select v-model="form.testCategory" class="border rounded h-9 px-2 text-sm w-full mt-1 bg-white">
                <option value="委托检验">委托检验</option>
                <option value="监督检验">监督检验</option>
                <option value="仲裁检验">仲裁检验</option>
              </select>
            </label>
            <label class="text-xs">样品来源 *
              <select v-model="form.sampleSource" class="border rounded h-9 px-2 text-sm w-full mt-1 bg-white">
                <option value="施工送检">施工送检</option>
                <option value="监督抽检">监督抽检</option>
                <option value="委托送样">委托送样</option>
              </select>
            </label>
            <label class="text-xs">报告类别编码 *<input v-model="form.categoryCode" class="border rounded h-9 px-2 text-sm w-full mt-1" /></label>
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <button class="px-4 py-2 text-sm" @click="mode = { kind: 'idle' }">取消</button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded text-sm" @click="handleCreate()">保存</button>
          </div>
        </div>
      </div>

      <div
        v-if="mode.kind === 'edit'"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="mode = { kind: 'idle' }"
      >
        <div class="bg-white rounded shadow-xl sm:max-w-xl w-full p-6">
          <h2 class="text-lg font-semibold">编辑接样 — {{ editing?.commissionCode }}</h2>
          <p class="text-sm text-slate-500 mb-3">修改接样字段后保存。</p>
          <div class="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
            <label class="text-xs">委托书编号 *<input v-model="form.commissionCode" class="border rounded h-9 px-2 text-sm w-full mt-1" /></label>
            <label class="text-xs">委托日期 *<input v-model="form.commissionDate" type="date" class="border rounded h-9 px-2 text-sm w-full mt-1" /></label>
            <label class="text-xs">工程名称 *<input v-model="form.projectName" class="border rounded h-9 px-2 text-sm w-full mt-1" /></label>
            <label class="text-xs">委托单位 *<input v-model="form.clientUnit" class="border rounded h-9 px-2 text-sm w-full mt-1" /></label>
            <label class="text-xs">检测类别 *
              <select v-model="form.testCategory" class="border rounded h-9 px-2 text-sm w-full mt-1 bg-white">
                <option value="委托检验">委托检验</option>
                <option value="监督检验">监督检验</option>
                <option value="仲裁检验">仲裁检验</option>
              </select>
            </label>
            <label class="text-xs">样品来源 *
              <select v-model="form.sampleSource" class="border rounded h-9 px-2 text-sm w-full mt-1 bg-white">
                <option value="施工送检">施工送检</option>
                <option value="监督抽检">监督抽检</option>
                <option value="委托送样">委托送样</option>
              </select>
            </label>
            <label class="text-xs">报告类别编码 *<input v-model="form.categoryCode" class="border rounded h-9 px-2 text-sm w-full mt-1" /></label>
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <button class="px-4 py-2 text-sm" @click="mode = { kind: 'idle' }">取消</button>
            <button class="px-4 py-2 bg-blue-600 text-white rounded text-sm" @click="handleSubmit()">保存</button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmDialog
      :open="deleteTarget !== null"
      title="删除接样"
      :message="deleteTarget ? `确认删除接样单 ${deleteTarget.commissionCode}？其下样品与检测记录将一并删除。` : ''"
      @confirm="handleDeleteConfirm()"
      @cancel="deleteTarget = null"
    />
  </div>
</template>