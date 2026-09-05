<script setup lang="ts">
// DialogTitle 原语 — shadcn-vue 风格。
//
// 底层是 reka-ui DialogTitle：它把自己的 id 注册进 DialogRoot context 并挂到
// content 的 `aria-labelledby`。**这是必需的** —— reka-ui 在没有 DialogTitle 时
// 会在 dev 期告警「DialogContent requires a DialogTitle」，读屏也念不出弹窗名。
// 迁移手写 <Teleport> 版本时，原来的 <h2>/<h3> 标题一律换成本组件。
import { cn } from "@/lib/utils";
import { DialogTitle } from "reka-ui";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: string }>();
</script>

<template>
  <DialogTitle
    v-bind="$attrs"
    :class="cn('text-lg font-semibold leading-none tracking-tight', props.class)"
  >
    <slot />
  </DialogTitle>
</template>
