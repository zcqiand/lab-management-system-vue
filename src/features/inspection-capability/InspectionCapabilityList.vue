<script setup lang="ts">
// M06 检测能力 4 主表列表（specialty / object / parameter / standard）— 镜像 react 仓。
//
// 多资源模式（react 仓 InspectionCapabilityList 用 resource prop 区分），vue 仓用
// setup 组件 + props.resource 翻译。msw 数据形状由 installShapeAdapters wrapDict 兜底
// （id=code + keyword 过滤 + junction 反查）。
import { computed, onMounted, reactive, ref, watch } from "vue";
import axios, { type AxiosResponse } from "axios";
import { API_ROUTES } from "@/api/legacy-client";
import Button from "@/components/ui/Button.vue";
import ConfirmDialog from "@/components/app/ConfirmDialog.vue";
import ParameterStandardLinkDialog from "@/features/inspection-capability/ParameterStandardLinkDialog.vue";
import { normalizeListResponse, unwrapListResponse } from "@/lib/responses";

// 失败兜底：axios catch 需要一个 AxiosResponse 形态的对象占位；
// unwrapListResponse 只读 .data，所以这个 stub 仅 .data 字段被消费。
function emptyListResponse(): AxiosResponse<unknown> {
  return { data: { items: [], total: 0 } } as AxiosResponse<unknown>;
}

type Resource = "specialties" | "objects" | "parameters" | "standards";

interface Props {
  resource: Resource;
}
const props = defineProps<Props>();

// @entry M06.F01.I01
// @entry M06.F02.I01
// @entry M06.F03.I01
// @entry M06.F04.I01
// @entry M06.F02.I02
// @entry M06.F04.I02
// @entry M06.F03.I02 参数↔标准关联（parameters 行内「关联标准」→ ParameterStandardLinkDialog）

// 内联类型（vue 仓无 src/types/ 目录；镜像 react/src/types/inspection/*）
interface ListItem {
  id: string;
  code: string;
  name: string;
  sortOrder?: number;
  enabled?: boolean;
  isOfficial?: boolean;
  officialNo?: string;
  sourceType?: string;
  status?: string;
  unit?: string;
  version?: string;
  parameterNames?: string;
  standardCodes?: string;
  objectNames?: string;
}

const TITLES: Record<Resource, string> = {
  specialties: "检测专项维护",
  objects: "检测项目维护",
  parameters: "检测参数维护",
  standards: "检测标准维护",
};

const CREATE_LABELS: Record<Resource, string> = {
  specialties: "新建检测专项",
  objects: "新建检测项目",
  parameters: "新建检测参数",
  standards: "新建检测标准",
};

const ROUTES: Record<Resource, string> = {
  specialties: API_ROUTES["/inspection-specialties"],
  objects: API_ROUTES["/inspection-objects"],
  parameters: API_ROUTES["/inspection-parameters"],
  standards: API_ROUTES["/inspection-standards"],
};

const FN_ID: Record<Resource, string> = {
  specialties: "M06.F01.I01",
  objects: "M06.F02.I01",
  parameters: "M06.F03.I01",
  standards: "M06.F04.I01",
};

const FN_CREATE: Record<Resource, string> = {
  specialties: "M06.F01.I01",
  objects: "M06.F02.I02",
  parameters: "M06.F03.I01",
  standards: "M06.F04.I02",
};

const FN_DELETE: Record<Resource, string> = {
  specialties: "M06.F01.I01",
  objects: "M06.F02.I01",
  parameters: "M06.F03.I01",
  standards: "M06.F04.I01",
};

const STANDARD_STATUS_CN: Record<string, string> = {
  active: "现行",
  superseded: "被替代",
  draft: "草案",
};

const title = computed(() => TITLES[props.resource]);
const createLabel = computed(() => CREATE_LABELS[props.resource]);
const route = computed(() => ROUTES[props.resource]);
const fnId = computed(() => FN_ID[props.resource]);
const fnCreate = computed(() => FN_CREATE[props.resource]);
const fnDelete = computed(() => FN_DELETE[props.resource]);

interface Opt { code: string; name: string }

