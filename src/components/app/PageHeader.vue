<script setup lang="ts">
// 页面级标题栏。每个功能页顶部统一走这里，不要各写各的 h1 + 按钮布局。
//
// 2026-09-23 内容区重设计（纸面工作台）：header 带 = 分组眉行（可选）+ 标题
// + 描述左，actions 右，底部 hairline 分隔。眉行 group = 该页在侧栏分组树里
// 的组名（wayfinding 贯通：深色侧栏 → 浅色内容区的位置回声），不是装饰标签。
defineProps<{
  title: string;
  description?: string;
  /** 侧栏分组名（如「实验过程管理」）；不传则不渲染眉行 */
  group?: string;
}>();
</script>

<template>
  <!-- 2026-09-23 对齐 saas-vue：无 hairline（页头靠留白与字阶站住，不靠线）；
       眉行 group = 侧栏分组名，保留作 wayfinding -->
  <header class="mb-6 flex items-start justify-between gap-4">
    <div class="min-w-0 space-y-1">
      <p v-if="group" class="text-muted-foreground text-xs font-medium">{{ group }}</p>
      <h1 class="text-2xl font-semibold tracking-tight">{{ title }}</h1>
      <p v-if="description" class="text-muted-foreground text-sm">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="flex shrink-0 items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>
