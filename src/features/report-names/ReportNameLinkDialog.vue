<script setup lang="ts">
// @entry M06.F07.I02
// ReportNameLinkDialog — M06.F07.I02（报告名称↔标准/参数关联），镜像 react 仓。
//
// 报告名称列表行内「关联」按钮的弹窗：两段列表（标准 role=TESTING / 参数），
// toggle POST/DELETE /api/report-names/links/{standard,parameter}。
import { computed, onMounted, ref, watch } from "vue";
import {
  reportNamesLinkReportNameParameter,
  reportNamesLinkReportNameStandard,
  reportNamesListReportNameParameterLinks,
  reportNamesListReportNameStandardLinks,
  reportNamesUnlinkReportNameParameter,
  reportNamesUnlinkReportNameStandard,
} from "@/api/endpoints/report-names/report-names";
import {
  inspectionDictionaryListParameters,
  inspectionDictionaryListStandards,
} from "@/api/endpoints/inspection-dictionary/inspection-dictionary";
import type {
  InspectionParameter,
  InspectionStandard,
  ReportNameParameterLink,
  ReportNameStandardLink,
} from "@/api/endpoints/model";
import Dialog from "@/components/ui/Dialog.vue";
import DialogContent from "@/components/ui/DialogContent.vue";
import DialogDescription from "@/components/ui/DialogDescription.vue";
import DialogHeader from "@/components/ui/DialogHeader.vue";
import DialogTitle from "@/components/ui/DialogTitle.vue";

// 类型走 orval 生成物（src/api/endpoints/model）——SSOT 是 shared TypeSpec。
type StdRow = InspectionStandard;
type ParamRow = InspectionParameter;
type StdLink = ReportNameStandardLink;
type ParamLink = ReportNameParameterLink;

const props = defineProps<{
  open: boolean;
  reportNameCode: string;
  reportNameLabel: string;
}>();

const emit = defineEmits<{
  (e: "update:open", v: boolean): void;
  (e: "changed"): void;
}>();

const standards = ref<StdRow[]>([]);
const parameters = ref<ParamRow[]>([]);
const stdLinks = ref<StdLink[]>([]);
const paramLinks = ref<Set<string>>(new Set());
const loading = ref(false);
const busy = ref<string | null>(null);

const stdCount = computed(
  () => stdLinks.value.filter((l) => l.role === "TESTING").length,
);
const paramCount = computed(() => paramLinks.value.size);

function toList<T>(data: T[] | { items?: T[] }): T[] {
  return Array.isArray(data) ? data : (data.items ?? []);
}

async function load(): Promise<void> {
  loading.value = true;
  try {
    const [stdRes, paramRes, stdLinkRes, paramLinkRes] = await Promise.all([
      inspectionDictionaryListStandards({ page: 1, pageSize: 500 }),
      inspectionDictionaryListParameters({ page: 1, pageSize: 500 }),
      reportNamesListReportNameStandardLinks({ reportNameCode: props.reportNameCode }),
      reportNamesListReportNameParameterLinks({ reportNameCode: props.reportNameCode }),
    ]);
    standards.value = Array.isArray(stdRes.data?.items) ? stdRes.data.items : [];
    parameters.value = Array.isArray(paramRes.data?.items) ? paramRes.data.items : [];
    // 契约 200 是 Page 形状；测试/后端可能回裸数组，toList 双形状兜住
    stdLinks.value = toList<StdLink>(stdLinkRes.data as unknown as StdLink[] | { items?: StdLink[] });
    paramLinks.value = new Set(
      toList<ParamLink>(paramLinkRes.data as unknown as ParamLink[] | { items?: ParamLink[] }).map(
        (l) => l.inspectionParameterCode,
      ),
    );
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (props.open) void load();
});
watch(
  () => [props.open, props.reportNameCode],
  ([open]) => {
    if (open) void load();
  },
);

function isStdOn(code: string): boolean {
  return stdLinks.value.some(
    (l) => l.inspectionStandardCode === code && l.role === "TESTING",
  );
}

