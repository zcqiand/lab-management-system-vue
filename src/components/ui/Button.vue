<script setup lang="ts">
// Button 原语 — shadcn/ui 风格（react 仓 button.tsx 的 Vue 版，手写不引 reka-ui，
// 只覆盖本仓用到的 variant/size）。
import { computed } from "vue";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost: "hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        icon: "h-9 w-9",
      },
    },
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
}>();

const classes = computed(() =>
  cn(buttonVariants({ variant: props.variant, size: props.size })),
);
</script>

<template>
  <button :type="type ?? 'button'" :class="classes" :disabled="disabled" :title="title">
    <slot />
  </button>
</template>
