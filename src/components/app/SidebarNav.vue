<script setup lang="ts">
// SidebarNav — 侧边导航原语。菜单项数据源由消费方传入（2026-08-25 起
// AppShell 走 useBackendMenus 拉 lab 后端 /api/auth/menus，ADR-0009）。
//
// icon 渲染三段式：slot 优先 → iconMap fallback → 空。后端拉来的菜单树 icon 是
// 字符串（如 "LayoutDashboard"），消费方在 AppShell 传 iconMap 即可；旧的 slot
// 模式（每个图标单独 <template #xxx>）保留给希望显式控制的场景。
import { useRoute, useRouter } from "vue-router";
import type { Component } from "vue";
import { cn } from "@/lib/utils";
import Button from "@/components/ui/Button.vue";

export interface NavItem {
  label: string;
  /** 路由项：站内路径 */
  path?: string;
  /** 动作项（如退出登录）：由消费方注入 onAction */
  action?: string;
  /** 图标 key（icons 插槽内容由消费方传入，避免组件库绑死 lucide 全集） */
  icon?: string;
  /** 功能 ID 锚点（L5 扫描用，如 M01.F05.I04；路由项一般不需要） */
  dataFn?: string;
}

withDefaults(
  defineProps<{
    items: NavItem[];
    /** 图标字符串 → 组件的映射（如 { LayoutDashboard }）。来自 saas 的 icon
     *  字段按这里查表；查不到则 fallback 到空（不报错）。 */
    iconMap?: Record<string, Component>;
  }>(),
  { iconMap: () => ({}) },
);

const emit = defineEmits<{ action: [key: string] }>();

const route = useRoute();
const router = useRouter();

function isActive(item: NavItem): boolean {
  if (!item.path) return false;
  return item.path === "/" ? route.path === "/" : route.path.startsWith(item.path);
}
function navigate(item: NavItem): void {
  if (item.path) void router.push(item.path);
}
</script>

<template>
  <nav class="flex flex-col gap-1 p-3">
    <template v-for="item in items" :key="item.label">
      <component
        :is="'router-link'"
        v-if="item.path"
        :to="item.path"
        :class="
          cn(
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent',
            isActive(item)
              ? 'bg-accent text-accent-foreground font-medium'
              : 'text-muted-foreground',
          )
        "
      >
        <slot :name="item.icon ?? 'none'">
          <component
            :is="item.icon ? iconMap[item.icon] : undefined"
            v-if="item.icon && iconMap[item.icon]"
            class="size-4"
          />
        </slot>
        {{ item.label }}
      </component>
      <Button
        v-else
        type="button"
        variant="ghost"
        :data-fn="item.dataFn"
        :aria-label="item.label"
        class="text-muted-foreground hover:bg-accent w-full justify-start gap-2 rounded-md px-3 py-2 text-sm"
        @click="item.action && emit('action', item.action)"
      >
        <slot :name="item.icon ?? 'none'">
          <component
            :is="item.icon ? iconMap[item.icon] : undefined"
            v-if="item.icon && iconMap[item.icon]"
            class="size-4"
          />
        </slot>
        {{ item.label }}
      </Button>
    </template>
  </nav>
</template>
