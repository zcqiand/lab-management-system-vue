<script setup lang="ts">
// Textarea 原语 — shadcn-vue 风格（react 仓 textarea.tsx 的 Vue 版，手写实现）。
//
// Phase 2c 起对齐 shadcn-vue 契约：
//   - 手写 <textarea>（Phase 1.5 审计原则：原生 tag 就够，避免 selector churn）
//   - `class` prop 走 cn() 末尾，调用方胜出（tailwind-merge）
//   - inheritAttrs:false + v-bind="$attrs" → `data-fn` / `aria-*` 落到真实 <textarea>
//   - `:disabled` / `:rows` / `:placeholder` 无条件绑定（undefined 时 Vue 自己移除属性）
//   - modelValue 是 string；emit 写回 string。调用方做 .number / JSON.parse 等转换。
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  modelValue?: string;
  class?: string;
  rows?: number;
  placeholder?: string;
  disabled?: boolean;
}>();

defineEmits<{
  "update:modelValue": [value: string];
}>();
</script>

<template>
  <textarea
    v-bind="$attrs"
    :value="props.modelValue"
    :rows="props.rows"
    :placeholder="props.placeholder"
    :disabled="props.disabled ?? undefined"
    :class="
      cn(
        'flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
    @input="$emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>