<script setup lang="ts">
// M06.F05 计算方法维护 — 列表 + Dialog 弹窗（镜像 react 仓）。
//
// 复合主键：(inspectionObjectCode, inspectionParameterCode)；
// 主键由 tests 端 shape adapter 兜底生成 id=cr-… 。
import { onMounted, reactive, ref, watch } from "vue";
import axios from "axios";
import { API_ROUTES } from "@/api/legacy-client";
import Button from "@/components/ui/Button.vue";
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

// @entry M06.F05.I01
interface CalcRule {
  id: string;
  inspectionObjectCode: string;
  inspectionParameterCode: string;
  testingStandardCode?: string;
  algorithmType: string;
  specimenCount: number;
  roundingRule?: string;
  remark?: string;
  objectName?: string;
  parameterName?: string;
}

interface Opt {
  code: string;
  name: string;
}

const ALGORITHMS: Array<{ value: string; label: string }> = [
  { value: "simple_avg", label: "简单平均" },
  { value: "compressive_strength", label: "抗压强度" },
  { value: "flexural_strength", label: "抗折强度" },
  { value: "steel_tensile", label: "钢材拉伸" },
  { value: "formula", label: "公式计算" },
  { value: "manual", label: "人工判定" },
];
const ALGO_LABEL = Object.fromEntries(ALGORITHMS.map((a) => [a.value, a.label]));

const EMPTY_FORM: Record<string, string> = {
  inspectionObjectCode: "",
  inspectionParameterCode: "",
  testingStandardCode: "",
  algorithmType: "manual",
  specimenCount: "1",
  roundingRule: "",
  remark: "",
};

const items = ref<CalcRule[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const objects = ref<Opt[]>([]);
const parameters = ref<Opt[]>([]);
const standards = ref<Opt[]>([]);
const keyword = ref("");

type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; item: CalcRule };
const mode = ref<Mode>({ kind: "idle" });
const form = reactive<Record<string, string>>({ ...EMPTY_FORM });
const saveError = ref<string | null>(null);
const deleteTarget = ref<CalcRule | null>(null);
const deleteError = ref<string | null>(null);
const deleting = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const params: Record<string, string | number> = { page: 1, pageSize: 100 };
    if (keyword.value.trim()) params.keyword = keyword.value.trim();
    const res = await axios.get<{ items: CalcRule[]; total: number }>(
      API_ROUTES["/inspection-calculation-methods"],
      { params },
    );
    items.value = Array.isArray(res.data?.items) ? res.data.items : [];
  } catch (e) {
    error.value = e instanceof Error ? e.message : "加载失败";
    items.value = [];
  } finally {
    loading.value = false;
  }
}

async function loadOptions(): Promise<void> {
  const [oRes, pRes, sRes] = await Promise.all([
    axios
      .get<{ items: Opt[] }>(API_ROUTES["/inspection-objects"], {
        params: { page: 1, pageSize: 200 },
      })
      .catch(() => ({ data: { items: [] } })),
    axios
      .get<{ items: Opt[] }>(API_ROUTES["/inspection-parameters"], {
        params: { page: 1, pageSize: 200 },
      })
      .catch(() => ({ data: { items: [] } })),
    axios
      .get<{ items: Opt[] }>(API_ROUTES["/inspection-standards"], {
        params: { page: 1, pageSize: 200 },
      })
      .catch(() => ({ data: { items: [] } })),
  ]);
  objects.value = Array.isArray(oRes.data?.items) ? oRes.data.items : [];
  parameters.value = Array.isArray(pRes.data?.items) ? pRes.data.items : [];
  standards.value = Array.isArray(sRes.data?.items) ? sRes.data.items : [];
}

onMounted(async () => {
  await Promise.all([load(), loadOptions()]);
});

watch(keyword, () => {
  void load();
});

