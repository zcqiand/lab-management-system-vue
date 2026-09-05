<script setup lang="ts">
// M06.F08 参数界面维护 — 列表 + Dialog 弹窗（基础 + 关联参数）
//
// 镜像 react 仓 src/features/param-interfaces/ParamInterfaceList.tsx（vue 翻译规则 4 条）。
// 简化版：单 Tab 而非 2 Tab；主表 CRUD 先行，关联参数下批补。
//
// 功能 ID：
//   M06.F08.I01 列表 + 新建/编辑/删除（行 data-fn + 按钮 data-fn）
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
import Table from "@/components/ui/Table.vue";
import TableBody from "@/components/ui/TableBody.vue";
import TableCell from "@/components/ui/TableCell.vue";
import TableHead from "@/components/ui/TableHead.vue";
import TableHeader from "@/components/ui/TableHeader.vue";
import TableRow from "@/components/ui/TableRow.vue";
import ConfirmDialog from "@/components/app/ConfirmDialog.vue";
import { unwrapListResponse } from "@/lib/responses";

// 内联类型（vue 仓无 src/types/ 目录；镜像 react/src/types/common/inspection-param-interface.ts）
interface ParamInterfaceRow {
  code: string;
  componentPath: string;
  sortOrder: number;
  config?: Record<string, unknown>;
}

type Mode = { kind: "idle" } | { kind: "create" } | { kind: "edit"; code: string };

interface FormState {
  code: string;
  componentPath: string;
  sortOrder: number;
}

const EMPTY_FORM: FormState = {
  code: "",
  componentPath: "",
  sortOrder: 0,
};

const items = ref<ParamInterfaceRow[]>([]);
const total = ref(0);
const keyword = ref("");
const mode = ref<Mode>({ kind: "idle" });
const loading = ref(false);
const deleteTarget = ref<ParamInterfaceRow | null>(null);
const form = reactive<FormState>({ ...EMPTY_FORM });

const editing = computed<ParamInterfaceRow | null>(() => {
  if (mode.value.kind !== "edit") return null;
  const code = (mode.value as { kind: "edit"; code: string }).code;
  return items.value.find((r) => r.code === code) ?? null;
});

async function load(): Promise<void> {
  loading.value = true;
  try {
    const res = await axios.get<unknown>(API_ROUTES["/inspection-param-interfaces"], {
      params: {
        ...(keyword.value ? { keyword: keyword.value } : {}),
        page: 1,
        pageSize: 50,
      },
    });
    const { items: listItems, total: listTotal } = unwrapListResponse<ParamInterfaceRow>(res);
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
function openEdit(r: ParamInterfaceRow): void {
  Object.assign(form, {
    code: r.code,
    componentPath: r.componentPath,
    sortOrder: r.sortOrder,
  });
  mode.value = { kind: "edit", code: r.code };
}
function closeDialog(): void {
  mode.value = { kind: "idle" };
}

// 暴露给 template 的告警通道（vue 模板表达式作用域不识别 window/globalThis）
function alertError(msg: string): void {
  // eslint-disable-next-line no-alert
  globalThis.alert(msg);
}

async function submitForm(): Promise<void> {
  try {
    if (mode.value.kind === "create") {
      await axios.post(API_ROUTES["/inspection-param-interfaces"], { ...form });
    } else if (mode.value.kind === "edit") {
      const code = (mode.value as { kind: "edit"; code: string }).code;
      await axios.put(
        `${API_ROUTES["/inspection-param-interfaces"]}/${code}`,
        { ...form },
      );
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
        <h1 class="text-2xl font-semibold">参数界面维护</h1>
        <p class="text-sm text-slate-500">
          M06.F08 参数界面（录入卡片模型）
        </p>
      </div>
      <!-- @entry M06.F08.I01 新建参数界面按钮 -->
      <Button data-fn="M06.F08.I01" @click="openCreate">
        新建参数界面
      </Button>
    </div>

    <div class="mb-4 flex gap-2">
      <Input
        v-model="keyword"
        class="max-w-sm"
        placeholder="按编码 / 组件路径搜索"
        @keydown.enter="load"
      />
      <Button variant="outline" @click="load">
        搜索
      </Button>
    </div>

    <Dialog
      :open="mode.kind === 'create' || mode.kind === 'edit'"
      @update:open="
        (v: boolean) => {
          if (!v) closeDialog();
        }
      "
    >
      <DialogContent class="max-w-md gap-0 p-0">
        <DialogHeader class="px-6 py-4 border-b">
          <DialogTitle>
            {{
              mode.kind === "create"
                ? "新建参数界面"
                : `编辑参数界面 ${editing?.code ?? ""}`
            }}
          </DialogTitle>
          <DialogDescription>创建一条参数界面记录（录入卡片模型）。</DialogDescription>
        </DialogHeader>
        <div class="px-6 py-4">
          <div class="grid grid-cols-1 gap-3">
            <div>
              <Label>编码 *</Label>
              <Input
                v-model="form.code"
                :disabled="mode.kind === 'edit'"
                class="disabled:bg-slate-100"
              />
            </div>
            <div>
              <Label>组件路径 *</Label>
              <Input v-model="form.componentPath" />
            </div>
            <div>
              <Label>排序</Label>
              <Input
                v-model.number="form.sortOrder"
                type="number"
              />
            </div>
          </div>
        </div>
        <DialogFooter class="px-6 py-3 border-t">
          <!-- @entry M06.F08.I01 表单内保存 -->
          <Button data-fn="M06.F08.I01" @click="submitForm">
            {{ mode.kind === "create" ? "创建" : "保存" }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <ConfirmDialog
      :open="deleteTarget !== null"
      title="删除参数界面"
      :message="
        deleteTarget
          ? `确认删除参数界面 ${deleteTarget.code}？此操作不可撤销。`
          : ''
      "
      @confirm="
        async () => {
          if (!deleteTarget) return;
          const t = deleteTarget;
          deleteTarget = null;
          try {
            await axios.delete(`${API_ROUTES['/inspection-param-interfaces']}/${t.code}`);
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
          参数界面列表（{{ total || "…" }}）
        </div>
        <div v-if="loading" class="text-xs text-slate-400">加载中…</div>
      </div>
      <Table class="w-full text-sm">
        <TableHeader class="bg-slate-50 text-xs uppercase text-slate-500">
          <TableRow>
            <TableHead class="px-4 py-2 text-left">编码</TableHead>
            <TableHead class="px-4 py-2 text-left">组件路径</TableHead>
            <TableHead class="px-4 py-2 text-left">排序</TableHead>
            <TableHead class="px-4 py-2 text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="items.length === 0 && !loading">
            <TableCell colspan="4" class="px-4 py-8 text-center text-slate-400">
              （无数据）
            </TableCell>
          </TableRow>
          <TableRow
            v-for="r in items"
            :key="r.code"
            data-fn="M06.F08.I01"
            class="border-t hover:bg-slate-50"
          >
            <TableCell class="px-4 py-2 font-mono text-xs">{{ r.code }}</TableCell>
            <TableCell class="px-4 py-2 font-mono text-xs">{{ r.componentPath }}</TableCell>
            <TableCell class="px-4 py-2 text-xs text-slate-500">{{ r.sortOrder }}</TableCell>
            <TableCell class="px-4 py-2 text-right">
              <Button size="sm" variant="outline" @click="openEdit(r)">
                编辑
              </Button>
              <Button
                variant="link"
                class="ml-2 text-destructive hover:underline"
                @click="deleteTarget = r"
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