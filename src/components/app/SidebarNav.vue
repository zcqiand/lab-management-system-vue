<script setup lang="ts">
// SidebarNav — 侧边导航原语。菜单项数据源由消费方传入（Sprint 2 接 GET /auth/menus）。
import { useRoute, useRouter } from "vue-router";
import { cn } from "@/lib/utils";

export interface NavItem {
  label: string;
  /** 路由项：站内路径 */
  path?: string;
  /** 动作项（如退出登录）：由消费方注入 onAction */
  action?: string;
  /** 图标 key（icons 插槽内容由消费方传入，避免组件库绑死 lucide 全集） */
  icon?: string;
}

defineProps<{
  items: NavItem[];
}>();

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
        <slot :name="item.icon ?? 'none'" />
        {{ item.label }}
      </component>
      <button
        v-else
        type="button"
        class="text-muted-foreground hover:bg-accent flex items-center gap-2 rounded-md px-3 py-2 text-sm"
        @click="item.action && emit('action', item.action)"
      >
        <slot :name="item.icon ?? 'none'" />
        {{ item.label }}
      </button>
    </template>
  </nav>
</template>
