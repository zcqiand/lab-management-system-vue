<script setup lang="ts">
// Button 原语 — shadcn/ui 风格（react 仓 button.tsx 的 Vue 版，手写不引 reka-ui，
// 只覆盖本仓用到的 variant/size）。
//
// Phase 0 起对齐 shadcn-vue 契约：
//   - `class` prop 走 cn() 最后一位 → 调用方 class 经 tailwind-merge 压过 CVA 默认值
//   - inheritAttrs:false + v-bind="$attrs" → `data-fn` / `aria-label` 落到真实 <button>
import { computed } from "vue";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        // link: 纯文本样式 — 配合 compoundVariants 取消 size 注入，无 height/padding。
        // 用法：<Button variant="link" class="text-destructive hover:underline">删除</Button>
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        icon: "h-9 w-9",
      },
    },
    compoundVariants: [
      // link variant 不受 size 控制 — 纯文本链接，无 height/padding。
      // CVA defaultVariants.size="default" 仍会注入 h-9 px-4 py-2，但
      // tailwind-merge 在 cn() 末段把 compoundVariants 推入的 h-auto px-0 py-0
      // 排在前面并压过之。
      { variant: "link", size: "default", class: "h-auto px-0 py-0" },
      { variant: "link", size: "sm", class: "h-auto px-0 py-0" },
      { variant: "link", size: "icon", class: "h-auto w-auto p-0" },
    ],
    defaultVariants: { variant: "default", size: "default" },
  },
);

type Variants = VariantProps<typeof buttonVariants>;

const props = defineProps<{
  variant?: Variants["variant"];
  size?: Variants["size"];
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
  class?: string;
}>();

const classes = computed(() =>
  cn(buttonVariants({ variant: props.variant, size: props.size }), props.class),
);
</script>

<template>
  <button
    v-bind="$attrs"
    :type="type ?? 'button'"
    :class="classes"
    :disabled="disabled ?? undefined"
    :title="title"
  >
    <slot />
  </button>
</template>
