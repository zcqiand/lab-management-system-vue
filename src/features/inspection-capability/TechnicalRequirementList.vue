<script setup lang="ts">
// M06.F06 技术要求维护 — 列表 + 4 维筛选 + Dialog 弹窗（镜像 react 仓）。
//
// 复合主键：(object, parameter, judgmentStandard)；
// 多维筛选：brand / model / grade / spec — 客户端二次过滤。
import { onMounted, reactive, ref, watch } from "vue";
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
import ConfirmDialog from "@/components/app/ConfirmDialog.vue";
import Select from "@/components/ui/Select.vue";
import SelectContent from "@/components/ui/SelectContent.vue";
import SelectItem from "@/components/ui/SelectItem.vue";
import SelectTrigger from "@/components/ui/SelectTrigger.vue";
import SelectValue from "@/components/ui/SelectValue.vue";

// @entry M06.F06.I01
// @entry M06.F06.I02
// @entry M06.F06.I03
interface TechReq {
  id: string;
  inspectionObjectCode: string;
  inspectionParameterCode: string;
  judgmentStandardCode: string;
  brand?: string;
  model?: string;
  grade?: string;
  spec?: string;
  minValue?: number;
  maxValue?: number;
  comparison: string;
  remark?: string;
  objectName?: string;
  parameterName?: string;
}

interface Opt { code: string; name: string }

const COMPARISONS = ["≥", "≤", "=", "range", "eq"];
const COMPARISON_LABEL: Record<string, string> = {
  "≥": "≥", "≤": "≤", "=": "=", range: "区间", eq: "等于",
};

const EMPTY_FORM: Record<string, string> = {
  inspectionObjectCode: "",
  inspectionParameterCode: "",
  judgmentStandardCode: "",
  brand: "",
  model: "",
  grade: "",
  spec: "",
  minValue: "",
  maxValue: "",
  comparison: "≥",
  remark: "",
};

