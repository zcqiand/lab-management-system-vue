<script setup lang="ts">
// TableBody 原语 — shadcn-vue 风格（react 仓 table.tsx 的 Vue 版）。
//
// div-based role="rowgroup"（语义等价于 <tbody>）。
// [&_div[role=row]:last-child]:border-0 让最后一行无下边框。
import { cn } from "@/lib/utils";

defineProps<{ class?: string }>();
</script>

<template>
  <div :class="cn('[&_div[role=row]:last-child]:border-0', $attrs.class as string)" role="rowgroup">
    <slot />
  </div>
</template>