const items = ref<ListItem[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const keyword = ref("");
const specialtyFilter = ref("");
const objectFilter = ref("");
const standardFilter = ref("");
const specialtyOptions = ref<Opt[]>([]);
const objectOptions = ref<Opt[]>([]);
const standardOptions = ref<Opt[]>([]);
const parameterOptions = ref<Opt[]>([]);

// 弹窗状态
type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; item: ListItem };
const mode = ref<Mode>({ kind: "idle" });
const saveError = ref<string | null>(null);
const deleteTarget = ref<ListItem | null>(null);
const deleteError = ref<string | null>(null);
const deleting = ref(false);
// M06.F03.I02 参数↔标准关联弹窗（parameters 资源专属）
const linkingParam = ref<ListItem | null>(null);

// form 通用字段（多资源用 reactive 一次性管理）
const form = reactive<Record<string, string | boolean | number>>({});

function resetForm(): void {
  if (props.resource === "specialties") {
    Object.assign(form, { code: "", name: "", officialNo: "", isOfficial: false, enabled: true, sortOrder: 999 });
  } else if (props.resource === "objects") {
    Object.assign(form, {
      code: "",
      name: "",
      inspectionSpecialtyCode: "",
      sourceProjectNo: "",
      sourceProjectName: "",
      isOfficial: false,
      enabled: true,
      isOptionalForQualification: false,
      sortOrder: 999,
    });
  } else if (props.resource === "parameters") {
    Object.assign(form, { code: "", name: "", unit: "", sourceType: "custom", sortOrder: 999 });
  } else {
    Object.assign(form, { code: "", name: "", version: "", status: "active", sourceDocumentId: "", sortOrder: 999 });
  }
}

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const params: Record<string, string | number> = { page: 1, pageSize: 50 };
    if (keyword.value.trim()) params.keyword = keyword.value.trim();
    if (props.resource === "objects" && specialtyFilter.value) {
      params.inspectionSpecialtyCode = specialtyFilter.value;
    }
    if (props.resource === "standards") {
      if (specialtyFilter.value) params.inspectionSpecialtyCode = specialtyFilter.value;
      if (objectFilter.value) params.inspectionObjectCode = objectFilter.value;
    }
    if (props.resource === "parameters") {
      if (specialtyFilter.value) params.inspectionSpecialtyCode = specialtyFilter.value;
      if (objectFilter.value) params.inspectionObjectCode = objectFilter.value;
      if (standardFilter.value) params.inspectionStandardCode = standardFilter.value;
    }
    const res = await axios.get<unknown>(route.value, { params });
    const { items: listItems, total: listTotal } = unwrapListResponse<ListItem>(res);
    items.value = listItems;
    total.value = listTotal;
  } catch (e) {
    error.value = e instanceof Error ? e.message : "加载失败";
    items.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

async function loadOptions(): Promise<void> {
  if (props.resource === "specialties") return;
  const spRes = await axios
    .get<unknown>(ROUTES.specialties, { params: { page: 1, pageSize: 100 } })
    .catch(() => emptyListResponse());
  specialtyOptions.value = normalizeListResponse<Opt>(spRes.data).items;
  if (props.resource === "standards" || props.resource === "parameters") {
    const objParams: Record<string, string | number> = { page: 1, pageSize: 200 };
    if (specialtyFilter.value) objParams.inspectionSpecialtyCode = specialtyFilter.value;
    const objRes = await axios
      .get<unknown>(ROUTES.objects, { params: objParams })
      .catch(() => emptyListResponse());
    objectOptions.value = normalizeListResponse<Opt>(objRes.data).items;
  }
  if (props.resource === "parameters") {
    const stdParams: Record<string, string | number> = { page: 1, pageSize: 200 };
    if (objectFilter.value) stdParams.inspectionObjectCode = objectFilter.value;
    const stdRes = await axios
      .get<unknown>(ROUTES.standards, { params: stdParams })
      .catch(() => emptyListResponse());
    standardOptions.value = normalizeListResponse<Opt>(stdRes.data).items;
  }
  if (props.resource === "objects") {
    const pRes = await axios
      .get<unknown>(ROUTES.parameters, { params: { page: 1, pageSize: 200 } })
      .catch(() => emptyListResponse());
    parameterOptions.value = normalizeListResponse<Opt>(pRes.data).items;
  }
}

onMounted(async () => {
  await Promise.all([load(), loadOptions()]);
});

watch(
  () => [props.resource, keyword.value, specialtyFilter.value, objectFilter.value, standardFilter.value] as const,
  async () => {
    await load();
    await loadOptions();
  },
);

function isOfficialRow(item: ListItem): boolean {
  if (props.resource === "specialties" || props.resource === "objects") return item.isOfficial === true;
  if (props.resource === "parameters") return item.sourceType === "official";
  return false;
}

function openCreate(): void {
  resetForm();
  saveError.value = null;
  mode.value = { kind: "create" };
}
function openEdit(item: ListItem): void {
  resetForm();
  saveError.value = null;
  Object.assign(form, item);
  form.sortOrder = Number(item.sortOrder ?? 999);
  mode.value = { kind: "edit", item };
}
function closeDialog(): void {
  mode.value = { kind: "idle" };
}
function alertError(msg: string): void {
  globalThis.alert(msg);
}

async function submitForm(): Promise<void> {
  saveError.value = null;
  const payload: Record<string, unknown> = { code: form.code, name: form.name };
  if (props.resource === "specialties") {
    payload.officialNo = form.officialNo || undefined;
    payload.isOfficial = form.isOfficial === true;
    payload.enabled = form.enabled === true;
  } else if (props.resource === "objects") {
    payload.inspectionSpecialtyCode = form.inspectionSpecialtyCode || undefined;
    payload.sourceProjectNo = form.sourceProjectNo || undefined;
    payload.sourceProjectName = form.sourceProjectName || undefined;
    payload.isOfficial = form.isOfficial === true;
    payload.enabled = form.enabled === true;
    payload.isOptionalForQualification = form.isOptionalForQualification === true;
  } else if (props.resource === "parameters") {
    payload.unit = form.unit || undefined;
    payload.sourceType = form.sourceType || "custom";
  } else {
    payload.version = form.version || undefined;
    payload.status = form.status || "active";
    payload.sourceDocumentId = form.sourceDocumentId || undefined;
  }
  payload.sortOrder = Number(form.sortOrder) || 999;
  try {
    if (mode.value.kind === "create") {
      await axios.post(route.value, payload);
    } else if (mode.value.kind === "edit") {
      const id = mode.value.item.id;
      await axios.put(`${route.value}/${id}`, payload);
    }
    closeDialog();
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "保存失败";
    saveError.value = msg;
  }
}

function confirmDeleteStart(item: ListItem): void {
  deleteTarget.value = item;
  deleteError.value = null;
}
async function confirmDelete(): Promise<void> {
  if (!deleteTarget.value) return;
  deleting.value = true;
  deleteError.value = null;
  try {
    await axios.delete(`${route.value}/${deleteTarget.value.id}`);
    deleteTarget.value = null;
    await load();
  } catch (e: unknown) {
    const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "删除失败";
    deleteError.value = msg;
  } finally {
    deleting.value = false;
  }
}

function columnHeaders(): string[] {
  if (props.resource === "specialties") return ["编码", "名称", "官方序号", "官方/自定义", "状态"];
  if (props.resource === "objects") return ["编码", "名称", "检测参数", "检测标准", "状态"];
  if (props.resource === "parameters") return ["编码", "名称", "单位", "检测项目", "检测标准"];
  return ["编码", "名称", "版本", "状态", "检测参数"];
}

function cellOf(item: ListItem, idx: number): string {
  switch (idx) {
    case 0: return item.code;
    case 1: return item.name;
    case 2:
      if (props.resource === "specialties") return item.officialNo ?? "-";
      if (props.resource === "parameters") return item.unit ?? "-";
      if (props.resource === "standards") return item.version ?? "-";
      return item.parameterNames ?? "-";
    case 3:
      if (props.resource === "specialties") return item.isOfficial ? "官方" : "自定义";
      if (props.resource === "objects") return item.parameterNames ?? "-";
      if (props.resource === "standards") return STANDARD_STATUS_CN[item.status ?? ""] ?? item.status ?? "-";
      return item.objectNames ?? "-";
    case 4:
      if (props.resource === "specialties") return item.enabled ? "启用" : "停用";
      if (props.resource === "objects") return item.enabled ? "启用" : "停用";
      if (props.resource === "standards") return item.parameterNames ?? "-";
      return item.standardCodes ?? "-";
    default: return "-";
  }
}
</script>

<template>
  <!-- @entry M06.F01.I01 / M06.F02.I01 / M06.F03.I01 / M06.F04.I01（按 resource prop 切换） -->
  <!-- @entry M06.F02.I02 项目↔专项/参数关联（objects 视图 form 下拉） -->
  <!-- @entry M06.F04.I02 标准 CRUD（standards 视图 编辑/删除 按钮） -->
  <div :data-fn="fnId" class="space-y-4">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-semibold">{{ title }}</h1>
        <p class="text-sm text-slate-500">M06 检测能力多资源列表（数据来自 lab-msw fixtures）</p>
      </div>
      <Button :data-fn="fnCreate" @click="openCreate">
        {{ createLabel }}
      </Button>
    </div>

    <div class="flex flex-wrap gap-2">
      <input
        v-model="keyword"
        class="border rounded h-9 px-2 text-sm bg-white max-w-sm"
        placeholder="搜索编码/名称"
      />
      <select
        v-if="props.resource !== 'specialties'"
        v-model="specialtyFilter"
        class="border rounded h-9 px-2 text-sm bg-white"
        aria-label="检测专项筛选"
      >
        <option value="">全部专项</option>
        <option v-for="s in specialtyOptions" :key="s.code" :value="s.code">{{ s.name }}</option>
      </select>
      <select
        v-if="props.resource === 'standards' || props.resource === 'parameters'"
        v-model="objectFilter"
        class="border rounded h-9 px-2 text-sm bg-white"
        aria-label="检测项目筛选"
      >
        <option value="">全部项目</option>
        <option v-for="o in objectOptions" :key="o.code" :value="o.code">{{ o.name }}</option>
      </select>
      <select
        v-if="props.resource === 'parameters'"
        v-model="standardFilter"
        class="border rounded h-9 px-2 text-sm bg-white"
        aria-label="检测标准筛选"
      >
        <option value="">全部标准</option>
        <option v-for="s in standardOptions" :key="s.code" :value="s.code">{{ s.code }}</option>
      </select>
    </div>

    <div v-if="error" role="alert" class="text-sm text-red-600 bg-red-50 p-2 rounded">{{ error }}</div>

    <div v-if="!loading && items.length === 0" class="text-sm text-slate-400 text-center py-8">
      暂无{{ title }}，点击右上角新建一行
    </div>

    <table v-else class="w-full text-sm bg-white rounded shadow overflow-hidden">
      <thead class="bg-slate-50 text-slate-600">
        <tr>
          <th v-for="(h, i) in columnHeaders()" :key="i" class="px-4 py-2 text-left">{{ h }}</th>
          <th class="px-4 py-2 text-left w-32">操作</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="item in items" :key="item.id" class="border-t hover:bg-slate-50">
          <td v-for="(_, i) in columnHeaders()" :key="i" class="px-4 py-2 align-top">
            <span v-if="i === 0" class="font-mono text-xs">{{ cellOf(item, i) }}</span>
            <span v-else>{{ cellOf(item, i) }}</span>
          </td>
          <td class="px-4 py-2 text-xs whitespace-nowrap">
            <Button
              v-if="resource === 'parameters'"
              size="sm"
              variant="ghost"
              class="text-primary hover:underline mr-3"
              data-fn="M06.F03.I02"
              :aria-label="`关联标准 ${item.code}`"
              @click="linkingParam = item"
            >
              关联标准
            </Button>
            <Button
              size="sm"
              variant="ghost"
              class="text-primary hover:underline mr-3"
              :data-fn="fnCreate"
              :aria-label="`编辑 ${item.code}`"
              @click="openEdit(item)"
            >
              编辑
            </Button>
            <Button
              size="sm"
              variant="ghost"
              class="text-red-600 hover:underline"
              :data-fn="fnDelete"
              :aria-label="`删除 ${item.code}`"
              :disabled="isOfficialRow(item)"
              @click="confirmDeleteStart(item)"
            >
              删除
            </Button>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="text-sm text-slate-500">共 {{ total }} 条</div>

    <Teleport to="body">
      <div
        v-if="mode.kind === 'create' || mode.kind === 'edit'"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="closeDialog"
      >
        <div class="bg-white rounded-lg shadow-xl w-full max-w-xl">
          <div class="px-6 py-4 border-b">
            <h2 class="text-lg font-semibold">
              {{ mode.kind === "create" ? createLabel : `编辑${title}` }}
            </h2>
            <p class="text-sm text-slate-500">
              {{
                props.resource === "objects"
                  ? "M06.F02.I02 项目↔专项/参数关联：选择检测专项编码把项目挂到专项下"
                  : "填写后保存"
              }}
            </p>
          </div>
          <div class="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-3 text-sm">
            <div v-if="saveError" role="alert" class="text-red-600 bg-red-50 p-2 rounded">{{ saveError }}</div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="text-sm font-medium">编码</label>
                <input v-model="form.code" :disabled="mode.kind === 'edit'" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div>
                <label class="text-sm font-medium">名称</label>
                <input v-model="form.name" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
            </div>
            <div v-if="props.resource === 'specialties'" class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-sm font-medium">官方序号</label>
                <input v-model="form.officialNo" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div class="pt-6 flex items-center gap-2">
                <input v-model="form.isOfficial" type="checkbox" /> <label>官方</label>
              </div>
              <div class="pt-6 flex items-center gap-2">
                <input v-model="form.enabled" type="checkbox" /> <label>启用</label>
              </div>
            </div>
            <div v-else-if="props.resource === 'objects'" class="space-y-3">
              <div>
                <label class="text-sm font-medium">检测专项编码</label>
                <select v-model="form.inspectionSpecialtyCode" class="border rounded h-9 px-2 text-sm bg-white w-full">
                  <option value="">未选择</option>
                  <option v-for="s in specialtyOptions" :key="s.code" :value="s.code">{{ s.code }} {{ s.name }}</option>
                </select>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-sm font-medium">来源行号</label>
                  <input v-model="form.sourceProjectNo" class="border rounded h-9 px-2 text-sm bg-white w-full" />
                </div>
                <div>
                  <label class="text-sm font-medium">来源行名称</label>
                  <input v-model="form.sourceProjectName" class="border rounded h-9 px-2 text-sm bg-white w-full" />
                </div>
              </div>
              <div class="grid grid-cols-3 gap-3">
                <div class="pt-6 flex items-center gap-2"><input v-model="form.isOfficial" type="checkbox" /><label>官方</label></div>
                <div class="pt-6 flex items-center gap-2"><input v-model="form.enabled" type="checkbox" /><label>启用</label></div>
                <div class="pt-6 flex items-center gap-2"><input v-model="form.isOptionalForQualification" type="checkbox" /><label>资质可选</label></div>
              </div>
              <div class="text-xs text-slate-500">
                已选检测参数候选：{{ parameterOptions.length }} 个（M06.F02.I02 关联）
              </div>
            </div>
            <div v-else-if="props.resource === 'parameters'" class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-sm font-medium">单位</label>
                <input v-model="form.unit" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div>
                <label class="text-sm font-medium">来源类型</label>
                <select v-model="form.sourceType" class="border rounded h-9 px-2 text-sm bg-white w-full">
                  <option value="official">官方</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
            </div>
            <div v-else class="grid grid-cols-3 gap-3">
              <div>
                <label class="text-sm font-medium">版本</label>
                <input v-model="form.version" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div>
                <label class="text-sm font-medium">状态</label>
                <select v-model="form.status" class="border rounded h-9 px-2 text-sm bg-white w-full">
                  <option value="active">现行</option>
                  <option value="superseded">被替代</option>
                  <option value="draft">草案</option>
                </select>
              </div>
              <div>
                <label class="text-sm font-medium">来源文件</label>
                <input v-model="form.sourceDocumentId" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
            </div>
            <div>
              <label class="text-sm font-medium">排序</label>
              <input v-model.number="form.sortOrder" type="number" class="border rounded h-9 px-2 text-sm bg-white w-full" />
            </div>
          </div>
          <div class="px-6 py-3 flex justify-end gap-2 border-t">
            <Button variant="outline" @click="closeDialog">
              取消
            </Button>
            <Button :data-fn="fnCreate" @click="submitForm">
              保存
            </Button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmDialog
      :open="deleteTarget !== null"
      :title="`删除${title}`"
      :loading="deleting"
      @confirm="confirmDelete"
      @cancel="deleteTarget = null"
    >
      <p>
        确定删除 <span class="font-mono">{{ deleteTarget?.code ?? "" }}</span>？官方数据与被引用数据不可删除。
      </p>
      <p v-if="deleteError" role="alert" class="mt-2 text-red-600">{{ deleteError }}</p>
    </ConfirmDialog>

    <!-- M06.F03.I02 参数↔标准关联弹窗（parameters 资源） -->
    <ParameterStandardLinkDialog
      v-if="resource === 'parameters' && linkingParam"
      :open="linkingParam !== null"
      :parameter-code="linkingParam.code"
      :parameter-name="linkingParam.name"
      @update:open="(v: boolean) => { if (!v) linkingParam = null; }"
      @changed="load"
    />
  </div>
</template>
