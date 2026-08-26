<script setup lang="ts">
// DropdownMenu 原语 — reka-ui（shadcn-vue primitive 底座，2026-08-27 起）。
// 早期是手写点外关闭版；迁移到 reka-ui 的 DropdownMenuRoot/Trigger/Portal/
// Content，键盘导航 / 焦点陷阱 / ESC / 点外关闭由库提供。
// 公共接口不变：trigger 插槽 + 默认插槽（菜单体）。
import { DropdownMenuRoot, DropdownMenuTrigger, DropdownMenuPortal, DropdownMenuContent } from "reka-ui";
import { cn } from "@/lib/utils";

defineProps<{ contentClass?: string }>();
// open 受控可选（不传 = 非受控，reka-ui 自管开关态）
const open = defineModel<boolean>("open");
</script>

<template>
  <DropdownMenuRoot v-model:open="open">
    <DropdownMenuTrigger as-child>
      <slot name="trigger" />
    </DropdownMenuTrigger>
    <DropdownMenuPortal>
      <DropdownMenuContent
        :class="
          cn(
            'bg-popover text-popover-foreground absolute right-0 z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md',
            contentClass,
          )
        "
      >
        <slot />
      </DropdownMenuContent>
    </DropdownMenuPortal>
  </DropdownMenuRoot>
</template>
