<script setup lang="ts">
// @entry M06.F03.I02
// ParameterStandardLinkDialog — M06.F03.I02（参数↔标准关联），镜像 react 仓。
//
// parameters 列表行内「关联标准」按钮的弹窗：列出全部检测标准（含状态），
// toggle 该参数的关联（POST/DELETE /api/inspection/links/standard-parameter）。
import { computed, onMounted, ref, watch } from "vue";
import axios from "axios";
import { API_ROUTES } from "@/api/legacy-client";
import { unwrapListResponse } from "@/lib/responses";
import Dialog from "@/components/ui/Dialog.vue";
import DialogContent from "@/components/ui/DialogContent.vue";
import DialogDescription from "@/components/ui/DialogDescription.vue";
import DialogHeader from "@/components/ui/DialogHeader.vue";
import DialogTitle from "@/components/ui/DialogTitle.vue";
import Table from "@/components/ui/Table.vue";
import TableBody from "@/components/ui/TableBody.vue";
import TableCell from "@/components/ui/TableCell.vue";
import TableHead from "@/components/ui/TableHead.vue";
import TableHeader from "@/components/ui/TableHeader.vue";
import TableRow from "@/components/ui/TableRow.vue";

// 内联类型（vue 仓类型内联惯例）
interface StdRow {
  code: string;
  name?: string;
  version?: string;
  status?: string;
}

interface StdParamLink {
  inspectionStandardCode: string;
  inspectionParameterCode: string;
}

const props = defineProps<{
  open: boolean;
  parameterCode: string;
  parameterName: string;
}>();

const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "changed"): void;
}>();

const STANDARD_STATUS_CN: Record<string, string> = {
  active: "现行",
  superseded: "被替代",
  draft: "草案",
};

const standards = ref<StdRow[]>([]);
const linked = ref<Set<string>>(new Set());
const loading = ref(false);
const busyCode = ref<string | null>(null);

const linkedCount = computed(() => linked.value.size);

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [stdRes, linkRes] = await Promise.all([
      axios.get<unknown>(API_ROUTES["/inspection-standards"], {
        params: { page: 1, pageSize: 500 },
      }),
      axios.get<unknown>(API_ROUTES["/inspection-standard-parameters"]),
    ]);
    const linkList = unwrapListResponse<StdParamLink>(linkRes).items;
    standards.value = unwrapListResponse<StdRow>(stdRes).items;
    linked.value = new Set(
      linkList
        .filter((l) => l.inspectionParameterCode === props.parameterCode)
        .map((l) => l.inspectionStandardCode),
    );
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (props.open) void load();
});
watch(
  () => [props.open, props.parameterCode],
  ([open]) => {
    if (open) void load();
  },
);

async function toggle(stdCode: string): Promise<void> {
  busyCode.value = stdCode;
  try {
    if (linked.value.has(stdCode)) {
      await axios.delete(API_ROUTES["/inspection-standard-parameters"], {
        data: { inspectionStandardCode: stdCode, inspectionParameterCode: props.parameterCode },
      });
      const next = new Set(linked.value);
      next.delete(stdCode);
      linked.value = next;
    } else {
      await axios.post(API_ROUTES["/inspection-standard-parameters"], {
        inspectionStandardCode: stdCode,
        inspectionParameterCode: props.parameterCode,
      });
      linked.value = new Set(linked.value).add(stdCode);
    }
    emit("changed");
  } finally {
    busyCode.value = null;
  }
}

function statusCn(s: string | undefined): string {
  return STANDARD_STATUS_CN[s ?? ""] ?? s ?? "-";
}

function close(): void {
  emit("update:open", false);
}
</script>

<template>
  <Dialog
    :open="open"
    @update:open="
      (v: boolean) => {
        if (!v) close();
      }
    "
  >
    <DialogContent class="max-w-2xl gap-0 p-0 max-h-[80vh] overflow-y-auto">
      <DialogHeader class="px-6 py-4 border-b gap-1.5">
        <DialogTitle>关联标准 — {{ parameterName }}</DialogTitle>
        <DialogDescription>
          参数编码 {{ parameterCode }}；已关联 {{ linkedCount }} 项（toggle 即时保存）
        </DialogDescription>
      </DialogHeader>
      <div class="px-6 py-4">
        <p v-if="loading" class="text-sm text-muted-foreground py-4">加载中…</p>
        <Table v-else class="w-full text-sm">
          <TableHeader class="bg-muted text-muted-foreground">
            <TableRow>
              <TableHead class="px-3 py-2 text-left">标准编码</TableHead>
              <TableHead class="px-3 py-2 text-left">名称</TableHead>
              <TableHead class="px-3 py-2 text-left">版本</TableHead>
              <TableHead class="px-3 py-2 text-left">状态</TableHead>
              <TableHead class="px-3 py-2 text-left w-24">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="s in standards" :key="s.code" class="border-t hover:bg-muted">
              <TableCell class="px-3 py-2 font-mono text-xs">{{ s.code }}</TableCell>
              <TableCell class="px-3 py-2">{{ s.name ?? "-" }}</TableCell>
              <TableCell class="px-3 py-2 text-xs">{{ s.version ?? "-" }}</TableCell>
              <TableCell class="px-3 py-2">
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs"
                  :class="s.status === 'active' ? 'bg-primary text-primary-foreground' : 'border text-muted-foreground'"
                >
                  {{ statusCn(s.status) }}
                </span>
              </TableCell>
              <TableCell class="px-3 py-2">
                <button
                  :data-fn="'M06.F03.I02'"
                  :aria-label="`${linked.has(s.code) ? '解除关联' : '关联'} ${s.code}`"
                  :disabled="busyCode === s.code"
                  class="px-2 py-1 rounded text-xs"
                  :class="linked.has(s.code) ? 'border text-foreground' : 'bg-primary text-primary-foreground'"
                  @click="toggle(s.code)"
                >
                  {{ linked.has(s.code) ? "解除关联" : "关联" }}
                </button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </DialogContent>
  </Dialog>
</template>
