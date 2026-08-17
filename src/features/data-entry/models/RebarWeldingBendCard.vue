<script setup lang="ts">
// 钢筋焊接接头弯曲卡（Sprint 2 Batch 2B-8 镜像 react 仓）。
import type { ParamModelProps } from './types'
defineProps<ParamModelProps>()
</script>

<template>
  <div class="border rounded p-3 space-y-2">
    <div class="text-sm font-medium">
      {{ parameter.canonicalName || parameter.name
      }}<span v-if="parameter.unit">（{{ parameter.unit }}）</span>
    </div>
    <div class="text-xs text-gray-500">钢筋焊接弯曲卡（Batch 2B-8 stub）</div>
  </div>
</template>