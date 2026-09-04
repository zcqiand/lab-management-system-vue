<script setup lang="ts">
// SelectContent 原语 — shadcn-vue 风格。
//
// Phase 2d-1 起对齐 shadcn-vue 契约：
//   - 底层是 reka-ui SelectPortal + SelectContent + SelectViewport
//   - reka-ui 默认走 Popper（浮动定位）；portal 把内容送进 document.body
//   - 内含 SelectViewport（滚动容器）
//   - `class` prop 走 cn() 末尾，调用方胜出（tailwind-merge）
//   - inheritAttrs:false + v-bind="$attrs" → `aria-label` 等落到真实 <div>
//     （注：role="listbox" 由 reka-ui 自动挂上）
import { cn } from "@/lib/utils";
import { SelectContent, SelectPortal, SelectViewport } from "reka-ui";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  class?: string;
  position?: "popper" | "item-aligned";
}>();
</script>

<template>
  <SelectPortal>
    <SelectContent
      v-bind="$attrs"
      :position="props.position ?? 'popper'"
      :class="
        cn(
          'relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          props.position === 'popper'
            ? 'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1'
            : '',
          props.class,
        )
      "
    >
      <SelectViewport
        :class="
          cn(
            'p-1',
            props.position === 'popper' ? 'h-[var(--reka-select-trigger-height)] w-full min-w-[var(--reka-select-trigger-width)]' : '',
          )
        "
      >
        <slot />
      </SelectViewport>
    </SelectContent>
  </SelectPortal>
</template>
