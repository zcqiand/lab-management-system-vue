<script setup lang="ts">
// AlertDialogContent 原语 — shadcn-vue 风格。
//
// 打包 AlertDialogPortal + AlertDialogOverlay + AlertDialogContent 三层。
// 与 DialogContent 的差异：
//   - 无关闭 X（alert 必须显式选择）
//   - reka-ui 自己 preventDefault 了 pointerDownOutside → 点遮罩不关
//   - role="alertdialog"（reka-ui 自动挂）
// inheritAttrs:false + v-bind="$attrs" → `data-testid` 等落到真实
// div[role=alertdialog]；`class` prop 走 cn() 末尾（调用方胜出）。
import { cn } from "@/lib/utils";
import { AlertDialogContent, AlertDialogOverlay, AlertDialogPortal } from "reka-ui";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: string }>();

defineEmits<{
  escapeKeyDown: [event: KeyboardEvent];
  openAutoFocus: [event: Event];
  closeAutoFocus: [event: Event];
}>();
</script>

<template>
  <AlertDialogPortal>
    <AlertDialogOverlay
      class="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <AlertDialogContent
      v-bind="$attrs"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
          props.class,
        )
      "
      @escape-key-down="$emit('escapeKeyDown', $event)"
      @open-auto-focus="$emit('openAutoFocus', $event)"
      @close-auto-focus="$emit('closeAutoFocus', $event)"
    >
      <slot />
    </AlertDialogContent>
  </AlertDialogPortal>
</template>
