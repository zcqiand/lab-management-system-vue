<script setup lang="ts">
// DropdownMenuLabel — 见 DropdownMenu.vue（reka-ui 底座）。reka-ui 的
// DropdownMenuLabel 只渲染语义角色，样式由本仓给。
// 导入改名 RekaLabel：避免与本文件组件名冲突。
import { DropdownMenuLabel as RekaLabel } from "reka-ui";
</script>

<template>
  <RekaLabel class="px-2 py-1.5 text-sm font-semibold"><slot /></RekaLabel>
</template>
