<script setup lang="ts">
// DialogDescription 原语 — shadcn-vue 风格。
//
// 底层是 reka-ui DialogDescription：id 注册进 context 并挂到 content 的
// `aria-describedby`。迁移时原来标题下面那行 <p class="text-sm text-muted-foreground">
// 换成本组件，读屏才会连着弹窗名一起念。
import { cn } from "@/lib/utils";
import { DialogDescription } from "reka-ui";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: string }>();
</script>

<template>
  <DialogDescription v-bind="$attrs" :class="cn('text-sm text-muted-foreground', props.class)">
    <slot />
  </DialogDescription>
</template>
