<script setup lang="ts">
// DialogContent 原语 — shadcn-vue 风格。
//
// Phase 2e-1 起对齐 shadcn-vue 契约：
//   - 一个组件里打包 DialogPortal + DialogOverlay + DialogContent，
//     调用方不用自己拼三层（shadcn-vue 上游也是这么收口的）
//   - reka-ui 自带：ESC 关闭、点遮罩关闭、focus trap、aria-modal / role=dialog、
//     打开时锁 body 滚动 —— 这些是迁移前手写 <Teleport> 版本没有的
//   - 右上角内置关闭 X（shadcn 标准）。`hide-close` 可关掉：
//     少数「必须做出选择」的流程不该给逃生门
//   - inheritAttrs:false + v-bind="$attrs" → `data-testid` / `aria-label` /
//     `data-fn` 落到真实 div[role=dialog]
//   - `class` prop 走 cn() 末尾，调用方胜出（tailwind-merge）
import { cn } from "@/lib/utils";
import { DialogClose, DialogContent, DialogOverlay, DialogPortal } from "reka-ui";
import { X } from "lucide-vue-next";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  class?: string;
  /** 隐藏右上角关闭 X（默认显示）。 */
  hideClose?: boolean;
  /** 关闭 X 的无障碍名，默认「关闭」。 */
  closeLabel?: string;
}>();

defineEmits<{
  escapeKeyDown: [event: KeyboardEvent];
  pointerDownOutside: [event: Event];
  interactOutside: [event: Event];
  openAutoFocus: [event: Event];
  closeAutoFocus: [event: Event];
}>();
</script>

<template>
  <DialogPortal>
    <DialogOverlay
      class="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
    />
    <DialogContent
      v-bind="$attrs"
      :class="
        cn(
          'fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg',
          props.class,
        )
      "
      @escape-key-down="$emit('escapeKeyDown', $event)"
      @pointer-down-outside="$emit('pointerDownOutside', $event)"
      @interact-outside="$emit('interactOutside', $event)"
      @open-auto-focus="$emit('openAutoFocus', $event)"
      @close-auto-focus="$emit('closeAutoFocus', $event)"
    >
      <slot />
      <DialogClose
        v-if="!props.hideClose"
        :aria-label="props.closeLabel ?? '关闭'"
        class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
      >
        <X class="h-4 w-4" />
      </DialogClose>
    </DialogContent>
  </DialogPortal>
</template>
