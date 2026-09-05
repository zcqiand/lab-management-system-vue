<script setup lang="ts">
// DialogFooter 原语 — shadcn-vue 风格。纯布局容器（无 reka-ui 依赖）。
// 放操作按钮；窄屏反向纵向堆叠（主操作在上），宽屏右对齐横排。
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: string }>();
</script>

<template>
  <div
    v-bind="$attrs"
    :class="cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', props.class)"
  >
    <slot />
  </div>
</template>
