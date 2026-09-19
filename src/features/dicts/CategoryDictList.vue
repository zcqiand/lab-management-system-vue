<script setup lang="ts">
// CategoryDictList — react/src/features/dicts/CategoryDictList.tsx 的镜像
// （Sprint 2 Batch 1 — 基础数据 4 码表 M04.F06/F07/F08/F09）。
//
// 翻译规则（docs/conventions/sprint-roadmap.md「翻译规则」）4 条：
//   1. JSX → template 语法：className → class
//   2. hook → composition：useState → ref、useEffect → onMounted/watch
//   3. Context → Pinia store（本组件无 auth 依赖，跳过）
//   4. react-query → vue-query（本组件保持手动 fetch + axios，与 nextjs 仓
//      数据层 1:1；vue-query 适合 list 组件，本批暂不引入，避免新依赖）
//   5. data-fn / @entry / fnTest 完全不动（data-fn 属性挂 4 条 dataFn；
//      vue fnTest 用测试名 `[Mxx.Fyy.Izz] 描述` 形式，不挂 @entry）
//
// 与 nextjs 仓的差异（vue 仓减法）：
//   - 拖拽排序：本批不装 vue-draggable-plus（nextjs 用 @dnd-kit/sortable，
//     是 React 专用，vue 没有 1:1 对应；sortOrder 字段保留只读显示，
//     后续装 vue-draggable-plus 后再补 onDragEnd 持久化）
//   - 数据获取走全局 axios（http-client.ts 已装 baseUrl + Bearer 拦截器）
//   - 弹窗用 src/components/app/ConfirmDialog.vue 替代 react ConfirmModal
//
// 功能 ID 映射（与 nextjs 一致）：
//   M04.F06.I01 / I02 / I03  → models
//   M04.F07.I01 / I02 / I03  → specifications
//   M04.F08.I01 / I02 / I03  → grades
//   M04.F09.I01 / I02 / I03  → brands

import { computed, onMounted, ref, watch } from "vue";
import type { AxiosResponse } from "axios";
import {
  catalogCreateBrand,
  catalogCreateGrade,
  catalogCreateModel,
  catalogCreateSpec,
  catalogDeleteBrand,
  catalogDeleteGrade,
  catalogDeleteModel,
  catalogDeleteSpec,
  catalogListBrands,
  catalogListGrades,
  catalogListModels,
  catalogListSpecs,
  catalogUpdateBrand,
  catalogUpdateGrade,
  catalogUpdateModel,
  catalogUpdateSpec,
} from "@/api/endpoints/inspection-catalog/inspection-catalog";
import { inspectionDictionaryListObjects } from "@/api/endpoints/inspection-dictionary/inspection-dictionary";
import type {
  InspectionModel,
  InspectionObject,
} from "@/api/endpoints/model";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";
import Select from "@/components/ui/Select.vue";
import SelectTrigger from "@/components/ui/SelectTrigger.vue";
import SelectContent from "@/components/ui/SelectContent.vue";
import SelectItem from "@/components/ui/SelectItem.vue";
import SelectValue from "@/components/ui/SelectValue.vue";
import ConfirmDialog from "@/components/app/ConfirmDialog.vue";
import PageLoading from "@/components/app/PageLoading.vue";
import { unwrapListResponse } from "@/lib/responses";

// 类型走 orval 生成物（src/api/endpoints/model）——SSOT 是 shared TypeSpec。
// 契约：4 码表实体以 code 为主键（无 id），CreateCatalogEntryRequest.code 必填。
type DictItem = InspectionModel;

type CatalogListParams = {
  page?: number;
  pageSize?: number;
  inspectionObjectCode?: string;
  keyword?: string;
};

/** prop endpoint 值保持 /models 等字面量（测试与 4 个 page wrapper 共用），映射到 orval 具名函数 */
type CatalogResource = "/models" | "/specifications" | "/grades" | "/brands";

