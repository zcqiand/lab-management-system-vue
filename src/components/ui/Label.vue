<script setup lang="ts">
// Label 原语 — shadcn/ui 风格（react 仓 label.tsx 的 Vue 版）。
const props = defineProps<{ for?: string }>();
</script>

<template>
  <label
    :for="props.for"
    class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
  >
    <slot />
  </label>
</template>
