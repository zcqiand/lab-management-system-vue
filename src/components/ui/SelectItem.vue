<script setup lang="ts">
// SelectItem 原语 — shadcn-vue 风格。
//
// Phase 2d-1 起对齐 shadcn-vue 契约：
//   - 底层是 reka-ui SelectItem + SelectItemText + SelectItemIndicator
//   - reka-ui 自动给选中项挂 data-state="checked" + 选中的 icon 显示
//   - 内置 Check icon 作选中指示（left-2 绝对定位）
//   - `class` prop 走 cn() 末尾，调用方胜出（tailwind-merge）
//   - inheritAttrs:false + v-bind="$attrs" → `aria-label` / `data-fn` 落到真实 <div>
//     （role="option" 由 reka-ui 自动挂上）
//   - text prop 走 SelectItemText（与 reka-ui value 双向同步显示文本）
//     不传时 fallback 默认插槽文本
import { cn } from "@/lib/utils";
import { SelectItem, SelectItemIndicator, SelectItemText } from "reka-ui";
import { Check } from "lucide-vue-next";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  value: string | number;
  disabled?: boolean;
  text?: string;
  class?: string;
}>();
</script>

<template>
  <SelectItem
    v-bind="$attrs"
    :value="props.value"
    :disabled="props.disabled ?? undefined"
    :class="
      cn(
        'relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        props.class,
      )
    "
  >
    <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectItemIndicator>
        <Check class="h-4 w-4" />
      </SelectItemIndicator>
    </span>
    <SelectItemText>{{ props.text ?? "" }}<slot /></SelectItemText>
  </SelectItem>
</template>
