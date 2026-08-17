<script setup lang="ts">
// 混凝土抗压强度卡（Sprint 2 Batch 2B-8 镜像 react 仓）。
// 镜像 react/src/features/data-entry/models/ConcreteCompressCard.tsx（114 行）。
import type { ParamModelProps } from './types'
defineProps<ParamModelProps>()
</script>

<template>
  <div class="border rounded p-3 space-y-2">
    <div class="text-sm font-medium">
      {{ parameter.canonicalName || parameter.name
      }}<span v-if="parameter.unit">（{{ parameter.unit }}）</span>
    </div>
    <div class="text-xs text-gray-500">混凝土抗压卡（Batch 2B-8 stub — 完整逻辑见 react 仓镜像版本）</div>
  </div>
</template>