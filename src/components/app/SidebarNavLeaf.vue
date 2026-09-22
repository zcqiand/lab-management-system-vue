<!-- SidebarNavLeaf — 侧栏树节点（递归）。镜像 react 仓 sidebar-nav.tsx NavLeaf：
  group 节点渲染「可收/展分区头（标题 + 子项计数 + chevron）」+ 子项列表；
  leaf 节点渲染导航项。与 react 版的差异（镜像改造点，2026-09-23 深色侧栏重设计）：
  - leaf 有 path 时用 router-link <a>（vue 仓惯例 + 现有 href 断言），无 path
    （action 节点）渲染禁用 button —— react 是统一 button + navigate。
  - Icon() fallback（icon 查不到 ICON_MAP → 等宽占位 span）语义一致。
-->
<script setup lang="ts">
import { computed, h, type Component, type FunctionalComponent } from "vue";
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import {
  Activity,
  Beaker,
  ClipboardList,
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  PackageSearch,
  ScrollText,
  Settings,
  Shield,
  TestTube2,
  Wrench,
} from "lucide-vue-next";
import { cn } from "@/lib/utils";
import type { MenuNode } from "@/composables/use-backend-menus";

// key 与 react ICON_MAP 同为 PascalCase；saas 菜单 icon 是小写枚举（"file"），
// 查不到走占位 span —— 与 react 行为一致，不是缺陷。
const ICON_MAP: Record<string, Component> = {
  Activity,
  Beaker,
  ClipboardList,
  Database,
  FileText,
  FlaskConical,
  LayoutDashboard,
  ListChecks,
  PackageSearch,
  ScrollText,
  Settings,
  Shield,
  TestTube2,
  Wrench,
};

// 镜像 react Icon()：命中渲染图标，查不到渲染等宽占位 span（保持缩进对齐）
const NavIcon: FunctionalComponent<{ name?: string }> = (props) => {
  const C = props.name ? ICON_MAP[props.name] : undefined;
  if (C) return h(C, { class: "size-4" });
  return h("span", { class: "size-4 inline-block", "aria-hidden": "true" });
};
NavIcon.props = { name: { type: String, required: false } };

const props = defineProps<{
  node: MenuNode;
  depth: number;
  /** 全树 walk 出的选中 code（SidebarNav 上提计算，镜像 react） */
  selected: string | null;
  collapsed: boolean;
  groupCollapsed: Set<string>;
}>();

const emit = defineEmits<{ "toggle-group": [code: string] }>();

const isLeaf = computed(() => props.node.children.length === 0);
const isSelected = computed(() => props.selected === props.node.code);
const isGroupCollapsed = computed(() => props.groupCollapsed.has(props.node.code));
const toPath = computed(() => (props.node.path === "" ? "/" : (props.node.path as string)));
</script>

<template>
  <!-- group 节点：分区标题（可点击收/展）+ 子项列表 -->
  <div
    v-if="!isLeaf"
    class="mb-3"
    :data-testid="`sidebar-group-${node.code}`"
    :data-group-collapsed="isGroupCollapsed"
  >
    <div
      :class="
        cn(
          'flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/40 border-t border-white/5 first:border-t-0',
          collapsed ? 'justify-center px-0 pt-3 pb-1' : 'px-3 pt-3 pb-1',
        )
      "
    >
      <button
        v-if="!collapsed"
        type="button"
        class="flex min-w-0 flex-1 items-center gap-1.5 text-left transition-colors hover:text-white/80"
        :title="isGroupCollapsed ? `展开「${node.name}」` : `收起「${node.name}」`"
        :aria-label="isGroupCollapsed ? `展开「${node.name}」` : `收起「${node.name}」`"
        :aria-expanded="!isGroupCollapsed"
        :data-testid="`sidebar-group-toggle-${node.code}`"
        @click="emit('toggle-group', node.code)"
      >
        <NavIcon :name="node.icon" />
        <span class="truncate">{{ node.name }}</span>
        <span class="ml-auto inline-flex items-center text-white/30">
          <span class="mr-1 text-[9px] tabular-nums">{{ node.children.length }}</span>
          <svg
            aria-hidden="true"
            width="10"
            height="10"
            viewBox="0 0 10 10"
            :class="cn('transition-transform duration-150', isGroupCollapsed && '-rotate-90')"
          >
            <path
              d="M2 3.5 L5 7 L8 3.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
      </button>
      <!-- icon-only 模式：只有图标，hover title 提示整组（连子项） -->
      <span v-else :title="`${node.name} · ${node.children.length} 项`">
        <NavIcon :name="node.icon" />
      </span>
    </div>
    <div v-if="!isGroupCollapsed" class="space-y-0.5">
      <SidebarNavLeaf
        v-for="child in node.children"
        :key="child.id"
        :node="child"
        :depth="depth + 1"
        :selected="selected"
        :collapsed="collapsed"
        :group-collapsed="groupCollapsed"
        @toggle-group="emit('toggle-group', $event)"
      />
    </div>
  </div>

  <!-- leaf 节点（page / action）：深层时缩进 + 左侧 connector -->
  <div
    v-else
    class="relative"
    :style="{ marginLeft: !collapsed && depth > 0 ? `${depth * 0.875}rem` : '0' }"
  >
    <div
      v-if="depth > 0 && !collapsed"
      aria-hidden="true"
      class="absolute bottom-0 left-3 top-0 w-px bg-white/10"
    />
    <router-link
      v-if="node.path !== undefined"
      :to="toPath"
      :data-fn="`m-${node.code}`"
      :data-testid="`sidebar-item-${node.code}`"
      :title="collapsed ? node.name : undefined"
      :aria-label="collapsed ? node.name : undefined"
      :class="
        cn(
          'relative flex items-center gap-2 rounded text-sm transition-colors',
          collapsed ? 'justify-center px-0 py-2' : 'w-full px-3 py-1.5 text-left',
          isSelected
            ? 'bg-slate-700 text-white'
            : 'text-white/70 hover:bg-white/10 hover:text-white',
        )
      "
    >
      <NavIcon :name="node.icon" />
      <span v-if="!collapsed" class="truncate">{{ node.name }}</span>
    </router-link>
    <button
      v-else
      type="button"
      disabled
      :data-fn="`m-${node.code}`"
      :data-testid="`sidebar-item-${node.code}`"
      :title="collapsed ? node.name : undefined"
      :aria-label="collapsed ? node.name : undefined"
      :class="
        cn(
          'relative flex w-full items-center gap-2 rounded text-left text-sm opacity-50 transition-colors',
          collapsed ? 'justify-center px-0 py-2' : 'px-3 py-1.5',
          isSelected ? 'bg-slate-700 text-white' : 'text-white/70',
        )
      "
    >
      <NavIcon :name="node.icon" />
      <span v-if="!collapsed" class="truncate">{{ node.name }}</span>
    </button>
  </div>
</template>
