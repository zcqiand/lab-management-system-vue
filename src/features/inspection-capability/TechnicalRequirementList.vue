<script setup lang="ts">
// M06.F06 技术要求维护 — 列表 + 4 维筛选 + Dialog 弹窗（镜像 react 仓）。
//
// 复合主键：(object, parameter, judgmentStandard)；
// 多维筛选：brand / model / grade / spec — 客户端二次过滤。
import { onMounted, reactive, ref, watch } from "vue";
import axios from "axios";
import { API_ROUTES } from "@/api/legacy-client";
import Button from "@/components/ui/Button.vue";
import ConfirmDialog from "@/components/app/ConfirmDialog.vue";

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
  const payload = {
    inspectionObjectCode: form.inspectionObjectCode,
    inspectionParameterCode: form.inspectionParameterCode,
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
      <input v-model="brandFilter" aria-label="牌号筛选" class="border rounded h-9 px-2 text-sm bg-white max-w-32" placeholder="牌号" />
      <input v-model="modelFilter" aria-label="型号筛选" class="border rounded h-9 px-2 text-sm bg-white max-w-32" placeholder="型号" />
      <input v-model="gradeFilter" aria-label="等级筛选" class="border rounded h-9 px-2 text-sm bg-white max-w-32" placeholder="等级" />
      <input v-model="specFilter" aria-label="规格筛选" class="border rounded h-9 px-2 text-sm bg-white max-w-32" placeholder="规格" />
    </div>

    <div v-if="error" role="alert" class="text-sm text-red-600 bg-red-50 p-2 rounded">{{ error }}</div>

    <div v-if="!loading && items.length === 0" class="text-sm text-slate-400 text-center py-8">
      暂无技术要求
    </div>

    <table v-else class="w-full text-sm bg-white rounded shadow overflow-hidden">
      <thead class="bg-slate-50 text-slate-600">
        <tr>
          <th class="px-4 py-2 text-left">检测项目</th>
          <th class="px-4 py-2 text-left">检测参数</th>
          <th class="px-4 py-2 text-left">判定标准</th>
          <th class="px-4 py-2 text-left">牌号</th>
          <th class="px-4 py-2 text-left">型号</th>
          <th class="px-4 py-2 text-left">等级</th>
          <th class="px-4 py-2 text-left">规格</th>
          <th class="px-4 py-2 text-left">判定方式</th>
          <th class="px-4 py-2 text-left">上限</th>
          <th class="px-4 py-2 text-left">下限</th>
          <th class="px-4 py-2 text-left w-32">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in items" :key="row.id" class="border-t hover:bg-slate-50">
          <td class="px-4 py-2 font-mono text-xs">{{ row.inspectionObjectCode }}</td>
          <td class="px-4 py-2 font-mono text-xs">{{ row.inspectionParameterCode }}</td>
          <td class="px-4 py-2 font-mono text-xs">{{ row.judgmentStandardCode }}</td>
          <td class="px-4 py-2">{{ row.brand ?? "-" }}</td>
          <td class="px-4 py-2">{{ row.model ?? "-" }}</td>
          <td class="px-4 py-2">{{ row.grade ?? "-" }}</td>
          <td class="px-4 py-2">{{ row.spec ?? "-" }}</td>
          <td class="px-4 py-2">
            <span class="inline-flex items-center rounded border px-2 py-0.5 text-xs">{{ COMPARISON_LABEL[row.comparison] ?? row.comparison }}</span>
          </td>
          <td class="px-4 py-2">{{ row.maxValue ?? "-" }}</td>
          <td class="px-4 py-2">{{ row.minValue ?? "-" }}</td>
          <td class="px-4 py-2 text-xs whitespace-nowrap">
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
          </td>
        </tr>
      </tbody>
    </table>

    <div class="text-sm text-slate-500">共 {{ items.length }} 条</div>

    <Teleport to="body">
      <div
        v-if="mode.kind === 'create' || mode.kind === 'edit'"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="closeDialog"
      >
        <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl">
          <div class="px-6 py-4 border-b">
            <h2 class="text-lg font-semibold">{{ mode.kind === "create" ? "新建技术要求" : "编辑技术要求" }}</h2>
            <p class="text-sm text-slate-500">复合主键：检测项目 + 检测参数 + 判定标准</p>
          </div>
          <div class="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-3 text-sm">
            <div v-if="saveError" role="alert" class="text-red-600 bg-red-50 p-2 rounded">{{ saveError }}</div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm font-medium">检测项目</label>
                <select v-model="form.inspectionObjectCode" class="border rounded h-9 px-2 text-sm bg-white w-full">
                  <option value="">未选择</option>
                  <option v-for="o in objects" :key="o.code" :value="o.code">{{ o.code }} {{ o.name }}</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium">检测参数</label>
                <select v-model="form.inspectionParameterCode" class="border rounded h-9 px-2 text-sm bg-white w-full">
                  <option value="">未选择</option>
                  <option v-for="p in parameters" :key="p.code" :value="p.code">{{ p.code }} {{ p.name }}</option>
                </select>
              </div>
            </div>
            <div>
              <label class="text-sm font-medium">判定标准</label>
              <input v-model="form.judgmentStandardCode" class="border rounded h-9 px-2 text-sm bg-white w-full font-mono" placeholder="如 GB 175-2023" />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm font-medium">牌号</label>
                <input v-model="form.brand" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div>
                <label class="text-sm font-medium">型号</label>
                <input v-model="form.model" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div>
                <label class="text-sm font-medium">等级</label>
                <input v-model="form.grade" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div>
                <label class="text-sm font-medium">规格</label>
                <input v-model="form.spec" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-sm font-medium">判定方式</label>
                <select v-model="form.comparison" class="border rounded h-9 px-2 text-sm bg-white w-full">
                  <option v-for="c in COMPARISONS" :key="c" :value="c">{{ COMPARISON_LABEL[c] ?? c }}</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium">下限</label>
                <input v-model="form.minValue" type="number" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div>
                <label class="text-sm font-medium">上限</label>
                <input v-model="form.maxValue" type="number" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
            </div>
            <div>
              <label class="text-sm font-medium">备注</label>
              <input v-model="form.remark" class="border rounded h-9 px-2 text-sm bg-white w-full" />
            </div>
          </div>
          <div class="px-6 py-3 flex justify-end gap-2 border-t">
            <Button variant="outline" @click="closeDialog">
              取消
            </Button>
            <Button data-fn="M06.F06.I02" @click="submitForm">
              保存
            </Button>
          </div>
        </div>
      </div>
    </Teleport>

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
