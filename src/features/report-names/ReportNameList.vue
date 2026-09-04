<script setup lang="ts">
// M06.F07 报告名称维护 — 列表 + Dialog 弹窗（基础信息 + extFields 模板）
//
// 镜像 react 仓 src/features/report-names/ReportNameList.tsx（vue 翻译规则 4 条）。
// 简化版：单 Tab 而非 5 Tab；extFields JSON 数组走 textarea 字符串，提交时 JSON.parse。
//
// 功能 ID：
//   M06.F07.I01 列表（行 data-fn + 新建/编辑按钮 data-fn）
//   M06.F07.I02 关联（F07↔标准/参数）→ 行内「关联」→ ReportNameLinkDialog
import { computed, onMounted, reactive, ref } from "vue";
import axios from "axios";
import { API_ROUTES } from "@/api/legacy-client";
import Button from "@/components/ui/Button.vue";
import ConfirmDialog from "@/components/app/ConfirmDialog.vue";
import ReportNameLinkDialog from "@/features/report-names/ReportNameLinkDialog.vue";
import { unwrapListResponse } from "@/lib/responses";

// 内联类型（vue 仓无 src/types/ 目录；镜像 react/src/types/inspection/inspection-report-name.ts）
interface InspectionReportName {
  id: string;
  code: string;
  name: string;
  fullName?: string;
  templatePath?: string;
  description?: string;
  extFields?: unknown[];
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; id: string };

interface FormState {
  code: string;
  name: string;
  fullName: string;
  templatePath: string;
  description: string;
  sortOrder: number;
  extFieldsText: string;
}

const EMPTY_FORM: FormState = {
  code: "",
  name: "",
  fullName: "",
  templatePath: "",
  description: "",
  sortOrder: 0,
  extFieldsText: "[]",
};

const items = ref<InspectionReportName[]>([]);
const total = ref(0);
const keyword = ref("");
const mode = ref<Mode>({ kind: "idle" });
const loading = ref(false);
const deleteTarget = ref<InspectionReportName | null>(null);
// M06.F07.I02 报告名称↔标准/参数关联弹窗
const linking = ref<InspectionReportName | null>(null);
const form = reactive<FormState>({ ...EMPTY_FORM });

const editing = computed<InspectionReportName | null>(() => {
  if (mode.value.kind !== "edit") return null;
  const id = (mode.value as { kind: "edit"; id: string }).id;
  return items.value.find((r) => r.id === id) ?? null;
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await axios.get<unknown>(API_ROUTES["/report-names"], {
      params: {
        ...(keyword.value ? { keyword: keyword.value } : {}),
        page: 1,
        pageSize: 50,
      },
    });
    const { items: listItems, total: listTotal } = unwrapListResponse<InspectionReportName>(res);
    items.value = listItems;
    total.value = listTotal;
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  void load();
});

function openCreate(): void {
  Object.assign(form, EMPTY_FORM);
  mode.value = { kind: "create" };
}
function openEdit(r: InspectionReportName): void {
  Object.assign(form, {
    code: r.code,
    name: r.name,
    fullName: r.fullName ?? "",
    templatePath: r.templatePath ?? "",
    description: r.description ?? "",
    sortOrder: r.sortOrder,
    extFieldsText: JSON.stringify(r.extFields ?? [], null, 2),
  });
  mode.value = { kind: "edit", id: r.id };
}
function closeDialog(): void {
  mode.value = { kind: "idle" };
}

// 暴露给 template 的告警通道（vue 模板表达式作用域不识别 window/globalThis）
function alertError(msg: string): void {
  // eslint-disable-next-line no-alert
  globalThis.alert(msg);
}

