<script setup lang="ts">
// SelectTrigger 原语 — shadcn-vue 风格。
//
// Phase 2d-1 起对齐 shadcn-vue 契约：
//   - 底层是 reka-ui SelectTrigger，自渲染 `<button type="button" role="combobox">`
//   - 内置 ChevronDown icon 作 SelectIcon（替代 native select 的下拉箭头）
//   - 默认插槽是 SelectValue（值显示）；调用方不传则读 SelectRoot 的 modelValue
//     经 reka-ui context 自动展示
//   - `class` prop 走 cn() 末尾，调用方胜出（tailwind-merge）
//   - inheritAttrs:false + v-bind="$attrs" → `aria-label` / `data-fn` 落到真实 <button>
//   - `:disabled` 无条件绑定（undefined 时 Vue 自己移除属性）
import { cn } from "@/lib/utils";
import { SelectIcon, SelectTrigger } from "reka-ui";
import { ChevronDown } from "lucide-vue-next";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  class?: string;
  disabled?: boolean;
  placeholder?: string;
}>();
</script>

<template>
  <SelectTrigger
    v-bind="$attrs"
    :disabled="props.disabled ?? undefined"
    :class="
      cn(
        'flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1',
        props.class,
      )
    "
  >
    <slot>
      <span data-slot="select-value">
        <slot name="value" />
      </span>
    </slot>
    <SelectIcon as-child>
      <ChevronDown class="h-4 w-4 opacity-50" />
    </SelectIcon>
  </SelectTrigger>
</template>
