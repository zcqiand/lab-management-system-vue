<!-- SidebarNav — 深色分组侧栏（2026-09-23 重设计，镜像 react 仓
  sidebar-nav.tsx）。旧版「平铺浅色侧栏 + AppShell flattenToNavItems」在用户
  验收里判「白凸凸」——与 react 镜像源视觉断裂，本版按 react 设计全量镜像：
  bg-slate-900 深色骨架、品牌头（渐变 Logo + appName + 版本号）、分组树递归
  （SidebarNavLeaf）、全局收起/展开 + localStorage 持久化、footer slots。
  菜单数据源仍由消费方传入（AppShell → useBackendMenus，ADR-0009）。

  与 react 版的差异（镜像改造点）：
  - leaf 有 path 用 router-link <a>（vue 仓惯例），无 path 渲染禁用 button
  - usePathname → useRoute().path；localStorage 读写直接裸调（本仓 auth.ts 同款）
-->
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { cn } from "@/lib/utils";
import { APP_VERSION } from "@/lib/app-meta";
import SidebarNavLeaf from "@/components/app/SidebarNavLeaf.vue";
import type { MenuNode } from "@/composables/use-backend-menus";

const props = withDefaults(
  defineProps<{
    /** 菜单树。null 表示还在加载（消费方 AppShell 的 useBackendMenus 未落定），
     *  渲染「（菜单加载中）」空状态；[] 渲染「（无菜单）」。 */
    menus: MenuNode[] | null;
    appCode: string;
    appName?: string | null;
  }>(),
  { appName: null },
);

const route = useRoute();

// 选中态：递归遍历菜单树（不限深度），按 pathname 前缀匹配（镜像 react
// selectedCode；V016 seed 里 dash 是顶层 leaf，全树 walk 才能正确高亮）。
const selectedCode = computed<string | null>(() => {
  if (!props.menus) return null;
  const findMatch = (nodes: MenuNode[]): string | null => {
    for (const n of nodes) {
      if (n.path !== undefined) {
        if (n.path === "" && route.path === "/") return n.code;
        if (n.path !== "" && (route.path === n.path || route.path.startsWith(`${n.path}/`))) {
          return n.code;
        }
      }
      if (n.children.length > 0) {
        const hit = findMatch(n.children);
        if (hit) return hit;
      }
    }
    return null;
  };
  return findMatch(props.menus);
});

// 全局收起/展开：持久化到 localStorage（按 appCode 区分），刷新保留
const SIDEBAR_KEY = computed(() => `sidebar.collapsed.${props.appCode}`);
const collapsed = ref(false);
const hydrated = ref(false);
onMounted(() => {
  try {
    if (window.localStorage.getItem(SIDEBAR_KEY.value) === "1") collapsed.value = true;
  } catch {
    /* 无 storage 时忽略 */
  }
  hydrated.value = true;
});
const effectiveCollapsed = computed(() => (hydrated.value ? collapsed.value : false));
function toggleCollapsed(): void {
  collapsed.value = !collapsed.value;
  try {
    window.localStorage.setItem(SIDEBAR_KEY.value, collapsed.value ? "1" : "0");
  } catch {
    /* ignore */
  }
}

// 分组收起/展开：每个 group code 一项，按 appCode 持久化到 JSON 字符串。
// 仅展开态生效（icon-only 模式全部铺开）。
const GROUPS_KEY = computed(() => `sidebar.groups.${props.appCode}`);
const groupCollapsed = ref<Set<string>>(new Set());
onMounted(() => {
  try {
    const raw = window.localStorage.getItem(GROUPS_KEY.value);
    if (raw) {
      const arr: unknown = JSON.parse(raw);
      if (Array.isArray(arr)) {
        groupCollapsed.value = new Set(arr.filter((x): x is string => typeof x === "string"));
      }
    }
  } catch {
    /* ignore */
  }
});
function toggleGroup(code: string): void {
  const next = new Set(groupCollapsed.value);
  if (next.has(code)) next.delete(code);
  else next.add(code);
  groupCollapsed.value = next;
  try {
    window.localStorage.setItem(GROUPS_KEY.value, JSON.stringify(Array.from(next)));
  } catch {
    /* ignore */
  }
}
</script>

