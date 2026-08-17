<script setup lang="ts">
// 空态。列表无数据、搜索无结果时统一走这里，禁止直接甩一句"暂无数据"的裸文本。
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center"
  >
    <div v-if="$slots.icon" class="text-muted-foreground [&_svg]:size-10">
      <slot name="icon" />
    </div>
    <div class="space-y-1">
      <p class="text-sm font-medium">{{ title }}</p>
      <p v-if="description" class="text-muted-foreground text-sm">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>
