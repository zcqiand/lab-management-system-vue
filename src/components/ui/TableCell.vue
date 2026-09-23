<script setup lang="ts">
// TableCell 原语 — shadcn-vue 风格（react 仓 table.tsx 的 Vue 版）。
//
// Phase 2a-1 起对齐 shadcn-vue 契约：
//   - `class` prop 走 cn() 最后一位（tailwind-merge 让调用方胜出）
//   - inheritAttrs:false + v-bind="$attrs" → `data-fn` 落到真实 <div>
//   - div-based role="cell"（语义等价于 <td>）
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: string }>();
</script>

<template>
  <!-- table-cell mirror react table.tsx td；p-2 px-4 = react 的 px-4 py-2 节奏
       （p-2 保留给 cardsAll.dom.test.ts 的 py-1 覆盖技巧用）。
       不挂全局 whitespace-nowrap——长 token 列会把表撑出视口；日期/操作列
       由调用方按需挂 nowrap -->
  <div v-bind="$attrs" :class="cn('table-cell p-2 px-4 align-middle', props.class)" role="cell">
    <slot />
  </div>
</template>
