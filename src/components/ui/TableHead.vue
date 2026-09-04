<script setup lang="ts">
// TableHead 原语 — shadcn-vue 风格（react 仓 table.tsx 的 Vue 版）。
//
// Phase 2a-1 起对齐 shadcn-vue 契约：
//   - `class` prop 走 cn() 最后一位（tailwind-merge 让调用方胜出）
//   - inheritAttrs:false + v-bind="$attrs" → `data-fn` 落到真实 <div>
//   - div-based role="columnheader"（语义等价于 <th>）
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: string }>();
</script>

<template>
  <div
    v-bind="$attrs"
    :class="
      cn(
        'h-10 px-2 text-left align-middle font-medium text-muted-foreground',
        props.class,
      )
    "
    role="columnheader"
  >
    <slot />
  </div>
</template>