const CATALOG_API: Record<
  CatalogResource,
  {
    list: (params?: CatalogListParams) => Promise<AxiosResponse<{ items: unknown[] }>>;
    create: (body: {
      code: string;
      inspectionObjectCode?: string;
      name: string;
      remark?: string;
      sortOrder?: number;
    }) => Promise<AxiosResponse<unknown>>;
    update: (
      code: string,
      body: { inspectionObjectCode?: string; name?: string; remark?: string; sortOrder?: number },
    ) => Promise<AxiosResponse<unknown>>;
    remove: (code: string) => Promise<AxiosResponse<void>>;
  }
> = {
  "/models": {
    list: catalogListModels,
    create: catalogCreateModel,
    update: catalogUpdateModel,
    remove: catalogDeleteModel,
  },
  "/specifications": {
    list: catalogListSpecs,
    create: catalogCreateSpec,
    update: catalogUpdateSpec,
    remove: catalogDeleteSpec,
  },
  "/grades": {
    list: catalogListGrades,
    create: catalogCreateGrade,
    update: catalogUpdateGrade,
    remove: catalogDeleteGrade,
  },
  "/brands": {
    list: catalogListBrands,
    create: catalogCreateBrand,
    update: catalogUpdateBrand,
    remove: catalogDeleteBrand,
  },
};

interface Props {
  /** 码表资源：/models /specifications /grades /brands */
  endpoint: CatalogResource;
  title: string;
  hint?: string;
  /** 功能 ID（用于 data-fn 入口标记），格式 Mxx.Fyy.Izz */
  dataFn?: string;
  /** 新建按钮 data-fn */
  createDataFn?: string;
  /** 编辑按钮 data-fn */
  editDataFn?: string;
  /** 删除按钮 data-fn */
  deleteDataFn?: string;
}

const props = defineProps<Props>();

const objects = ref<InspectionObject[]>([]);
const selectedCode = ref<string | null>(null);
const list = ref<DictItem[]>([]);
// B6 加载态：首屏即视为加载中（首帧不渲染空壳；refetch 时列表保持旧数据，不回空页）
const loading = ref(true);
// B6 加载态：检测项目树未就绪也视为整页加载中（树与列表都到齐才出界面）
const objectsReady = ref(false);
// B6 加载态：首载未到齐前整页 PageLoading
const showPageLoading = computed(
  () => (loading.value || !objectsReady.value) && list.value.length === 0,
);
const errorMsg = ref<string | null>(null);

const formOpen = ref(false);
const editing = ref<DictItem | null>(null);
const formCode = ref("");
const formObject = ref("");
const formName = ref("");
const formRemark = ref("");
const saving = ref(false);
const deleteTarget = ref<DictItem | null>(null);
const deleting = ref(false);

const selectedObject = computed(
  () => objects.value.find((o) => o.code === selectedCode.value) ?? null,
);

const api = computed(() => CATALOG_API[props.endpoint]);

async function fetchList(): Promise<void> {
  if (!selectedCode.value) {
    list.value = [];
    // B6 加载态：loading 初值改 true 后，无选中对象分支也必须落定，避免整页加载态卡死
    loading.value = false;
    return;
  }
  loading.value = true;
  errorMsg.value = null;
  try {
    const res = await api.value.list({
      page: 1,
      pageSize: 200,
      inspectionObjectCode: selectedCode.value,
    });
    const items = [...unwrapListResponse<DictItem>(res).items];
    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    list.value = items;
  } catch (e) {
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      (e instanceof Error ? e.message : "加载失败");
    errorMsg.value = msg;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  try {
    const r = await inspectionDictionaryListObjects({ page: 1, pageSize: 200 });
    const items = unwrapListResponse<InspectionObject>(r).items;
    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    objects.value = items;
    if (!selectedCode.value) selectedCode.value = items[0]?.code ?? null;
  } catch {
    /* 主表形状由 msw shape adapter 提供，失败静默 */
  } finally {
    // B6 加载态：树就绪即落定；树失败且无选中对象时也要解除整页门控
    objectsReady.value = true;
    if (!selectedCode.value) loading.value = false;
  }
});