const items = ref<TechReq[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const objects = ref<Opt[]>([]);
const parameters = ref<Opt[]>([]);

const brandFilter = ref("");
const modelFilter = ref("");
const gradeFilter = ref("");
const specFilter = ref("");

type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; item: TechReq };
const mode = ref<Mode>({ kind: "idle" });
const form = reactive<Record<string, string>>({ ...EMPTY_FORM });
const saveError = ref<string | null>(null);
const deleteTarget = ref<TechReq | null>(null);
const deleteError = ref<string | null>(null);
const deleting = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const res = await axios.get<{ items: TechReq[]; total: number }>(
      API_ROUTES["/inspection-technical-requirements"],
      { params: { page: 1, pageSize: 500 } },
    );
    const all = Array.isArray(res.data?.items) ? res.data.items : [];
    items.value = all.filter((it) => {
      if (brandFilter.value && (it.brand ?? "") !== brandFilter.value) return false;
      if (modelFilter.value && (it.model ?? "") !== modelFilter.value) return false;
      if (gradeFilter.value && (it.grade ?? "") !== gradeFilter.value) return false;
      if (specFilter.value && (it.spec ?? "") !== specFilter.value) return false;
      return true;
    });
  } catch (e) {
    error.value = e instanceof Error ? e.message : "加载失败";
    items.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadOptions(): Promise<void> {
  const [oRes, pRes] = await Promise.all([
    axios.get<{ items: Opt[] }>(API_ROUTES["/inspection-objects"], { params: { page: 1, pageSize: 500 } }).catch(() => ({ data: { items: [] } })),
    axios.get<{ items: Opt[] }>(API_ROUTES["/inspection-parameters"], { params: { page: 1, pageSize: 500 } }).catch(() => ({ data: { items: [] } })),
  ]);
  objects.value = Array.isArray(oRes.data?.items) ? oRes.data.items : [];
  parameters.value = Array.isArray(pRes.data?.items) ? pRes.data.items : [];
}

onMounted(async () => {
  await Promise.all([load(), loadOptions()]);
});

watch(
  () => [brandFilter.value, modelFilter.value, gradeFilter.value, specFilter.value] as const,
  () => { void load(); },
);

function openCreate(): void {
  Object.assign(form, EMPTY_FORM);
  saveError.value = null;
  mode.value = { kind: "create" };
}
function openEdit(row: TechReq): void {
  Object.assign(form, {
    inspectionObjectCode: row.inspectionObjectCode,
    inspectionParameterCode: row.inspectionParameterCode,
    judgmentStandardCode: row.judgmentStandardCode,
    brand: row.brand ?? "",
    model: row.model ?? "",
    grade: row.grade ?? "",
    spec: row.spec ?? "",
    minValue: row.minValue != null ? String(row.minValue) : "",
    maxValue: row.maxValue != null ? String(row.maxValue) : "",
    comparison: row.comparison ?? "≥",
    remark: row.remark ?? "",
  });
  saveError.value = null;
  mode.value = { kind: "edit", item: row };
}
function closeDialog(): void {
  mode.value = { kind: "idle" };
}

async function submitForm(): Promise<void> {
  saveError.value = null;
  // __none__ 是 reka-ui SelectItem 替代 raw <option value=""> 的 sentinel，
  // 翻译回空串让后端按缺失处理
  const objVal = form.inspectionObjectCode;
  const paramVal = form.inspectionParameterCode;
  const payload = {
    inspectionObjectCode: objVal && objVal !== "__none__" ? objVal : "",
    inspectionParameterCode: paramVal && paramVal !== "__none__" ? paramVal : "",
    judgmentStandardCode: form.judgmentStandardCode,
    brand: form.brand || undefined,
    model: form.model || undefined,
    grade: form.grade || undefined,
    spec: form.spec || undefined,
    minValue: form.minValue === "" ? undefined : Number(form.minValue),
    maxValue: form.maxValue === "" ? undefined : Number(form.maxValue),
    comparison: form.comparison,
    remark: form.remark || undefined,
  };
  try {
    if (mode.value.kind === "create") {
      await axios.post(API_ROUTES["/inspection-technical-requirements"], payload);
    } else if (mode.value.kind === "edit") {
      const id = mode.value.item.id;
      await axios.put(`${API_ROUTES["/inspection-technical-requirements"]}/${id}`, payload);
    }
    closeDialog();
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "保存失败";
    saveError.value = msg;
  }
}

function startDelete(row: TechReq): void {
  deleteTarget.value = row;
  deleteError.value = null;
}
async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return;
  deleting.value = true;
  deleteError.value = null;
  try {
    await axios.delete(`${API_ROUTES["/inspection-technical-requirements"]}/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "删除失败";
    deleteError.value = msg;
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <!-- @entry M06.F06.I01 技术要求列表 -->
  <div data-fn="M06.F06.I01" class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">技术要求维护</h1>
        <p class="text-sm text-slate-500">
          M06.F06 技术要求 — 四维度匹配：牌号 / 型号 / 等级 / 规格
        </p>
      </div>
      <Button data-fn="M06.F06.I02" @click="openCreate">
        新建技术要求
      </Button>
    </div>

    <div class="flex flex-wrap gap-2">
      <Input v-model="brandFilter" aria-label="牌号筛选" class="max-w-32" placeholder="牌号" />
      <Input v-model="modelFilter" aria-label="型号筛选" class="max-w-32" placeholder="型号" />
      <Input v-model="gradeFilter" aria-label="等级筛选" class="max-w-32" placeholder="等级" />
      <Input v-model="specFilter" aria-label="规格筛选" class="max-w-32" placeholder="规格" />
    </div>

    <div v-if="error" role="alert" class="text-sm text-red-600 bg-red-50 p-2 rounded">{{ error }}</div>

    <div v-if="!loading && items.length === 0" class="text-sm text-slate-400 text-center py-8">
      暂无技术要求
    </div>

    <Table v-else class="w-full text-sm bg-white rounded shadow overflow-hidden">
      <TableHeader class="bg-slate-50 text-slate-600">
        <TableRow>
          <TableHead class="px-4 py-2 text-left">检测项目</TableHead>
          <TableHead class="px-4 py-2 text-left">检测参数</TableHead>
          <TableHead class="px-4 py-2 text-left">判定标准</TableHead>
          <TableHead class="px-4 py-2 text-left">牌号</TableHead>
          <TableHead class="px-4 py-2 text-left">型号</TableHead>
          <TableHead class="px-4 py-2 text-left">等级</TableHead>
          <TableHead class="px-4 py-2 text-left">规格</TableHead>
          <TableHead class="px-4 py-2 text-left">判定方式</TableHead>
          <TableHead class="px-4 py-2 text-left">上限</TableHead>
          <TableHead class="px-4 py-2 text-left">下限</TableHead>
          <TableHead class="px-4 py-2 text-left w-32">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in items" :key="row.id" class="border-t hover:bg-slate-50">
          <TableCell class="px-4 py-2 font-mono text-xs">{{ row.inspectionObjectCode }}</TableCell>
          <TableCell class="px-4 py-2 font-mono text-xs">{{ row.inspectionParameterCode }}</TableCell>
          <TableCell class="px-4 py-2 font-mono text-xs">{{ row.judgmentStandardCode }}</TableCell>
          <TableCell class="px-4 py-2">{{ row.brand ?? "-" }}</TableCell>
          <TableCell class="px-4 py-2">{{ row.model ?? "-" }}</TableCell>
          <TableCell class="px-4 py-2">{{ row.grade ?? "-" }}</TableCell>
          <TableCell class="px-4 py-2">{{ row.spec ?? "-" }}</TableCell>
          <TableCell class="px-4 py-2">
            <span class="inline-flex items-center rounded border px-2 py-0.5 text-xs">{{ COMPARISON_LABEL[row.comparison] ?? row.comparison }}</span>
          </TableCell>
          <TableCell class="px-4 py-2">{{ row.maxValue ?? "-" }}</TableCell>
          <TableCell class="px-4 py-2">{{ row.minValue ?? "-" }}</TableCell>
          <TableCell class="px-4 py-2 text-xs whitespace-nowrap">
            <Button
              variant="link"
              class="text-primary hover:underline mr-3"
              data-fn="M06.F06.I02"
              :aria-label="`编辑 ${row.id}`"
              @click="openEdit(row)"
            >
              编辑
            </Button>
            <Button
              variant="link"
              class="text-destructive hover:underline"
              data-fn="M06.F06.I03"
              :aria-label="`删除 ${row.id}`"
              @click="startDelete(row)"
            >
              删除
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <div class="text-sm text-slate-500">共 {{ items.length }} 条</div>

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
            {{ mode.kind === "create" ? "新建技术要求" : "编辑技术要求" }}
          </DialogTitle>
          <DialogDescription>复合主键：检测项目 + 检测参数 + 判定标准</DialogDescription>
        </DialogHeader>
        <div class="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-3 text-sm">
          <div v-if="saveError" role="alert" class="text-red-600 bg-red-50 p-2 rounded">{{ saveError }}</div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label for="inspectionObjectCode">检测项目</Label>
              <Select v-model="form.inspectionObjectCode">
                <SelectTrigger id="inspectionObjectCode" class="w-full">
                  <SelectValue placeholder="未选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">未选择</SelectItem>
                  <SelectItem v-for="o in objects" :key="o.code" :value="o.code">
                    {{ o.code }} {{ o.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label for="inspectionParameterCode">检测参数</Label>
              <Select v-model="form.inspectionParameterCode">
                <SelectTrigger id="inspectionParameterCode" class="w-full">
                  <SelectValue placeholder="未选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">未选择</SelectItem>
                  <SelectItem v-for="p in parameters" :key="p.code" :value="p.code">
                    {{ p.code }} {{ p.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>判定标准</Label>
            <Input v-model="form.judgmentStandardCode" class="font-mono" placeholder="如 GB 175-2023" />
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label>牌号</Label>
              <Input v-model="form.brand" />
            </div>
            <div>
              <Label>型号</Label>
              <Input v-model="form.model" />
            </div>
            <div>
              <Label>等级</Label>
              <Input v-model="form.grade" />
            </div>
            <div>
              <Label>规格</Label>
              <Input v-model="form.spec" />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-3">
            <div>
              <Label for="comparison">判定方式</Label>
              <Select v-model="form.comparison">
                <SelectTrigger id="comparison" class="w-full">
                  <SelectValue placeholder="选择判定方式" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="c in COMPARISONS" :key="c" :value="c">
                    {{ COMPARISON_LABEL[c] ?? c }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>下限</Label>
              <Input v-model="form.minValue" type="number" />
            </div>
            <div>
              <Label>上限</Label>
              <Input v-model="form.maxValue" type="number" />
            </div>
          </div>
          <div>
            <Label>备注</Label>
            <Input v-model="form.remark" />
          </div>
        </div>
        <DialogFooter class="px-6 py-3 gap-2 border-t">
          <Button variant="outline" @click="closeDialog">
            取消
          </Button>
          <Button data-fn="M06.F06.I02" @click="submitForm">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      :open="deleteTarget !== null"
      title="删除技术要求"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    >
      <p>
        确定删除
        <span class="font-mono">
          {{ deleteTarget?.inspectionObjectCode }}/{{ deleteTarget?.inspectionParameterCode }}
        </span> 的技术要求？被引用的技术要求不可删除（M06.F06.I03 引用保护）。
      </p>
      <p v-if="deleteError" role="alert" class="mt-2 text-red-600">{{ deleteError }}</p>
    </ConfirmDialog>
  </div>
</template>
