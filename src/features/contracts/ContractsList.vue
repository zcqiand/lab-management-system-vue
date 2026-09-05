<script setup lang="ts">
// M02.F01 合同管理 — 列表 + Dialog 弹窗（新建/编辑）+ 行内删除
//
// 镜像 react 仓 src/features/contracts/ContractsList.tsx（vue 翻译规则 4 条）：
//   1. JSX → template；className → class
//   2. useState → ref / useEffect → onMounted/watch
//   3. 数据获取走全局 axios（http-client.ts 已装 baseUrl + Bearer 拦截器）
//   4. 弹窗 ConfirmModal → ConfirmDialog（Teleport to body，1:1 API）
//
// 功能 ID：
//   M02.F01.I01 列表（行 data-fn）
//   M02.F01.I02 新建/编辑（按钮 data-fn + @entry）
//   M02.F01.I03 删除（按钮 data-fn）
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
import TableBody from "@/components/ui/TableBody.vue";
import TableCell from "@/components/ui/TableCell.vue";
import TableHead from "@/components/ui/TableHead.vue";
import TableHeader from "@/components/ui/TableHeader.vue";
import TableRow from "@/components/ui/TableRow.vue";
import ConfirmDialog from "@/components/app/ConfirmDialog.vue";

// 内联类型（vue 仓无 src/types/ 目录；镜像 react/src/types/resources/contract.ts）
export type ContractStatus = "active" | "archived";
interface Contract {
  id: string;
  contractCode: string;
  clientUnit: string;
  projectName: string;
  projectLocation?: string;
  constructionUnit: string;
  inspectionSpecialtyCode?: string;
  buildingUnit?: string;
  supervisorUnit?: string;
  inspectionPerson?: string;
  inspectionPhone?: string;
  witnessUnit: string;
  witness: string;
  witnessPhone?: string;
  contactPerson?: string;
  contactPhone?: string;
  entrustedDate?: string;
  status: ContractStatus;
  createdAt: string;
  updatedAt: string;
}

type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; id: string };

type ContractBody = Omit<Contract, "id" | "createdAt" | "updatedAt">;

const EMPTY_BODY: ContractBody = {
  contractCode: "",
  clientUnit: "",
  projectName: "",
  constructionUnit: "",
  witnessUnit: "",
  witness: "",
  status: "active",
};

const items = ref<Contract[]>([]);
const total = ref(0);
// status "__all__" 是 reka-ui 替代 raw <select value=""> 的 sentinel（reka-ui
// SelectItem 不允许 value=""，保留给 placeholder；"__all__" 在 load() 里
// 翻译回空串才不下发给 API）
const status = ref("__all__");
const keyword = ref("");
const mode = ref<Mode>({ kind: "idle" });
const loading = ref(false);
const deleteTarget = ref<Contract | null>(null);
const form = reactive<ContractBody>({ ...EMPTY_BODY });

