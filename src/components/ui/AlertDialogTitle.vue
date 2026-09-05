<script setup lang="ts">
// AlertDialogTitle 原语 — shadcn-vue 风格。
// 底层 reka-ui AlertDialogTitle：id 注册进 context 挂 content 的 aria-labelledby。
// reka-ui 对 AlertDialog 的 title 要求比 Dialog 更严（缺了 dev 期直接告警）。
import { cn } from "@/lib/utils";
import { AlertDialogTitle } from "reka-ui";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: string }>();
</script>

<template>
  <AlertDialogTitle v-bind="$attrs" :class="cn('text-lg font-semibold', props.class)">
    <slot />
  </AlertDialogTitle>
</template>
