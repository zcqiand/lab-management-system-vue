<script setup lang="ts">
// 强度卡基类（Sprint 2 Batch 2B-8 镜像 react 仓）。
// 镜像 react/src/features/data-entry/models/StrengthCardBase.tsx（180 行）。
// 完整实现（含 ±10% 剔除 + 自动判 + 受控输入）见 react 仓；本仓 stub。
import type { StrengthResult } from './cement-strength'

interface StrengthCardBaseProps {
  /** 每个试件强度的展示标签，如「抗压强度 (MPa)」 */
  strengthLabel: string
  /** 试件数（计算规则 specimenCount） */
  specimenCount: number
  /** 受控荷载输入 */
  loads: number[]
  /** 算法回调（接收受控荷载，返回 StrengthResult） */
  compute: (loads: number[]) => StrengthResult
  /** 上报到父组件的回调（含 result JSON） */
  onChange: (patch: { result: string }) => void
  /** 只读模式 */
  readOnly?: boolean
}

const props = defineProps<StrengthCardBaseProps>()

const emit = (v: string, i: number) => {
  if (props.readOnly) return
  const num = v === '' ? 0 : Number(v)
  const arr = [...props.loads]
  arr[i] = num
  const r = props.compute(arr)
  props.onChange({ result: JSON.stringify({ loads: arr, strengths: r.strengths, mean: r.mean, invalid: r.invalid }) })
}

const result = props.compute(props.loads)
</script>

<template>
  <div class="border rounded p-3 space-y-2">
    <div class="text-sm font-medium">{{ strengthLabel }}</div>
    <table class="w-full text-xs">
      <thead class="text-gray-500">
        <tr>
          <th class="text-left py-1">#</th>
          <th class="text-left py-1">破坏荷载 (kN)</th>
          <th class="text-left py-1">强度 (MPa)</th>
          <th class="text-left py-1">保留</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(lv, i) in loads" :key="i">
          <td class="py-1">{{ i + 1 }}</td>
          <td class="py-1">
            <input
              type="number"
              :value="lv === 0 ? '' : lv"
              :readonly="readOnly"
              class="w-32 border rounded px-2 py-1 text-sm read-only:bg-gray-50 read-only:text-gray-500"
              @change="(e) => emit((e.target as HTMLInputElement).value, i)"
            />
          </td>
          <td class="py-1 text-gray-700">{{ result.strengths[i] ?? '-' }}</td>
          <td class="py-1">{{ result.kept[i] ? '✓' : '' }}</td>
        </tr>
      </tbody>
    </table>
    <div class="text-xs text-gray-600">代表值：{{ result.mean ?? '—' }}{{ result.invalid ? '（GB/T 17671 作废）' : '' }}</div>
  </div>
</template>