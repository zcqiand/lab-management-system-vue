<script setup lang="ts">
// DialogHeader 原语 — shadcn-vue 风格。纯布局容器（无 reka-ui 依赖）。
// 放 <DialogTitle> + <DialogDescription>；小屏居中、大屏左对齐。
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: string }>();
</script>

<template>
  <div v-bind="$attrs" :class="cn('flex flex-col gap-1.5 text-center sm:text-left', props.class)">
    <slot />
  </div>
</template>