function parseExtFields(text: string): { ok: true; value: unknown[] } | { ok: false; error: string } {
  try {
    const v: unknown = JSON.parse(text);
    if (!Array.isArray(v)) return { ok: false, error: "extFields 必须是 JSON 数组" };
    return { ok: true, value: v };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

async function submitForm(): Promise<void> {
  const parsed = parseExtFields(form.extFieldsText);
  if (!parsed.ok) {
    alertError(`extFields 解析失败：${parsed.error}`);
    return;
  }
  const payload = {
    code: form.code,
    name: form.name,
    fullName: form.fullName || undefined,
    templatePath: form.templatePath || undefined,
    description: form.description || undefined,
    sortOrder: form.sortOrder,
    extFields: parsed.value,
  };
  try {
    if (mode.value.kind === "create") {
      await axios.post(API_ROUTES["/report-names"], payload);
    } else if (mode.value.kind === "edit") {
      const id = (mode.value as { kind: "edit"; id: string }).id;
      await axios.put(`${API_ROUTES["/report-names"]}/${id}`, payload);
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
        <h1 class="text-2xl font-semibold">报告名称维护</h1>
        <p class="text-sm text-slate-500">
          M06.F07 报告名称 + extFields 模板（数据来自 lab-msw fixtures）
        </p>
      </div>
      <!-- @entry M06.F07.I01 新建报告名称按钮 -->
      <Button data-fn="M06.F07.I01" @click="openCreate">
        新建报告名称
      </Button>
    </div>

    <div class="mb-4 flex gap-2">
      <input
        v-model="keyword"
        class="border rounded h-9 px-2 text-sm bg-white max-w-sm"
        placeholder="按编码 / 名称搜索"
        @keydown.enter="load"
      />
      <Button variant="outline" @click="load">
        搜索
      </Button>
    </div>

    <Teleport to="body">
      <div
        v-if="mode.kind === 'create' || mode.kind === 'edit'"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        @click.self="closeDialog"
      >
        <div class="bg-white rounded-lg shadow-xl w-full max-w-xl">
          <div class="px-6 py-4 border-b">
            <h2 class="text-lg font-semibold">
              {{
                mode.kind === "create"
                  ? "新建报告名称"
                  : `编辑报告名称 ${editing?.code ?? ""}`
              }}
            </h2>
            <p class="text-sm text-slate-500">
              创建一条报告名称记录。extFields 为 JSON 数组格式，例如
              <code>[{`{key:"x",label:"X"}`}]</code>。
            </p>
          </div>
          <div class="px-6 py-4 max-h-[60vh] overflow-y-auto">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label class="text-sm font-medium">编码 *</label>
                <input v-model="form.code" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div>
                <label class="text-sm font-medium">简称 *</label>
                <input v-model="form.name" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div>
                <label class="text-sm font-medium">全称</label>
                <input v-model="form.fullName" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div>
                <label class="text-sm font-medium">模板路径</label>
                <input v-model="form.templatePath" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div>
                <label class="text-sm font-medium">排序</label>
                <input v-model.number="form.sortOrder" type="number" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div class="md:col-span-2">
                <label class="text-sm font-medium">描述</label>
                <input v-model="form.description" class="border rounded h-9 px-2 text-sm bg-white w-full" />
              </div>
              <div class="md:col-span-2">
                <label class="text-sm font-medium">扩展属性 extFields（JSON 数组）</label>
                <textarea
                  v-model="form.extFieldsText"
                  class="border rounded w-full h-32 px-2 py-1 text-sm font-mono bg-white"
                />
              </div>
            </div>
          </div>
          <div class="px-6 py-3 flex justify-end border-t">
            <!-- @entry M06.F07.I01 表单内保存 -->
            <Button data-fn="M06.F07.I01" @click="submitForm">
              {{ mode.kind === "create" ? "创建" : "保存" }}
            </Button>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmDialog
      :open="deleteTarget !== null"
      title="删除报告名称"
      :message="
        deleteTarget
          ? `确认删除报告名称 ${deleteTarget.code}？此操作不可撤销。`
          : ''
      "
      @confirm="
        async () => {
          if (!deleteTarget) return;
          const t = deleteTarget;
          deleteTarget = null;
          try {
            await axios.delete(`${API_ROUTES['/report-names']}/${t.id}`);
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
        <div class="font-semibold text-base">
          报告名称列表（{{ total || "…" }}）
        </div>
        <div v-if="loading" class="text-xs text-slate-400">加载中…</div>
      </div>
      <table class="w-full text-sm">
        <thead class="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th class="px-4 py-2 text-left">编码</th>
            <th class="px-4 py-2 text-left">简称</th>
            <th class="px-4 py-2 text-left">全称</th>
            <th class="px-4 py-2 text-left">模板</th>
            <th class="px-4 py-2 text-left">排序</th>
            <th class="px-4 py-2 text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="items.length === 0 && !loading">
            <td colspan="6" class="px-4 py-8 text-center text-slate-400">
              （无数据）
            </td>
          </tr>
          <tr
            v-for="r in items"
            :key="r.id"
            data-fn="M06.F07.I01"
            class="border-t hover:bg-slate-50"
          >
            <td class="px-4 py-2 font-mono text-xs">{{ r.code }}</td>
            <td class="px-4 py-2">{{ r.name }}</td>
            <td class="px-4 py-2">{{ r.fullName ?? "—" }}</td>
            <td class="px-4 py-2 font-mono text-xs">{{ r.templatePath ?? "—" }}</td>
            <td class="px-4 py-2 text-xs text-slate-500">{{ r.sortOrder }}</td>
            <td class="px-4 py-2 text-right">
              <Button
                size="sm"
                variant="outline"
                data-fn="M06.F07.I02"
                @click="linking = r"
              >
                关联
              </Button>
              <Button
                size="sm"
                variant="outline"
                class="ml-2"
                @click="openEdit(r)"
              >
                编辑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                class="ml-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                @click="deleteTarget = r"
              >
                删除
              </Button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- M06.F07.I02 报告名称↔标准/参数关联弹窗 -->
    <ReportNameLinkDialog
      v-if="linking"
      :open="linking !== null"
      :report-name-code="linking.code"
      :report-name-label="linking.name"
      @update:open="(v: boolean) => { if (!v) linking = null; }"
      @changed="load"
    />
  </div>
</template>