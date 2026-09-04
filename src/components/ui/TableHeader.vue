<script setup lang="ts">
// TableHeader 原语 — shadcn-vue 风格（react 仓 table.tsx 的 Vue 版）。
//
// div-based role="rowgroup"（语义等价于 <thead>）。
import { cn } from "@/lib/utils";

defineProps<{ class?: string }>();
</script>

<template>
  <div :class="cn('[&_div[role=row]]:border-b', $attrs.class as string)" role="rowgroup">
    <slot />
  </div>
</template>