async function toggleStd(stdCode: string): Promise<void> {
  busy.value = stdCode;
  try {
    if (isStdOn(stdCode)) {
      await reportNamesUnlinkReportNameStandard({
        reportNameCode: props.reportNameCode,
        inspectionStandardCode: stdCode,
        role: "TESTING",
      });
      stdLinks.value = stdLinks.value.filter(
        (l) => !(l.inspectionStandardCode === stdCode && l.role === "TESTING"),
      );
    } else {
      await reportNamesLinkReportNameStandard({
        reportNameCode: props.reportNameCode,
        inspectionStandardCode: stdCode,
        role: "TESTING",
      });
      stdLinks.value = [
        ...stdLinks.value,
        { reportNameCode: props.reportNameCode, inspectionStandardCode: stdCode, role: "TESTING" },
      ];
    }
    emit("changed");
  } finally {
    busy.value = null;
  }
}

async function toggleParam(paramCode: string): Promise<void> {
  busy.value = paramCode;
  try {
    if (paramLinks.value.has(paramCode)) {
      await reportNamesUnlinkReportNameParameter({
        reportNameCode: props.reportNameCode,
        inspectionParameterCode: paramCode,
      });
      const next = new Set(paramLinks.value);
      next.delete(paramCode);
      paramLinks.value = next;
    } else {
      await reportNamesLinkReportNameParameter({
        reportNameCode: props.reportNameCode,
        inspectionParameterCode: paramCode,
      });
      paramLinks.value = new Set(paramLinks.value).add(paramCode);
    }
    emit("changed");
  } finally {
    busy.value = null;
  }
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
        <DialogTitle>关联维护 — {{ reportNameLabel }}</DialogTitle>
        <DialogDescription>
          报告名称 {{ reportNameCode }}；标准 {{ stdCount }} 项 / 参数 {{ paramCount }} 项（toggle 即时保存）
        </DialogDescription>
      </DialogHeader>
      <div class="px-6 py-4 space-y-4">
        <p v-if="loading" class="text-sm text-muted-foreground py-4">加载中…</p>
        <template v-else>
          <section>
            <h4 class="text-sm font-semibold mb-2">检测标准（role=检测）</h4>
            <div
              v-for="s in standards"
              :key="s.code"
              class="flex items-center justify-between px-2 py-1 rounded hover:bg-muted"
            >
              <span class="text-sm">
                <span class="font-mono text-xs">{{ s.code }}</span>
                {{ s.name }}
              </span>
              <button
                data-fn="M06.F07.I02"
                :aria-label="`${isStdOn(s.code) ? '解除标准' : '关联标准'} ${s.code}`"
                :disabled="busy === s.code"
                class="px-2 py-1 rounded text-xs"
                :class="isStdOn(s.code) ? 'border text-foreground' : 'bg-primary text-primary-foreground'"
                @click="toggleStd(s.code)"
              >
                {{ isStdOn(s.code) ? "解除" : "关联" }}
              </button>
            </div>
          </section>
          <section>
            <h4 class="text-sm font-semibold mb-2">检测参数</h4>
            <div
              v-for="p in parameters"
              :key="p.code"
              class="flex items-center justify-between px-2 py-1 rounded hover:bg-muted"
            >
              <span class="text-sm">
                <span class="font-mono text-xs">{{ p.code }}</span>
                {{ p.name }}
                <span v-if="p.unit" class="text-xs text-muted-foreground">({{ p.unit }})</span>
              </span>
              <button
                data-fn="M06.F07.I02"
                :aria-label="`${paramLinks.has(p.code) ? '解除参数' : '关联参数'} ${p.code}`"
                :disabled="busy === p.code"
                class="px-2 py-1 rounded text-xs"
                :class="paramLinks.has(p.code) ? 'border text-foreground' : 'bg-primary text-primary-foreground'"
                @click="toggleParam(p.code)"
              >
                {{ paramLinks.has(p.code) ? "解除" : "关联" }}
              </button>
            </div>
          </section>
        </template>
      </div>
    </DialogContent>
  </Dialog>
</template>
