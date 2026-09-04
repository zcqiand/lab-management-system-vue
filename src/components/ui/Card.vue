<script setup lang="ts">
// Card 原语 — shadcn/ui 风格容器。Phase 0 只落最小外壳（Header/Title/Content 子件
// 留到实际有调用方时再加），因为部分 shadcn 原语的默认类名引用 card token。
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

const props = defineProps<{ class?: string }>();
</script>

<template>
  <div
    v-bind="$attrs"
    :class="cn('rounded-lg border bg-card text-card-foreground shadow-sm', props.class)"
  >
    <slot />
  </div>
</template>
