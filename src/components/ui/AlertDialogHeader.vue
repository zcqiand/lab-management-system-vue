<script setup lang="ts">
// AlertDialogHeader 原语 — shadcn-vue 风格。纯布局容器。
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: string }>();
</script>

<template>
  <div v-bind="$attrs" :class="cn('flex flex-col gap-2 text-center sm:text-left', props.class)">
    <slot />
  </div>
</template>