function openCreate(): void {
  Object.assign(form, EMPTY_FORM);
  saveError.value = null;
  mode.value = { kind: "create" };
}
function openEdit(row: CalcRule): void {
  Object.assign(form, {
    inspectionObjectCode: row.inspectionObjectCode,
    inspectionParameterCode: row.inspectionParameterCode,
    testingStandardCode: row.testingStandardCode ?? "",
    algorithmType: row.algorithmType,
    specimenCount: String(row.specimenCount ?? 1),
    roundingRule: row.roundingRule ?? "",
    remark: row.remark ?? "",
  });
  saveError.value = null;
  mode.value = { kind: "edit", item: row };
}
function closeDialog(): void {
  mode.value = { kind: "idle" };
}
function alertError(msg: string): void {
  globalThis.alert(msg);
}

async function submitForm(): Promise<void> {
  saveError.value = null;
  // __none__ 是 reka-ui SelectItem 替代 raw <option value=""> 的 sentinel（reka-ui
  // SelectItem 显式禁止空字符串 value），翻译回空串让后端字段缺失
  const objVal = form.inspectionObjectCode;
  const paramVal = form.inspectionParameterCode;
  const stdVal = form.testingStandardCode;
  const payload = {
    inspectionObjectCode: objVal && objVal !== "__none__" ? objVal : "",
    inspectionParameterCode: paramVal && paramVal !== "__none__" ? paramVal : "",
    testingStandardCode: stdVal && stdVal !== "__none__" ? stdVal : undefined,
    algorithmType: form.algorithmType,
    specimenCount: Number(form.specimenCount) || 1,
    roundingRule: form.roundingRule || undefined,
    remark: form.remark || undefined,
  };
  try {
    if (mode.value.kind === "create") {
      await axios.post(API_ROUTES["/inspection-calculation-methods"], payload);
    } else if (mode.value.kind === "edit") {
      const id = mode.value.item.id;
      await axios.put(`${API_ROUTES["/inspection-calculation-methods"]}/${id}`, payload);
    }
    closeDialog();
    await load();
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "保存失败";
    saveError.value = msg;
  }
}

