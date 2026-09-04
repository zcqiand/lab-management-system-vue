<script setup lang="ts">
// SelectValue 原语 — shadcn-vue 风格。
//
// Phase 2d-1 起对齐 shadcn-vue 契约：
//   - 底层是 reka-ui SelectValue，从 SelectRoot context 读当前值并展示
//   - placeholder 在 value 为空 / undefined 时显示
//   - 通常嵌在 <SelectTrigger> 默认插槽里用；也可独立展示当前选中项文本
//   - textContent prop：reka-ui 把 SelectItem 的 SelectItemText 文本配对回写到
//     SelectValue（这是为什么 SelectItem 里要包 SelectItemText）
import { SelectValue } from "reka-ui";

defineProps<{
  placeholder?: string;
}>();
</script>

<template>
  <SelectValue :placeholder="placeholder">
    <template v-if="$slots.default">
      <slot />
    </template>
  </SelectValue>
</template>
