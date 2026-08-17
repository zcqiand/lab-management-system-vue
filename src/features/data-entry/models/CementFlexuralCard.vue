<script setup lang="ts">
// 水泥胶砂抗折强度卡（Sprint 2 Batch 2B-8 镜像 react 仓）。
// 镜像 react/src/features/data-entry/models/CementFlexuralCard.tsx（28 行）。
// 完整实现见 react 仓；vue 仓 stub：展示参数名 + 受 StrengthCardBase.vue 包装的提示。
import type { ParamModelProps } from './types'
defineProps<ParamModelProps>()
</script>

<template>
  <div class="border rounded p-3 space-y-2">
    <div class="text-sm font-medium">
      {{ parameter.canonicalName || parameter.name
      }}<span v-if="parameter.unit">（{{ parameter.unit }}）</span>
    </div>
    <div class="text-xs text-gray-500">水泥抗折卡（Batch 2B-8 stub — 完整逻辑见 react 仓镜像版本）</div>
  </div>
</template>