<template>
  <aside
    :class="
      cn(
        'shrink-0 bg-slate-900 text-white flex flex-col transition-[width] duration-200',
        effectiveCollapsed ? 'w-14' : 'w-60',
      )
    "
    :data-collapsed="effectiveCollapsed"
    data-fn="M01.F04.I01"
    data-testid="sidebar-nav"
    aria-label="主导航"
  >
    <!-- 品牌头：渐变 Logo + 应用名/appCode + 收起 toggle -->
    <div
      :class="
        cn(
          'flex items-center py-4 border-b border-white/10',
          effectiveCollapsed ? 'px-2 justify-center' : 'px-5',
        )
      "
    >
      <div :class="cn('flex items-center gap-2', effectiveCollapsed && 'justify-center')">
        <div
          class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-linear-to-br from-blue-500 to-purple-600 text-sm font-bold"
        >
          L
        </div>
        <div v-if="!effectiveCollapsed" class="min-w-0 flex-1">
          <h1 class="truncate text-sm font-bold leading-tight" data-testid="sidebar-app-name">
            {{ appName ?? "Lab-Management" }}
          </h1>
          <!-- 2026-09-23 用户裁定：appCode 行换版本号（appCode 仍作为 prop 参与本地持久化 key） -->
          <p class="truncate text-xs text-white/50" data-testid="sidebar-app-version">
            v{{ APP_VERSION }}
          </p>
        </div>
      </div>
      <button
        type="button"
        class="ml-auto inline-flex h-7 w-7 shrink-0 items-center justify-center rounded text-white/60 hover:bg-white/10 hover:text-white"
        :class="cn(effectiveCollapsed && 'ml-0')"
        :title="effectiveCollapsed ? '展开菜单' : '收起菜单'"
        :aria-label="effectiveCollapsed ? '展开菜单' : '收起菜单'"
        :aria-expanded="!effectiveCollapsed"
        data-testid="sidebar-toggle"
        @click="toggleCollapsed"
      >
        <ChevronRight v-if="effectiveCollapsed" class="size-4" />
        <ChevronLeft v-else class="size-4" />
      </button>
    </div>

    <!-- 菜单树 -->
    <nav class="flex-1 overflow-y-auto px-2 py-3" aria-label="菜单树">
      <p
        v-if="menus === null"
        :class="cn('text-xs text-white/40', effectiveCollapsed ? 'text-center' : 'px-3')"
        data-testid="sidebar-menus-loading"
      >
        {{ effectiveCollapsed ? "…" : "（菜单加载中）" }}
      </p>
      <p
        v-else-if="menus.length === 0"
        :class="cn('text-xs text-white/40', effectiveCollapsed ? 'text-center' : 'px-3')"
      >
        {{ effectiveCollapsed ? "—" : "（无菜单）" }}
      </p>
      <template v-else>
        <SidebarNavLeaf
          v-for="node in menus"
          :key="node.id"
          :node="node"
          :depth="0"
          :selected="selectedCode"
          :collapsed="effectiveCollapsed"
          :group-collapsed="effectiveCollapsed ? new Set<string>() : groupCollapsed"
          @toggle-group="toggleGroup"
        />
      </template>
    </nav>

    <!-- footer：主操作 / 次要操作（2026-09-23 用户裁定：版本文案删除，
         版本号只在品牌头 sidebar-app-version 一处展示） -->
    <div class="border-t border-white/10" />
    <div :class="cn('space-y-2', effectiveCollapsed ? 'flex flex-col items-center p-2' : 'p-3')">
      <slot name="footerAction" />
      <slot name="footerExtras" />
    </div>
  </aside>
</template>