watch(selectedCode, async () => {
  await fetchList();
});

function openCreate(): void {
  editing.value = null;
  formCode.value = "";
  formObject.value = selectedCode.value ?? objects.value[0]?.code ?? "";
  formName.value = "";
  formRemark.value = "";
  formOpen.value = true;
}

function openEdit(item: DictItem): void {
  editing.value = item;
  formCode.value = item.code;
  formObject.value = item.inspectionObjectCode ?? "";
  formName.value = item.name;
  formRemark.value = item.remark ?? "";
  formOpen.value = true;
}

async function handleSave(): Promise<void> {
  // 契约 code 必填（复合主键维度：码表 code + 检测项目）
  if (!formCode.value.trim() || !formObject.value || !formName.value.trim()) return;
  saving.value = true;
  errorMsg.value = null;
  try {
    if (editing.value) {
      await api.value.update(editing.value.code, {
        inspectionObjectCode: formObject.value,
        name: formName.value.trim(),
        remark: formRemark.value,
      });
    } else {
      await api.value.create({
        code: formCode.value.trim(),
        inspectionObjectCode: formObject.value,
        name: formName.value.trim(),
        remark: formRemark.value,
      });
    }
    formOpen.value = false;
    await fetchList();
  } catch (e) {
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "保存失败";
    errorMsg.value = msg;
  } finally {
    saving.value = false;
  }
}

async function handleDelete(): Promise<void> {
  if (!deleteTarget.value) return;
  deleting.value = true;
  try {
    await api.value.remove(deleteTarget.value.code);
    deleteTarget.value = null;
    await fetchList();
  } catch (e) {
    const msg =
      (e as { response?: { data?: { message?: string } } })?.response?.data?.message ??
      "删除失败";
    errorMsg.value = msg;
  } finally {
    deleting.value = false;
  }
}

function dialogTitle(): string {
  return `${editing.value ? "编辑" : "新建"}${props.title.replace(/(管理|维护)/, "")}`;
}
</script>