const editing = computed<Contract | null>(() => {
  if (mode.value.kind !== "edit") return null;
  const id = (mode.value as { kind: "edit"; id: string }).id;
  return items.value.find((c) => c.id === id) ?? null;
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    // status.value === "__all__" 是 reka-ui 替代 raw <select value=""> 的 sentinel；
    // 空字符串 SelectItem 在 reka-ui 是禁用值（保留给 placeholder），所以走 __all__。
    const apiStatus = status.value === "__all__" ? "" : status.value;
    const res = await axios.get<{ items: Contract[]; total: number }>(API_ROUTES["/contracts"], {
      params: {
        ...(apiStatus ? { status: apiStatus } : {}),
        ...(keyword.value ? { keyword: keyword.value } : {}),
        page: 1,
        pageSize: 50,
      },
    });
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
function openEdit(c: Contract): void {
  Object.assign(form, {
    contractCode: c.contractCode,
    clientUnit: c.clientUnit,
    projectName: c.projectName,
    projectLocation: c.projectLocation,
    constructionUnit: c.constructionUnit,
    inspectionSpecialtyCode: c.inspectionSpecialtyCode,
    buildingUnit: c.buildingUnit,
    supervisorUnit: c.supervisorUnit,
    inspectionPerson: c.inspectionPerson,
    inspectionPhone: c.inspectionPhone,
    witnessUnit: c.witnessUnit,
    witness: c.witness,
    witnessPhone: c.witnessPhone,
    contactPerson: c.contactPerson,
    contactPhone: c.contactPhone,
    entrustedDate: c.entrustedDate,
    status: c.status,
  });
  mode.value = { kind: "edit", id: c.id };
}
function closeDialog(): void {
  mode.value = { kind: "idle" };
}
function statusBadgeClass(s: ContractStatus): string {
  return s === "active"
    ? "inline-block rounded bg-success/10 px-2 py-0.5 text-xs text-success"
    : "inline-block rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground";
}

// 暴露给 template 的告警通道（vue 模板表达式作用域不识别 window/globalThis）
function alertError(msg: string): void {
  // eslint-disable-next-line no-alert
  globalThis.alert(msg);
}

async function submitForm(): Promise<void> {
  try {
    if (mode.value.kind === "create") {
      await axios.post(API_ROUTES["/contracts"], { ...form });
    } else if (mode.value.kind === "edit") {
      const id = (mode.value as { kind: "edit"; id: string }).id;
      await axios.put(`${API_ROUTES["/contracts"]}/${id}`, { ...form });
    }
    closeDialog();
    await load();
  } catch (e) {
    alertError((e as Error).message);
  }
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">合同管理</h1>
        <p class="text-sm text-muted-foreground">
          M02.F01 合同 CRUD 与工程信息维护（数据来自 lab-msw fixtures）
        </p>
      </div>
      <!-- @entry M02.F01.I02 新建合同按钮 -->
      <Button data-fn="M02.F01.I02" @click="openCreate"> 新建合同 </Button>
    </div>

    <div class="mb-4 flex gap-2">
      <Select v-model="status">
        <SelectTrigger class="border rounded h-9 px-2 text-sm bg-white">
          <SelectValue placeholder="全部状态" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">全部状态</SelectItem>
          <SelectItem value="active">在用</SelectItem>
          <SelectItem value="archived">已归档</SelectItem>
        </SelectContent>
      </Select>
      <Input
        v-model="keyword"
        class="max-w-sm"
        placeholder="按合同编号 / 项目名称搜索"
        @keydown.enter="load"
      />
      <Button variant="outline" @click="load"> 搜索 </Button>
    </div>

    <Dialog
      :open="mode.kind === 'create' || mode.kind === 'edit'"
      @update:open="
        (v: boolean) => {
          if (!v) closeDialog();
        }
      "
    >
      <DialogContent class="max-w-2xl gap-0 p-0">
        <DialogHeader class="px-6 py-4 border-b">
          <DialogTitle>
            {{ mode.kind === "create" ? "新建合同" : `编辑合同 ${editing?.contractCode ?? ""}` }}
          </DialogTitle>
          <DialogDescription>
            {{
              mode.kind === "create"
                ? "创建一条合同记录（带 * 字段必填）。"
                : "修改合同字段后保存。"
            }}
          </DialogDescription>
        </DialogHeader>
        <div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label>合同编号 *</Label>
              <Input v-model="form.contractCode" />
            </div>
            <div>
              <Label>委托单位 *</Label>
              <Input v-model="form.clientUnit" />
            </div>
            <div>
              <Label>项目名称 *</Label>
              <Input v-model="form.projectName" />
            </div>
            <div>
              <Label>项目地点</Label>
              <Input v-model="form.projectLocation" />
            </div>
            <div>
              <Label>施工单位 *</Label>
              <Input v-model="form.constructionUnit" />
            </div>
            <div>
              <Label>检测专项</Label>
              <Input v-model="form.inspectionSpecialtyCode" />
            </div>
            <div>
              <Label>建设单位</Label>
              <Input v-model="form.buildingUnit" />
            </div>
            <div>
              <Label>监理单位</Label>
              <Input v-model="form.supervisorUnit" />
            </div>
            <div>
              <Label>检测人</Label>
              <Input v-model="form.inspectionPerson" />
            </div>
            <div>
              <Label>检测人电话</Label>
              <Input v-model="form.inspectionPhone" />
            </div>
            <div>
              <Label>见证单位 *</Label>
              <Input v-model="form.witnessUnit" />
            </div>
            <div>
              <Label>见证人 *</Label>
              <Input v-model="form.witness" />
            </div>
            <div>
              <Label>见证人电话</Label>
              <Input v-model="form.witnessPhone" />
            </div>
            <div>
              <Label>联系人</Label>
              <Input v-model="form.contactPerson" />
            </div>
            <div>
              <Label>联系人电话</Label>
              <Input v-model="form.contactPhone" />
            </div>
            <div>
              <Label>委托日期 (YYYY-MM-DD)</Label>
              <Input v-model="form.entrustedDate" />
            </div>
            <div>
              <Label>状态</Label>
              <Select v-model="form.status">
                <SelectTrigger class="border rounded h-9 px-2 text-sm bg-white w-full">
                  <SelectValue placeholder="请选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">在用</SelectItem>
                  <SelectItem value="archived">已归档</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <DialogFooter class="px-6 py-3 justify-end border-t">
          <!-- @entry M02.F01.I02 表单内保存 -->
          <Button data-fn="M02.F01.I02" @click="submitForm">
            {{ mode.kind === "create" ? "创建" : "保存" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      :open="deleteTarget !== null"
      title="删除合同"
      :message="deleteTarget ? `确认删除合同 ${deleteTarget.contractCode}？此操作不可撤销。` : ''"
      @confirm="
        async () => {
          if (!deleteTarget) return;
          const t = deleteTarget;
          deleteTarget = null;
          try {
            await axios.delete(`${API_ROUTES['/contracts']}/${t.id}`);
            await load();
          } catch (e) {
            alertError((e as Error).message);
          }
        }
      "
      @cancel="deleteTarget = null"
    />

    <div class="mt-4 bg-white rounded-xl border shadow-sm">
      <div class="flex flex-row items-center justify-between px-6 py-4 border-b">
        <div class="font-semibold text-base">合同列表（{{ total || "…" }}）</div>
        <div v-if="loading" class="text-xs text-muted-foreground">加载中…</div>
      </div>
      <Table class="w-full text-sm">
        <TableHeader class="bg-muted text-xs uppercase text-muted-foreground">
          <TableRow>
            <TableHead class="px-4 py-2 text-left">合同编号</TableHead>
            <TableHead class="px-4 py-2 text-left">项目名称</TableHead>
            <TableHead class="px-4 py-2 text-left">委托单位</TableHead>
            <TableHead class="px-4 py-2 text-left">见证人</TableHead>
            <TableHead class="px-4 py-2 text-left">状态</TableHead>
            <TableHead class="px-4 py-2 text-left">委托日期</TableHead>
            <TableHead class="px-4 py-2 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="items.length === 0 && !loading">
            <TableCell colspan="7" class="px-4 py-8 text-center text-muted-foreground">
              （无数据）
            </TableCell>
          </TableRow>
          <TableRow
            v-for="c in items"
            :key="c.id"
            data-fn="M02.F01.I01"
            class="border-t hover:bg-muted"
          >
            <TableCell class="px-4 py-2 font-mono text-xs">{{ c.contractCode }}</TableCell>
            <TableCell class="px-4 py-2">{{ c.projectName }}</TableCell>
            <TableCell class="px-4 py-2">{{ c.clientUnit }}</TableCell>
            <TableCell class="px-4 py-2">{{ c.witness }}</TableCell>
            <TableCell class="px-4 py-2">
              <span :class="statusBadgeClass(c.status)">
                {{ c.status === "active" ? "在用" : "已归档" }}
              </span>
            </TableCell>
            <TableCell class="px-4 py-2 text-xs text-muted-foreground">
              {{ c.entrustedDate ?? "—" }}
            </TableCell>
            <TableCell class="px-4 py-2 text-right">
              <Button size="sm" variant="outline" @click="openEdit(c)"> 编辑 </Button>
              <Button
                variant="link"
                class="ml-2 text-destructive hover:underline"
                data-fn="M02.F01.I03"
                @click="deleteTarget = c"
              >
                删除
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  </div>
</template>
