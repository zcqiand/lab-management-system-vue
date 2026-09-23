<script setup lang="ts">
// Table 原语 — shadcn-vue 风格（react 仓 table.tsx 的 Vue 版）。
//
// Phase 2a-1 起对齐 shadcn-vue 契约：
//   - shadcn-vue Table 家族**故意 div-based**（不是 <table>/<tr>/<td>），
//     通过 role="table" / role="row" / role="cell" 维持 ARIA 语义。
//   - 原因：浏览器 <table> 默认 display 会强制 table-layout，
//     shadcn 想要 div 的 flex/grid 灵活布局 + 滚动条定制。
//   - **副作用**：所有用 findAll("tr") / findAll("tbody tr") 等标签选择器
//     的测试需要同步迁到 findAll('[role="row"]') 等 role-based selector
//     （Phase 2a-1 范围：仅 pilot 文件相关测试更新；其他表测试暂不动，
//      Phase 2a-2/3 迁到对应文件时再同步更新 selector）。
//
//   - `class` prop 走 cn() 最后一位 → 调用方 class 经 tailwind-merge 压过 CVA 默认值
//   - 容器原语（Table/Header/Body）不转发 data-fn 之类的锚点（data-fn 通常挂在
//     行/单元格上）；Table 自 2026-09-23 起挂 inheritAttrs:false，$attrs 显式落外层滚动壳
//
// 2026-09-23 内容区重设计（对齐 react table.tsx 容器结构）：
//   - 外层 = 滚动壳（relative w-full overflow-x-auto + 白色圆角面板 + shadow-sm，
//     mirror react 的 table-container + Card 质感），$attrs（data-testid 等）落这层
//   - 内层 = div[role=table]，挂 display:table 让 div 表格真正按表格布局
//     （此前从未挂布局 CSS，单元格竖排堆叠 = 「裸 HTML」感根因之一），
//     基类保留测试断言的 w-full/caption-bottom/text-sm（shadcn-table.dom.test.ts）
import { cn } from "@/lib/utils";

defineOptions({ inheritAttrs: false });

defineProps<{ class?: string }>();
</script>

<template>
  <div
    v-bind="$attrs"
    :class="
      cn(
        'relative w-full overflow-x-auto rounded-xl border bg-card shadow-sm',
        $attrs.class as string,
      )
    "
  >
    <div :class="cn('table w-full caption-bottom text-sm')" role="table">
      <slot />
    </div>
  </div>
</template>
