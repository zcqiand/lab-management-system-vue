<script setup lang="ts">
// @entry M06.F07.I02
// ReportNameLinkDialog — M06.F07.I02（报告名称↔标准/参数关联），镜像 react 仓。
//
// 报告名称列表行内「关联」按钮的弹窗：两段列表（标准 role=TESTING / 参数），
// toggle POST/DELETE /api/report-names/links/{standard,parameter}。
import { computed, onMounted, ref, watch } from "vue";
import axios from "axios";
import { API_ROUTES } from "@/api/legacy-client";

interface StdRow {
  code: string;
  name?: string;
  status?: string;
}

interface ParamRow {
  code: string;
  name?: string;
  unit?: string;
}

interface StdLink {
  reportNameCode: string;
  inspectionStandardCode: string;
  role: "TESTING" | "JUDGMENT";
}

interface ParamLink {
  reportNameCode: string;
  inspectionParameterCode: string;
}

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
      axios.get<{ items: StdRow[] }>(API_ROUTES["/inspection-standards"], {
        params: { page: 1, pageSize: 500 },
      }),
      axios.get<{ items: ParamRow[] }>(API_ROUTES["/inspection-parameters"], {
        params: { page: 1, pageSize: 500 },
      }),
      axios.get(API_ROUTES["/inspection-report-name-standards"], {
        params: { reportNameCode: props.reportNameCode },
      }),
      axios.get(API_ROUTES["/inspection-report-name-parameters"], {
        params: { reportNameCode: props.reportNameCode },
      }),
    ]);
    standards.value = stdRes.data.items ?? [];
    parameters.value = paramRes.data.items ?? [];
    stdLinks.value = toList<StdLink>(stdLinkRes.data as StdLink[] | { items?: StdLink[] });
    paramLinks.value = new Set(
      toList<ParamLink>(paramLinkRes.data as ParamLink[] | { items?: ParamLink[] }).map(
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
      await axios.delete(API_ROUTES["/inspection-report-name-standards"], {
        data: { reportNameCode: props.reportNameCode, inspectionStandardCode: stdCode, role: "TESTING" },
      });
      stdLinks.value = stdLinks.value.filter(
        (l) => !(l.inspectionStandardCode === stdCode && l.role === "TESTING"),
      );
    } else {
      await axios.post(API_ROUTES["/inspection-report-name-standards"], {
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
      await axios.delete(API_ROUTES["/inspection-report-name-parameters"], {
        data: { reportNameCode: props.reportNameCode, inspectionParameterCode: paramCode },
      });
      const next = new Set(paramLinks.value);
      next.delete(paramCode);
      paramLinks.value = next;
    } else {
      await axios.post(API_ROUTES["/inspection-report-name-parameters"], {
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
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      @click.self="close"
    >
      <div class="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div class="px-6 py-4 border-b">
          <h2 class="text-lg font-semibold">关联维护 — {{ reportNameLabel }}</h2>
          <p class="text-sm text-slate-500">
            报告名称 {{ reportNameCode }}；标准 {{ stdCount }} 项 / 参数 {{ paramCount }} 项（toggle 即时保存）
          </p>
        </div>
        <div class="px-6 py-4 space-y-4">
          <p v-if="loading" class="text-sm text-slate-500 py-4">加载中…</p>
          <template v-else>
            <section>
              <h4 class="text-sm font-semibold mb-2">检测标准（role=检测）</h4>
              <div
                v-for="s in standards"
                :key="s.code"
                class="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50"
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
                  :class="isStdOn(s.code) ? 'border text-slate-700' : 'bg-slate-900 text-white'"
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
                class="flex items-center justify-between px-2 py-1 rounded hover:bg-slate-50"
              >
                <span class="text-sm">
                  <span class="font-mono text-xs">{{ p.code }}</span>
                  {{ p.name }}
                  <span v-if="p.unit" class="text-xs text-slate-500">({{ p.unit }})</span>
                </span>
                <button
                  data-fn="M06.F07.I02"
                  :aria-label="`${paramLinks.has(p.code) ? '解除参数' : '关联参数'} ${p.code}`"
                  :disabled="busy === p.code"
                  class="px-2 py-1 rounded text-xs"
                  :class="paramLinks.has(p.code) ? 'border text-slate-700' : 'bg-slate-900 text-white'"
                  @click="toggleParam(p.code)"
                >
                  {{ paramLinks.has(p.code) ? "解除" : "关联" }}
                </button>
              </div>
            </section>
          </template>
        </div>
      </div>
    </div>
  </Teleport>
</template>