function startDelete(row: CalcRule): void {
  deleteTarget.value = row;
  deleteError.value = null;
}
async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return;
  deleting.value = true;
  deleteError.value = null;
  try {
    await axios.delete(`${API_ROUTES["/inspection-calculation-methods"]}/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    await load();
  } catch (e: unknown) {
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "删除失败";
    deleteError.value = msg;
  } finally {
    deleting.value = false;
  }
}
</script>

<template>
  <!-- @entry M06.F05.I01 计算方法维护列表 -->
  <div data-fn="M06.F05.I01" class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">计算方法维护</h1>
        <p class="text-sm text-slate-500">
          M06.F05 计算方法（复合主键：检测项目 + 检测参数）——算法类型 + 试件数量 + 修约规则
        </p>
      </div>
      <Button data-fn="M06.F05.I01" @click="openCreate">
        新建计算方法
      </Button>
    </div>

    <div class="flex gap-2">
      <Input
        v-model="keyword"
        class="max-w-sm"
        placeholder="搜索项目/参数"
      />
    </div>

    <div v-if="error" role="alert" class="text-sm text-red-600 bg-red-50 p-2 rounded">
      {{ error }}
    </div>

    <div v-if="!loading && items.length === 0" class="text-sm text-slate-400 text-center py-8">
      暂无计算方法
    </div>

    <Table v-else class="w-full text-sm bg-white rounded shadow overflow-hidden">
      <TableHeader class="bg-slate-50 text-slate-600">
        <TableRow>
          <TableHead class="px-4 py-2 text-left">检测项目</TableHead>
          <TableHead class="px-4 py-2 text-left">检测参数</TableHead>
          <TableHead class="px-4 py-2 text-left">判定标准</TableHead>
          <TableHead class="px-4 py-2 text-left">算法类型</TableHead>
          <TableHead class="px-4 py-2 text-left">试件数量</TableHead>
          <TableHead class="px-4 py-2 text-left">备注</TableHead>
          <TableHead class="px-4 py-2 text-left w-32">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="row in items" :key="row.id" class="border-t hover:bg-slate-50">
          <TableCell class="px-4 py-2 align-top">
            <div class="font-mono text-xs">{{ row.inspectionObjectCode }}</div>
            <div v-if="row.objectName" class="text-xs text-slate-500">{{ row.objectName }}</div>
          </TableCell>
          <TableCell class="px-4 py-2 align-top">
            <div class="font-mono text-xs">{{ row.inspectionParameterCode }}</div>
            <div v-if="row.parameterName" class="text-xs text-slate-500">
              {{ row.parameterName }}
            </div>
          </TableCell>
          <TableCell class="px-4 py-2 font-mono text-xs">{{ row.testingStandardCode ?? "-" }}</TableCell>
          <TableCell class="px-4 py-2">
            <span class="inline-flex items-center rounded border px-2 py-0.5 text-xs">{{
              ALGO_LABEL[row.algorithmType] ?? row.algorithmType
            }}</span>
          </TableCell>
          <TableCell class="px-4 py-2">{{ row.specimenCount }}</TableCell>
          <TableCell class="px-4 py-2 text-xs text-slate-500">{{ row.remark ?? "-" }}</TableCell>
          <TableCell class="px-4 py-2 text-xs whitespace-nowrap">
            <Button
              variant="link"
              class="text-primary hover:underline mr-3"
              data-fn="M06.F05.I01"
              :aria-label="`编辑 ${row.id}`"
              @click="openEdit(row)"
            >
              编辑
            </Button>
            <Button
              variant="link"
              class="text-destructive hover:underline"
              data-fn="M06.F05.I01"
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

    <Teleport to="body">
      <div
        v-if="mode.kind === 'create' || mode.kind === 'edit'"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="closeDialog"
      >
        <div class="bg-white rounded-lg shadow-xl w-full max-w-xl">
          <div class="px-6 py-4 border-b">
            <h2 class="text-lg font-semibold">
              {{ mode.kind === "create" ? "新建计算方法" : "编辑计算方法" }}
            </h2>
            <p class="text-sm text-slate-500">复合主键：检测项目 + 检测参数</p>
          </div>
          <div class="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-3 text-sm">
            <div v-if="saveError" role="alert" class="text-red-600 bg-red-50 p-2 rounded">
              {{ saveError }}
            </div>
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
              <Label for="testingStandardCode">判定标准（可选）</Label>
              <Select v-model="form.testingStandardCode">
                <SelectTrigger id="testingStandardCode" class="w-full">
                  <SelectValue placeholder="不指定" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">不指定</SelectItem>
                  <SelectItem v-for="s in standards" :key="s.code" :value="s.code">
                    {{ s.code }} {{ s.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <Label for="algorithmType">算法类型</Label>
                <Select v-model="form.algorithmType">
                  <SelectTrigger id="algorithmType" class="w-full">
                    <SelectValue placeholder="选择算法类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="a in ALGORITHMS" :key="a.value" :value="a.value">
                      {{ a.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>试件数量</Label>
                <Input
                  v-model="form.specimenCount"
                  type="number"
                />
              </div>
              <div>
                <Label>修约规则</Label>
                <Input
                  v-model="form.roundingRule"
                  placeholder="如 修约到 0.1"
                />
              </div>
            </div>
            <div>
              <Label>备注</Label>
              <Input
                v-model="form.remark"
              />
            </div>
          </div>
          <div class="px-6 py-3 flex justify-end gap-2 border-t">
            <Button variant="outline" @click="closeDialog">
              取消
            </Button>
            <Button data-fn="M06.F05.I01" @click="submitForm">
              保存
            </Button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmDialog
      :open="deleteTarget !== null"
      title="删除计算方法"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    >
      <p>
        确定删除
        <span class="font-mono">
          {{ deleteTarget?.inspectionObjectCode }} /
          {{ deleteTarget?.inspectionParameterCode }} </span
        >？
      </p>
      <p v-if="deleteError" role="alert" class="mt-2 text-red-600">{{ deleteError }}</p>
    </ConfirmDialog>
  </div>
</template>
