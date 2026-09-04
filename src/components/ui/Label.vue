<script setup lang="ts">
// Label 原语 — shadcn/ui 风格（react 仓 label.tsx 的 Vue 版）。
//
// Phase 0 起对齐 shadcn-vue 契约：`class` prop 走 cn() 最后一位，
// inheritAttrs:false + v-bind="$attrs" 让 `data-fn` 落到真实 <label>。
// 刻意**不**提供「默认插槽包住 Input」的组合模式 —— Label/Input 配对留到 Phase 2d 处理。
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ for?: string; class?: string }>();
</script>

<template>
  <label
    v-bind="$attrs"
    :for="props.for"
    :class="
      cn(
        'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        props.class,
      )
    "
  >
    <slot />
  </label>
</template>
