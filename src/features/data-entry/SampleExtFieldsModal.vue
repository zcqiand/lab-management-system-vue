<script setup lang="ts">
// 接样单 ext 字段补录弹窗（M03.F01.I07，Sprint 2 Batch 2B-8 镜像 react 仓）。
// 镜像 react/src/features/data-entry/SampleExtFieldsModal.tsx。
// 完整版见 react 仓；vue 仓 stub：渲染标题 + 字段列表 + 确定/取消按钮。

import Button from "@/components/ui/Button.vue";

interface ExtFieldDef {
  key: string
  label: string
  type?: string
  required?: boolean
}

interface SampleLike {
  id: string
  ext?: Record<string, string>
}

const props = defineProps<{
  open: boolean
  samples: SampleLike[]
  extFields: ExtFieldDef[]
  onClose: () => void
  onConfirm: (nextExt: Record<string, string>) => void
}>()

function emitClose() {
  props.onClose()
}

function emitConfirm() {
  // stub：原样返回空 map；完整实现见 react 仓
  props.onConfirm({})
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" data-fn="M03.F01.I07">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
      <header class="flex items-center justify-between px-5 py-3 border-b">
        <h2 class="text-base font-semibold">样品扩展字段补录</h2>
        <button
          type="button"
          class="text-gray-400 hover:text-gray-600 text-xl leading-none"
          @click="emitClose"
        >
          ×
        </button>
      </header>
      <div class="px-5 py-4 space-y-2">
        <p class="text-sm text-gray-600">报告预览前按当前类别 extFields 补录样品扩展字段（vue 仓 Batch 2B-8 stub）</p>
        <ul class="text-xs text-gray-700 space-y-1">
          <li v-for="f in extFields" :key="f.key" data-fn="M03.F01.I07">{{ f.label }}（{{ f.key }}{{ f.required ? ' *' : '' }}）</li>
        </ul>
      </div>
      <footer class="flex items-center justify-end gap-2 px-5 py-3 border-t bg-gray-50">
        <Button variant="outline" class="px-4 py-1.5 text-sm rounded" @click="emitClose">取消</Button>
        <Button
          variant="default"
          class="bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-sm rounded"
          @click="emitConfirm"
        >
          确认
        </Button>
      </footer>
    </div>
  </div>
</template>