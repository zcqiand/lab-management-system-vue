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
import SelectContent from "@/components/ui/SelectContent.vue";
import SelectItem from "@/components/ui/SelectItem.vue";
import SelectTrigger from "@/components/ui/SelectTrigger.vue";
import SelectValue from "@/components/ui/SelectValue.vue";
import Table from "@/components/ui/Table.vue";
import TableBody from "@/components/ui/TableBody.vue";
import TableCell from "@/components/ui/TableCell.vue";
import TableHead from "@/components/ui/TableHead.vue";
import TableHeader from "@/components/ui/TableHeader.vue";
import TableRow from "@/components/ui/TableRow.vue";
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
type FlowFilter = "__all__" | "receiving" | "submitted";

type ReceiptBody = {
  commissionCode: string;
  commissionDate: string;
  projectName: string;
  clientUnit: string;
  testCategory: string;
  sampleSource: string;
  categoryCode: string;
};

// 两个弹窗（新建 / 编辑）共用的下拉选项，避免 6 处字面量各自漂移。
const TEST_CATEGORIES = ["委托检验", "监督检验", "仲裁检验"] as const;
const SAMPLE_SOURCES = ["施工送检", "监督抽检", "委托送样"] as const;

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
// flowFilter "__all__" 是 reka-ui 替代 raw <select value=""> 的 sentinel（reka-ui
// SelectItem 不允许 value=""，保留给 placeholder）；load() 只认 receiving /
// submitted，所以 "__all__" 天然翻译成「不下发 flowStatus」。
const flowFilter = ref<FlowFilter>("__all__");
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
      <Button
        variant="default"
        class="bg-blue-600 hover:bg-blue-700"
        data-fn="M03.F01.I02"
        @click="openCreate"
      >
        新建接样
      </Button>
    </div>

    <div class="mb-4 flex gap-2">
      <Select v-model="flowFilter">
        <SelectTrigger aria-label="流程状态筛选" class="w-40">
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">全部状态</SelectItem>
          <SelectItem value="receiving">接样中</SelectItem>
          <SelectItem value="submitted">已提交</SelectItem>
        </SelectContent>
      </Select>
      <Input
        v-model="keyword"
        placeholder="按委托书编号搜索"
        class="max-w-sm"
        @keyup.enter="load()"
      />
      <Button variant="outline" size="sm" @click="load()">搜索</Button>
    </div>

    <div class="bg-white rounded shadow">
      <div class="flex items-center justify-between px-4 py-2 border-b">
        <h3 class="text-base font-semibold">接样列表（{{ total || "…" }}）</h3>
        <span v-if="loading" class="text-xs text-slate-400">加载中…</span>
      </div>
      <Table class="w-full text-sm">
        <TableHeader class="bg-slate-50 text-xs uppercase text-slate-500">
          <TableRow>
            <TableHead class="px-4 py-2 text-left">委托书编号</TableHead>
            <TableHead class="px-4 py-2 text-left">工程名称</TableHead>
            <TableHead class="px-4 py-2 text-left">委托单位</TableHead>
            <TableHead class="px-4 py-2 text-left">检测类别</TableHead>
            <TableHead class="px-4 py-2 text-left">流程状态</TableHead>
            <TableHead class="px-4 py-2 text-left">创建时间</TableHead>
            <TableHead class="px-4 py-2 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="items.length === 0 && !loading">
            <TableCell colspan="7" class="px-4 py-8 text-center text-slate-400">（无数据）</TableCell>
          </TableRow>
          <TableRow
            v-for="r in items"
            :key="r.id"
            data-fn="M03.F01.I01"
            class="border-t hover:bg-slate-50"
          >
            <TableCell class="px-4 py-2 font-mono text-xs">
              <router-link :to="`/receipts/${r.id}`" class="text-blue-600 hover:underline">
                {{ r.commissionCode }}
              </router-link>
            </TableCell>
            <TableCell class="px-4 py-2">{{ r.projectName ?? "—" }}</TableCell>
            <TableCell class="px-4 py-2">{{ r.clientUnit ?? "—" }}</TableCell>
            <TableCell class="px-4 py-2">{{ r.testCategory }}</TableCell>
            <TableCell class="px-4 py-2">
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
            </TableCell>
            <TableCell class="px-4 py-2 text-xs text-slate-500">
              {{ (r.createdAt ?? "").slice(0, 10) }}
            </TableCell>
            <TableCell class="px-4 py-2 text-right space-x-1">
              <Button
                v-if="r.flowStatus === 'receiving'"
                size="sm"
                variant="outline"
                :disabled="submitting === r.id"
                data-fn="M03.F01.I04"
                @click="handleSubmitReceipt(r.id)"
              >
                提交
              </Button>
              <Button
                size="sm"
                variant="outline"
                @click="openEdit(r)"
              >
                编辑
              </Button>
              <Button
                v-if="r.flowStatus === 'receiving'"
                variant="link"
                class="text-destructive hover:underline"
                data-fn="M03.F01.I03"
                @click="deleteTarget = r"
              >
                删除
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <!-- 新建 Dialog -->
    <Dialog
      :open="mode.kind === 'create'"
      @update:open="
        (v: boolean) => {
          if (!v) mode = { kind: 'idle' };
        }
      "
    >
      <DialogContent class="sm:max-w-xl gap-0 p-6">
        <DialogHeader class="gap-1.5 mb-3">
          <DialogTitle>新建接样</DialogTitle>
          <DialogDescription>录入委托书基础信息（带 * 字段必填）。</DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          <div>
            <Label for="receipt-create-code" class="text-xs">委托书编号 *</Label>
            <Input id="receipt-create-code" v-model="form.commissionCode" class="w-full mt-1" />
          </div>
          <div>
            <Label for="receipt-create-date" class="text-xs">委托日期 *</Label>
            <Input
              id="receipt-create-date"
              v-model="form.commissionDate"
              type="date"
              class="w-full mt-1"
            />
          </div>
          <div>
            <Label for="receipt-create-project" class="text-xs">工程名称 *</Label>
            <Input id="receipt-create-project" v-model="form.projectName" class="w-full mt-1" />
          </div>
          <div>
            <Label for="receipt-create-client" class="text-xs">委托单位 *</Label>
            <Input id="receipt-create-client" v-model="form.clientUnit" class="w-full mt-1" />
          </div>
          <div>
            <Label for="receipt-create-category" class="text-xs">检测类别 *</Label>
            <Select v-model="form.testCategory">
              <SelectTrigger
                id="receipt-create-category"
                aria-label="检测类别"
                class="w-full mt-1"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="c in TEST_CATEGORIES" :key="c" :value="c">{{ c }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="receipt-create-source" class="text-xs">样品来源 *</Label>
            <Select v-model="form.sampleSource">
              <SelectTrigger id="receipt-create-source" aria-label="样品来源" class="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="s in SAMPLE_SOURCES" :key="s" :value="s">{{ s }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="receipt-create-report-code" class="text-xs">报告类别编码 *</Label>
            <Input
              id="receipt-create-report-code"
              v-model="form.categoryCode"
              class="w-full mt-1"
            />
          </div>
        </div>
        <DialogFooter class="mt-4 gap-2">
          <Button variant="outline" @click="mode = { kind: 'idle' }">取消</Button>
          <Button variant="default" class="bg-blue-600 hover:bg-blue-700" @click="handleCreate()">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- 编辑 Dialog -->
    <Dialog
      :open="mode.kind === 'edit'"
      @update:open="
        (v: boolean) => {
          if (!v) mode = { kind: 'idle' };
        }
      "
    >
      <DialogContent class="sm:max-w-xl gap-0 p-6">
        <DialogHeader class="gap-1.5 mb-3">
          <DialogTitle>编辑接样 — {{ editing?.commissionCode ?? "" }}</DialogTitle>
          <DialogDescription>修改接样字段后保存。</DialogDescription>
        </DialogHeader>
        <div class="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto">
          <div>
            <Label for="receipt-edit-code" class="text-xs">委托书编号 *</Label>
            <Input id="receipt-edit-code" v-model="form.commissionCode" class="w-full mt-1" />
          </div>
          <div>
            <Label for="receipt-edit-date" class="text-xs">委托日期 *</Label>
            <Input
              id="receipt-edit-date"
              v-model="form.commissionDate"
              type="date"
              class="w-full mt-1"
            />
          </div>
          <div>
            <Label for="receipt-edit-project" class="text-xs">工程名称 *</Label>
            <Input id="receipt-edit-project" v-model="form.projectName" class="w-full mt-1" />
          </div>
          <div>
            <Label for="receipt-edit-client" class="text-xs">委托单位 *</Label>
            <Input id="receipt-edit-client" v-model="form.clientUnit" class="w-full mt-1" />
          </div>
          <div>
            <Label for="receipt-edit-category" class="text-xs">检测类别 *</Label>
            <Select v-model="form.testCategory">
              <SelectTrigger id="receipt-edit-category" aria-label="检测类别" class="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="c in TEST_CATEGORIES" :key="c" :value="c">{{ c }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="receipt-edit-source" class="text-xs">样品来源 *</Label>
            <Select v-model="form.sampleSource">
              <SelectTrigger id="receipt-edit-source" aria-label="样品来源" class="w-full mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="s in SAMPLE_SOURCES" :key="s" :value="s">{{ s }}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label for="receipt-edit-report-code" class="text-xs">报告类别编码 *</Label>
            <Input id="receipt-edit-report-code" v-model="form.categoryCode" class="w-full mt-1" />
          </div>
        </div>
        <DialogFooter class="mt-4 gap-2">
          <Button variant="outline" @click="mode = { kind: 'idle' }">取消</Button>
          <Button variant="default" class="bg-blue-600 hover:bg-blue-700" @click="handleSubmit()">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      :open="deleteTarget !== null"
      title="删除接样"
      :message="deleteTarget ? `确认删除接样单 ${deleteTarget.commissionCode}？其下样品与检测记录将一并删除。` : ''"
      @confirm="handleDeleteConfirm()"
      @cancel="deleteTarget = null"
    />
  </div>
</template>