<template>
  <!-- B6 加载态：树 + 列表都到齐才出界面，不渲染空壳 -->
  <PageLoading v-if="showPageLoading" />
  <div v-else class="flex min-h-0 flex-1 flex-col" :data-fn="dataFn">
    <div class="flex shrink-0 items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold">{{ title }}</h2>
        <p v-if="hint" class="mt-1 text-xs text-muted-foreground">{{ hint }}</p>
      </div>
      <Button
        :data-fn="createDataFn"
        :disabled="!selectedCode && objects.length === 0"
        class="bg-info hover:bg-info/90 disabled:cursor-not-allowed"
        @click="openCreate"
      >
        新建
      </Button>
    </div>

    <div
      v-if="errorMsg"
      role="alert"
      class="rounded bg-destructive/10 p-2 text-sm text-destructive"
    >
      {{ errorMsg }}
    </div>

    <div class="grid flex-1 min-h-0 grid-cols-[240px_1fr] gap-4">
      <!-- 左侧：检测项目树 -->
      <aside
        class="flex min-h-0 flex-col overflow-hidden rounded bg-white shadow"
      >
        <div
          class="shrink-0 border-b bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"
        >
          检测项目
        </div>
        <ul class="min-h-0 flex-1 overflow-y-auto">
          <li
            v-if="objects.length === 0"
            class="px-3 py-4 text-center text-sm text-muted-foreground"
          >
            暂无检测项目
          </li>
          <li v-for="o in objects" :key="o.code">
            <button
              type="button"
              class="flex w-full items-center gap-1 border-l-2 px-3 py-2 text-left text-sm"
              :class="
                o.code === selectedCode
                  ? 'border-info bg-info/10 font-medium text-info'
                  : 'border-transparent text-foreground hover:bg-muted'
              "
              @click="selectedCode = o.code"
            >
              <span class="text-muted-foreground">▸</span>
              <span class="truncate">{{ o.name }}</span>
            </button>
          </li>
        </ul>
      </aside>

      <!-- 右侧：可排序列表（拖拽功能 Sprint 后续迭代，sortOrder 字段保留只读） -->
      <section
        class="flex min-h-0 flex-col overflow-hidden rounded bg-white shadow"
      >
        <div
          class="flex shrink-0 items-center justify-between border-b bg-muted px-3 py-2 text-xs font-semibold text-muted-foreground"
        >
          <span>
            <template v-if="selectedObject">
              <span class="text-muted-foreground">▸</span> {{ selectedObject.name }}
            </template>
            <template v-else>请选择左侧检测项目</template>
          </span>
        </div>

        <div
          v-if="loading && list.length === 0"
          class="px-4 py-8 text-center text-sm text-muted-foreground"
        >
          加载中...
        </div>
        <div
          v-else-if="!loading && list.length === 0"
          class="px-4 py-8 text-center text-sm text-muted-foreground"
        >
          {{ selectedCode ? "暂无数据" : "请先选择左侧检测项目" }}
        </div>

        <ul
          v-else
          :data-testid="`${endpoint}-list`"
          class="flex-1 overflow-y-auto"
        >
          <li
            v-for="item in list"
            :key="item.code"
            :data-testid="`row-${item.code}`"
            class="flex items-center border-b bg-white px-3 py-2 text-sm last:border-b-0 hover:bg-muted"
          >
            <span
              :data-testid="`sort-${item.code}`"
              class="w-12 text-center text-xs tabular-nums text-muted-foreground"
            >
              {{ item.sortOrder ?? "-" }}
            </span>
            <span class="flex-1 truncate">{{ item.name }}</span>
            <span class="flex-1 truncate text-xs text-muted-foreground">
              {{ item.remark ?? "" }}
            </span>
            <div class="space-x-2">
              <Button
                variant="link"
                :data-fn="editDataFn"
                class="text-primary hover:underline"
                @click="openEdit(item)"
              >
                编辑
              </Button>
              <Button
                variant="link"
                :data-fn="deleteDataFn"
                class="text-destructive hover:underline"
                @click="deleteTarget = item"
              >
                删除
              </Button>
            </div>
          </li>
        </ul>
      </section>
    </div>

    <ConfirmDialog
      :open="formOpen"
      :title="dialogTitle()"
      :loading="saving"
      confirm-text="保存"
      :danger="false"
      :onConfirm="handleSave"
      :onCancel="() => (formOpen = false)"
    >
      <div class="space-y-3 text-left text-sm">
        <div>
          <Label class="mb-1 block text-xs text-muted-foreground">
            检测项目
          </Label>
          <Select v-model="formObject" :disabled="!!editing">
            <SelectTrigger class="w-full rounded border px-2 py-1.5 disabled:bg-muted">
              <SelectValue placeholder="请选择检测项目" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="o in objects" :key="o.code" :value="o.code">
                {{ o.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label class="mb-1 block text-xs text-muted-foreground">
            编码 *
          </Label>
          <Input
            v-model="formCode"
            :disabled="!!editing"
            class="disabled:bg-muted"
          />
        </div>
        <div>
          <Label class="mb-1 block text-xs text-muted-foreground">
            名称 *
          </Label>
          <Input
            v-model="formName"
          />
        </div>
        <div>
          <Label class="mb-1 block text-xs text-muted-foreground">
            备注
          </Label>
          <Input
            v-model="formRemark"
          />
        </div>
      </div>
    </ConfirmDialog>

    <ConfirmDialog
      :open="deleteTarget !== null"
      title="删除确认"
      :message="`确定删除「${deleteTarget?.name ?? ''}」？`"
      :loading="deleting"
      confirm-text="确认"
      :onConfirm="handleDelete"
      :onCancel="() => (deleteTarget = null)"
    />
  </div>
</template>