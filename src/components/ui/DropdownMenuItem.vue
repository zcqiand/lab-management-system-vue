<script setup lang="ts">
// DropdownMenuItem — 见 DropdownMenu.vue（reka-ui 底座）。高亮/禁用/键盘
// 导航由 reka-ui DropdownMenuItem 提供，点击自动关闭菜单。
// 导入改名 RekaItem：避免与本文件组件名（模板隐式自引用）冲突。
import { DropdownMenuItem as RekaItem } from "reka-ui";
import { cn } from "@/lib/utils";

const props = defineProps<{ testid?: string; disabled?: boolean; class?: string }>();
</script>

<template>
  <RekaItem
    :disabled="disabled"
    :class="
      cn(
        'flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50',
        props.class,
      )
    "
    :data-testid="testid"
  >
    <slot />
  </RekaItem>
</template>
