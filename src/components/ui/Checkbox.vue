<script setup lang="ts">
// Checkbox 原语 — shadcn-vue 风格（react 仓 checkbox.tsx 的 Vue 版）。
//
// Phase 2b 起对齐 shadcn-vue 契约：
//   - 底层是 reka-ui CheckboxRoot / CheckboxIndicator；
//     Root 默认 as="button"，自渲染 `<button type="button" role="checkbox" aria-checked>`，
//     aria-checked 三态：true / false / mixed（indeterminate）
//   - `class` prop 走 cn() 末尾，调用方胜出（tailwind-merge）
//   - inheritAttrs:false + v-bind="$attrs" → `aria-label` / `data-fn` 落到真实 <button>
//   - `:disabled` **无条件绑定**（与 <Input> 一致；undefined 时 Vue 自己移除属性，
//     让 Label 的 `peer-disabled:` 选择器只在真 disabled 时命中）
//   - modelValue 三态：boolean | "indeterminate"；emit 时 reka-ui 给 boolean
//     （indeterminate 仅视觉，业务 v-model 通常走 boolean）
import { cn } from "@/lib/utils";
import { Check } from "lucide-vue-next";
import { CheckboxIndicator, CheckboxRoot } from "reka-ui";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  modelValue?: boolean | "indeterminate";
  class?: string;
  disabled?: boolean;
}>();

defineEmits<{
  "update:modelValue": [value: boolean | "indeterminate"];
}>();
</script>

<template>
  <CheckboxRoot
    v-bind="$attrs"
    :model-value="props.modelValue"
    :disabled="props.disabled ?? undefined"
    :class="
      cn(
        'peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-primary-foreground',
        props.class,
      )
    "
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <CheckboxIndicator class="flex h-full w-full items-center justify-center text-current">
      <Check class="h-3 w-3" />
    </CheckboxIndicator>
  </CheckboxRoot>
</template>