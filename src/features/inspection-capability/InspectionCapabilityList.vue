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
import Checkbox from "@/components/ui/Checkbox.vue";
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
import ParameterStandardLinkDialog from "@/features/inspection-capability/ParameterStandardLinkDialog.vue";
import { normalizeListResponse, unwrapListResponse } from "@/lib/responses";
import Select from "@/components/ui/Select.vue";
import SelectContent from "@/components/ui/SelectContent.vue";
import SelectItem from "@/components/ui/SelectItem.vue";
import SelectTrigger from "@/components/ui/SelectTrigger.vue";
import SelectValue from "@/components/ui/SelectValue.vue";

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

// Phase 2b：form 是宽类型 Record（与 Input.vue 共享），但 <Checkbox> 期望严格 boolean。
// 提供读写器：读 = `=== true` 收敛；写 = `=== true` 收敛（与 submitForm 业务侧一致）。
function readBool(key: string): boolean {
  return form[key] === true;
}
function writeBool(key: string, value: boolean | "indeterminate"): void {
  form[key] = value === true;
}

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
    // filter "__all__" 是 reka-ui 替代 raw <select value=""> 的 sentinel（reka-ui SelectItem
    // 显式禁止空字符串 value；空串是 placeholder 保留值），load() 里翻译回空串跳过条件过滤
    const specialtyVal = specialtyFilter.value === "__all__" ? "" : specialtyFilter.value;
    const objectVal = objectFilter.value === "__all__" ? "" : objectFilter.value;
    const standardVal = standardFilter.value === "__all__" ? "" : standardFilter.value;
    if (props.resource === "objects" && specialtyVal) {
      params.inspectionSpecialtyCode = specialtyVal;
    }
    if (props.resource === "standards") {
      if (specialtyVal) params.inspectionSpecialtyCode = specialtyVal;
      if (objectVal) params.inspectionObjectCode = objectVal;
    }
    if (props.resource === "parameters") {
      if (specialtyVal) params.inspectionSpecialtyCode = specialtyVal;
      if (objectVal) params.inspectionObjectCode = objectVal;
      if (standardVal) params.inspectionStandardCode = standardVal;
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
    // __none__ 是 reka-ui SelectItem 替代 raw <option value=""> 的 sentinel
    const specVal = form.inspectionSpecialtyCode;
    payload.inspectionSpecialtyCode = specVal && specVal !== "__none__" ? specVal : undefined;
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
        <p class="text-sm text-muted-foreground">M06 检测能力多资源列表（数据来自 lab-msw fixtures）</p>
      </div>
      <Button :data-fn="fnCreate" @click="openCreate">
        {{ createLabel }}
      </Button>
    </div>

    <div class="flex flex-wrap gap-2">
      <Input
        v-model="keyword"
        class="max-w-sm"
        placeholder="搜索编码/名称"
      />
      <Select
        v-if="props.resource !== 'specialties'"
        v-model="specialtyFilter"
      >
        <SelectTrigger
          class="w-48"
          aria-label="检测专项筛选"
        >
          <SelectValue placeholder="全部专项" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">全部专项</SelectItem>
          <SelectItem v-for="s in specialtyOptions" :key="s.code" :value="s.code">
            {{ s.name }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Select
        v-if="props.resource === 'standards' || props.resource === 'parameters'"
        v-model="objectFilter"
      >
        <SelectTrigger
          class="w-48"
          aria-label="检测项目筛选"
        >
          <SelectValue placeholder="全部项目" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">全部项目</SelectItem>
          <SelectItem v-for="o in objectOptions" :key="o.code" :value="o.code">
            {{ o.name }}
          </SelectItem>
        </SelectContent>
      </Select>
      <Select
        v-if="props.resource === 'parameters'"
        v-model="standardFilter"
      >
        <SelectTrigger
          class="w-48"
          aria-label="检测标准筛选"
        >
          <SelectValue placeholder="全部标准" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">全部标准</SelectItem>
          <SelectItem v-for="s in standardOptions" :key="s.code" :value="s.code">
            {{ s.code }}
          </SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div v-if="error" role="alert" class="text-sm text-destructive bg-destructive/10 p-2 rounded">{{ error }}</div>

    <div v-if="!loading && items.length === 0" class="text-sm text-muted-foreground text-center py-8">
      暂无{{ title }}，点击右上角新建一行
    </div>

    <Table v-else class="w-full text-sm bg-white rounded shadow overflow-hidden">
      <TableHeader class="bg-muted text-muted-foreground">
        <TableRow>
          <TableHead v-for="(h, i) in columnHeaders()" :key="i" class="px-4 py-2 text-left">{{ h }}</TableHead>
          <TableHead class="px-4 py-2 text-left w-32">操作</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow v-for="item in items" :key="item.id" class="border-t hover:bg-muted">
          <TableCell v-for="(_, i) in columnHeaders()" :key="i" class="px-4 py-2 align-top">
            <span v-if="i === 0" class="font-mono text-xs">{{ cellOf(item, i) }}</span>
            <span v-else>{{ cellOf(item, i) }}</span>
          </TableCell>
          <TableCell class="px-4 py-2 text-xs whitespace-nowrap">
            <Button
              v-if="resource === 'parameters'"
              variant="link"
              class="text-primary hover:underline mr-3"
              data-fn="M06.F03.I02"
              :aria-label="`关联标准 ${item.code}`"
              @click="linkingParam = item"
            >
              关联标准
            </Button>
            <Button
              variant="link"
              class="text-primary hover:underline mr-3"
              :data-fn="fnCreate"
              :aria-label="`编辑 ${item.code}`"
              @click="openEdit(item)"
            >
              编辑
            </Button>
            <Button
              variant="link"
              class="text-destructive hover:underline disabled:opacity-40"
              :data-fn="fnDelete"
              :aria-label="`删除 ${item.code}`"
              :disabled="isOfficialRow(item)"
              @click="confirmDeleteStart(item)"
            >
              删除
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>

    <div class="text-sm text-muted-foreground">共 {{ total }} 条</div>

    <Dialog
      :open="mode.kind === 'create' || mode.kind === 'edit'"
      @update:open="
        (v: boolean) => {
          if (!v) closeDialog();
        }
      "
    >
      <DialogContent class="max-w-xl gap-0 p-0">
        <DialogHeader class="px-6 py-4 border-b">
          <DialogTitle>
            {{ mode.kind === "create" ? createLabel : `编辑${title}` }}
          </DialogTitle>
          <DialogDescription>
            {{
              props.resource === "objects"
                ? "M06.F02.I02 项目↔专项/参数关联：选择检测专项编码把项目挂到专项下"
                : "填写后保存"
            }}
          </DialogDescription>
        </DialogHeader>
        <div class="px-6 py-4 max-h-[60vh] overflow-y-auto space-y-3 text-sm">
          <div v-if="saveError" role="alert" class="text-destructive bg-destructive/10 p-2 rounded">{{ saveError }}</div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <Label>编码</Label>
              <Input v-model="form.code" :disabled="mode.kind === 'edit'" />
            </div>
            <div>
              <Label>名称</Label>
              <Input v-model="form.name" />
            </div>
          </div>
          <div v-if="props.resource === 'specialties'" class="grid grid-cols-3 gap-3">
            <div>
              <Label>官方序号</Label>
              <Input v-model="form.officialNo" />
            </div>
            <div class="pt-6 flex items-center gap-2">
              <Checkbox :model-value="readBool('isOfficial')" @update:model-value="(v) => writeBool('isOfficial', v)" /> <Label>官方</Label>
            </div>
            <div class="pt-6 flex items-center gap-2">
              <Checkbox :model-value="readBool('enabled')" @update:model-value="(v) => writeBool('enabled', v)" /> <Label>启用</Label>
            </div>
          </div>
          <div v-else-if="props.resource === 'objects'" class="space-y-3">
            <div>
              <Label for="inspectionSpecialtyCode">检测专项编码</Label>
              <Select v-model="form.inspectionSpecialtyCode">
                <SelectTrigger id="inspectionSpecialtyCode" class="w-full">
                  <SelectValue placeholder="未选择" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">未选择</SelectItem>
                  <SelectItem v-for="s in specialtyOptions" :key="s.code" :value="s.code">
                    {{ s.code }} {{ s.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <Label>来源行号</Label>
                <Input v-model="form.sourceProjectNo" />
              </div>
              <div>
                <Label>来源行名称</Label>
                <Input v-model="form.sourceProjectName" />
              </div>
            </div>
            <div class="grid grid-cols-3 gap-3">
              <div class="pt-6 flex items-center gap-2"><Checkbox :model-value="readBool('isOfficial')" @update:model-value="(v) => writeBool('isOfficial', v)" /><Label>官方</Label></div>
              <div class="pt-6 flex items-center gap-2"><Checkbox :model-value="readBool('enabled')" @update:model-value="(v) => writeBool('enabled', v)" /><Label>启用</Label></div>
              <div class="pt-6 flex items-center gap-2"><Checkbox :model-value="readBool('isOptionalForQualification')" @update:model-value="(v) => writeBool('isOptionalForQualification', v)" /><Label>资质可选</Label></div>
            </div>
            <div class="text-xs text-muted-foreground">
              已选检测参数候选：{{ parameterOptions.length }} 个（M06.F02.I02 关联）
            </div>
          </div>
          <div v-else-if="props.resource === 'parameters'" class="grid grid-cols-3 gap-3">
            <div>
              <Label>单位</Label>
              <Input v-model="form.unit" />
            </div>
            <div>
              <Label for="sourceType">来源类型</Label>
              <Select v-model="form.sourceType">
                <SelectTrigger id="sourceType" class="w-full">
                  <SelectValue placeholder="选择来源类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="official">官方</SelectItem>
                  <SelectItem value="custom">自定义</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div v-else class="grid grid-cols-3 gap-3">
            <div>
              <Label>版本</Label>
              <Input v-model="form.version" />
            </div>
            <div>
              <Label for="status">状态</Label>
              <Select v-model="form.status">
                <SelectTrigger id="status" class="w-full">
                  <SelectValue placeholder="选择状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">现行</SelectItem>
                  <SelectItem value="superseded">被替代</SelectItem>
                  <SelectItem value="draft">草案</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>来源文件</Label>
              <Input v-model="form.sourceDocumentId" />
            </div>
          </div>
          <div>
            <Label>排序</Label>
            <Input v-model.number="form.sortOrder" type="number" />
          </div>
        </div>
        <DialogFooter class="px-6 py-3 justify-end gap-2 border-t">
          <Button variant="outline" @click="closeDialog">
            取消
          </Button>
          <Button :data-fn="fnCreate" @click="submitForm">
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

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
      <p v-if="deleteError" role="alert" class="mt-2 text-destructive">{{ deleteError }}</p>
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
