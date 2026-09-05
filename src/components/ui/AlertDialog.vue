<script setup lang="ts">
// AlertDialog 原语 — shadcn-vue 风格。
//
// 与 <Dialog> 的区别（不是样式差异，是语义差异）：
//   - role="alertdialog"，读屏会打断当前朗读
//   - **点遮罩不关闭**（reka-ui AlertDialogContent 默认 preventDefault
//     pointerDownOutside），必须显式点「取消」或「确认」
//   - 没有右上角关闭 X
//   - 打开时焦点默认落在 AlertDialogCancel 上（安全默认，避免误确认）
// 用于删除 / 提交 / 发布这类危险且不可逆的二次确认。
//
// 与 <Dialog> 一样**只支持受控用法**（不暴露 defaultOpen）：Vue 的 Boolean prop
// 转型让 `open` 缺省时是 `false` 而非 `undefined`，reka 会当成「受控且关闭」。
import { AlertDialogRoot } from "reka-ui";

const props = defineProps<{
  open?: boolean;
}>();

defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <AlertDialogRoot :open="props.open" @update:open="$emit('update:open', $event)">
    <slot />
  </AlertDialogRoot>
</template>
