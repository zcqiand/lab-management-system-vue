<script setup lang="ts">
// AlertDialogDescription 原语 — shadcn-vue 风格。
// 底层 reka-ui AlertDialogDescription：id 挂 content 的 aria-describedby。
import { cn } from "@/lib/utils";
import { AlertDialogDescription } from "reka-ui";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: string }>();
</script>

<template>
  <AlertDialogDescription
    v-bind="$attrs"
    :class="cn('text-sm text-muted-foreground', props.class)"
  >
    <slot />
  </AlertDialogDescription>
</template>
