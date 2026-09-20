<script setup lang="ts">
// PageLoading — 页面级加载态（B6 批：内容区数据未到齐前的整页占位）。
//
// 用户需求：点击菜单后，右内容区在数据加载完成前显示「加载中」，禁止空表壳先渲染。
// 形态 = CSS animation spinner + 「加载中…」居中块（controller ruling：不做骨架屏，
// vue 仓无 spinner 基础件；风格对齐 EmptyState 的居中排版）。
// 已有 per-widget「加载中…」保留（refetch 时仍有意义）。
</script>

<template>
  <div
    class="flex flex-col items-center justify-center gap-3 py-24"
    data-testid="page-loading"
    role="status"
  >
    <span
      class="inline-block size-6 rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground animate-spin"
      aria-hidden="true"
    />
    <span class="text-muted-foreground text-sm">加载中…</span>
  </div>
</template>
