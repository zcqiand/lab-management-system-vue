<script setup lang="ts">
// Select 原语 — shadcn-vue 风格（react 仓 select.tsx 的 Vue 版）。
//
// Phase 2d-1 起对齐 shadcn-vue 契约：
//   - 底层是 reka-ui SelectRoot，自渲染 `<button role="combobox">`（触发器）
//     + portal 到 `<div role="listbox">`（菜单）
//   - 这是 shadcn-vue 的复合原语：单一组件包不下（trigger / content / item
//     必须共享 SelectRoot context），所以拆 5 个 sub-component：
//     <Select> = Root（slot 子树放 trigger + content + items）
//     <SelectTrigger> = 触发按钮（含 SelectValue 显示当前值 + ChevronDown icon）
//     <SelectContent> = portal 容器
//     <SelectItem> = 选项（自带 Check icon 指示器）
//     <SelectValue> = 触发器里的值显示（trigger 默认插槽时用）
//   - `class` prop 走 cn() 末尾，调用方胜出（tailwind-merge）
//   - inheritAttrs:false + v-bind="$attrs" → `aria-label` / `data-fn` 落到真实 <button>
//   - modelValue 是 string | number；emit 时 reka-ui 给原值透传
import { SelectRoot } from "reka-ui";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  modelValue?: string | number;
  defaultValue?: string | number;
  disabled?: boolean;
  name?: string;
  required?: boolean;
}>();

defineEmits<{
  "update:modelValue": [value: string | number];
  "update:open": [value: boolean];
}>();
</script>

<template>
  <SelectRoot
    v-bind="$attrs"
    :model-value="props.modelValue"
    :default-value="props.defaultValue"
    :disabled="props.disabled ?? undefined"
    :name="props.name"
    :required="props.required ?? undefined"
    @update:model-value="$emit('update:modelValue', $event)"
    @update:open="$emit('update:open', $event)"
  >
    <slot />
  </SelectRoot>
</template>
