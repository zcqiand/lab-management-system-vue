<script setup lang="ts">
// Input 原语 — shadcn/ui 风格（react 仓 input.tsx 的 Vue 版）。
//
// Phase 0 起对齐 shadcn-vue 契约：
//   - `class` prop 走 cn() 最后一位（tailwind-merge 让调用方胜出）
//   - inheritAttrs:false + v-bind="$attrs" → `data-fn` / `aria-*` 落到真实 <input>
//   - `:disabled` **无条件绑定**（不做 v-if / 条件拼接）：disabled 为真时属性必须落到
//     DOM，同级 Label 的 `peer-disabled:` 选择器才会命中。传 undefined 时 Vue 自己移除属性。
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    type?: string;
    id?: string;
    autocomplete?: string;
    required?: boolean;
    placeholder?: string;
    autofocus?: boolean;
    disabled?: boolean;
    modelValue?: string;
    class?: string;
  }>(),
  { type: "text", modelValue: "" },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  keydown: [event: KeyboardEvent];
}>();
</script>

<template>
  <input
    v-bind="$attrs"
    :id="id"
    :type="type"
    :autocomplete="autocomplete"
    :required="required"
    :placeholder="placeholder"
    :autofocus="autofocus"
    :disabled="disabled ?? undefined"
    :value="props.modelValue"
    :class="
      cn(
        'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
        props.class,
      )
    "
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    @keydown="$emit('keydown', $event)"
  />
</template>
