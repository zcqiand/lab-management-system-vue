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
import axios from "axios";
import { API_ROUTES, type ApiRouteKey } from "@/api/legacy-client";
import ConfirmDialog from "@/components/app/ConfirmDialog.vue";

interface DictItem {
  id: string;
  code: string;
  name: string;
  inspectionObjectCode?: string;
  remark?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

interface InspectionObject {
  code: string;
  name: string;
  sortOrder?: number;
}

interface Props {
  /** API_ROUTES 键：/models /specifications /grades /brands */
  endpoint: ApiRouteKey;
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
const loading = ref(false);
const errorMsg = ref<string | null>(null);

const formOpen = ref(false);
const editing = ref<DictItem | null>(null);
const formObject = ref("");
const formName = ref("");
const formRemark = ref("");
const saving = ref(false);
const deleteTarget = ref<DictItem | null>(null);
const deleting = ref(false);

const selectedObject = computed(
  () => objects.value.find((o) => o.code === selectedCode.value) ?? null,
);

const base = computed(() => API_ROUTES[props.endpoint]);

async function fetchList(): Promise<void> {
  if (!selectedCode.value) {
    list.value = [];
    return;
  }
  loading.value = true;
  errorMsg.value = null;
  try {
    const res = await axios.get<{ items: DictItem[] }>(base.value, {
      params: { page: "1", pageSize: "200", inspectionObjectCode: selectedCode.value },
    });
    const items = [...(Array.isArray(res.data?.items) ? res.data.items : [])];
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
    const r = await axios.get<{ items: InspectionObject[] }>(
      API_ROUTES["/inspection-objects"],
      { params: { page: 1, pageSize: "200" } },
    );
    const items = Array.isArray(r.data?.items) ? r.data.items : [];
    items.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    objects.value = items;
    if (!selectedCode.value) selectedCode.value = items[0]?.code ?? null;
  } catch {
    /* 主表形状由 msw shape adapter 提供，失败静默 */
  }
});

watch(selectedCode, async () => {
  await fetchList();
});

function openCreate(): void {
  editing.value = null;
  formObject.value = selectedCode.value ?? objects.value[0]?.code ?? "";
  formName.value = "";
  formRemark.value = "";
  formOpen.value = true;
}

function openEdit(item: DictItem): void {
  editing.value = item;
  formObject.value = item.inspectionObjectCode ?? "";
  formName.value = item.name;
  formRemark.value = item.remark ?? "";
  formOpen.value = true;
}

async function handleSave(): Promise<void> {
  if (!formObject.value || !formName.value.trim()) return;
  saving.value = true;
  errorMsg.value = null;
  try {
    if (editing.value) {
      await axios.put(`${base.value}/${editing.value.id}`, {
        name: formName.value.trim(),
        remark: formRemark.value,
      });
    } else {
      await axios.post(base.value, {
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
    await axios.delete(`${base.value}/${deleteTarget.value.id}`);
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
  <div class="flex min-h-0 flex-1 flex-col" :data-fn="dataFn">
    <div class="flex shrink-0 items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold">{{ title }}</h2>
        <p v-if="hint" class="mt-1 text-xs text-gray-500">{{ hint }}</p>
      </div>
      <button
        type="button"
        :data-fn="createDataFn"
        :disabled="!selectedCode && objects.length === 0"
        class="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        @click="openCreate"
      >
        新建
      </button>
    </div>

    <div
      v-if="errorMsg"
      role="alert"
      class="rounded bg-red-50 p-2 text-sm text-red-600"
    >
      {{ errorMsg }}
    </div>

    <div class="grid flex-1 min-h-0 grid-cols-[240px_1fr] gap-4">
      <!-- 左侧：检测项目树 -->
      <aside
        class="flex min-h-0 flex-col overflow-hidden rounded bg-white shadow"
      >
        <div
          class="shrink-0 border-b bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500"
        >
          检测项目
        </div>
        <ul class="min-h-0 flex-1 overflow-y-auto">
          <li
            v-if="objects.length === 0"
            class="px-3 py-4 text-center text-sm text-gray-400"
          >
            暂无检测项目
          </li>
          <li v-for="o in objects" :key="o.code">
            <button
              type="button"
              class="flex w-full items-center gap-1 border-l-2 px-3 py-2 text-left text-sm"
              :class="
                o.code === selectedCode
                  ? 'border-blue-600 bg-blue-50 font-medium text-blue-700'
                  : 'border-transparent text-gray-700 hover:bg-gray-50'
              "
              @click="selectedCode = o.code"
            >
              <span class="text-gray-400">▸</span>
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
          class="flex shrink-0 items-center justify-between border-b bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-500"
        >
          <span>
            <template v-if="selectedObject">
              <span class="text-gray-400">▸</span> {{ selectedObject.name }}
            </template>
            <template v-else>请选择左侧检测项目</template>
          </span>
        </div>

        <div
          v-if="loading && list.length === 0"
          class="px-4 py-8 text-center text-sm text-gray-400"
        >
          加载中...
        </div>
        <div
          v-else-if="!loading && list.length === 0"
          class="px-4 py-8 text-center text-sm text-gray-400"
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
            :key="item.id"
            :data-testid="`row-${item.id}`"
            class="flex items-center border-b bg-white px-3 py-2 text-sm last:border-b-0 hover:bg-gray-50"
          >
            <span
              :data-testid="`sort-${item.id}`"
              class="w-12 text-center text-xs tabular-nums text-gray-500"
            >
              {{ item.sortOrder ?? "-" }}
            </span>
            <span class="flex-1 truncate">{{ item.name }}</span>
            <span class="flex-1 truncate text-xs text-gray-500">
              {{ item.remark ?? "" }}
            </span>
            <div class="space-x-2">
              <button
                type="button"
                :data-fn="editDataFn"
                class="px-2 py-1 text-blue-600 hover:underline"
                @click="openEdit(item)"
              >
                编辑
              </button>
              <button
                type="button"
                :data-fn="deleteDataFn"
                class="px-2 py-1 text-red-600 hover:underline"
                @click="deleteTarget = item"
              >
                删除
              </button>
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
          <label class="mb-1 block text-xs font-medium text-gray-600">
            检测项目
          </label>
          <select
            v-model="formObject"
            :disabled="!!editing"
            class="w-full rounded border px-2 py-1.5 disabled:bg-gray-100"
          >
            <option v-for="o in objects" :key="o.code" :value="o.code">
              {{ o.name }}
            </option>
          </select>
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">
            名称
          </label>
          <input
            v-model="formName"
            class="w-full rounded border px-2 py-1.5"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-gray-600">
            备注
          </label>
          <input
            v-model="formRemark"
            class="w-full rounded border px-2 py-1.5"
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