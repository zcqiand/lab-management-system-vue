<script setup lang="ts">
// 空态。列表无数据、搜索无结果时统一走这里，禁止直接甩一句"暂无数据"的裸文本。
// 2026-09-23 内容区重设计：白卡面 + 图标软圆座，与 Table 面板同语。
defineProps<{
  title: string;
  description?: string;
}>();
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed bg-card px-6 py-14 text-center"
  >
    <div
      v-if="$slots.icon"
      class="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full [&_svg]:size-6"
    >
      <slot name="icon" />
    </div>
    <div class="space-y-1">
      <p class="text-sm font-medium">{{ title }}</p>
      <p v-if="description" class="text-muted-foreground text-sm">{{ description }}</p>
    </div>
    <slot />
  </div>
</template>
