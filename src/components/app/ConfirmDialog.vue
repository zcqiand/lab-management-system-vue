<script setup lang="ts">
// ConfirmDialog — vue 仓通用确认弹窗原语（Sprint 2 Batch 1 引入）。
//
// 镜像 react 仓 src/components/ConfirmModal.tsx（nextjs 同款，1:1 API 形状）。
//
// 用途：CRUD 删除/保存等需要二次确认的危险操作（CLAUDE.md vue 仓明文禁止
// window.confirm / window.alert，删除/编辑/发布类必须走此原语）。
//
// Phase 1.0：内部两 raw <button> 切到 <Button> primitive。
// Phase 2e-2：外层手写 <Teleport> + 遮罩 + 自挂 keydown 全部换成
//   <AlertDialog> 原语家族。**对外 props 一个字没改**（9 个 prop + 默认插槽），
//   9 个调用方无需改动。净收益：
//     - role="alertdialog" + aria-labelledby / aria-describedby（原来完全没有）
//     - focus trap + 打开时焦点落在「取消」上（危险操作的安全默认）
//     - 打开时锁 body 滚动
//     - 点遮罩**不再**关闭 —— 危险确认不该被误点划走（行为变更，见 CHANGELOG）
//
// 两个刻意的结构选择：
//
//   1. 确认按钮是普通 <Button>，**不是** <AlertDialogAction>。
//      AlertDialogAction 点击后会自动关闭 root，那样 `loading` 语义就没了 ——
//      本组件的契约是「确认后弹窗留在原地显示处理中…，由父组件做完异步再翻
//      open」。所以确认键不参与 reka 的关闭流程。
//   2. 取消键是 <AlertDialogCancel> 但**不挂 @click**。
//      取消的唯一出口是 `@update:open` —— ESC 和点取消都会走它，只调一次
//      onCancel。若两边都接，点取消会把 onCancel 调两遍。
import AlertDialog from "@/components/ui/AlertDialog.vue";
import AlertDialogCancel from "@/components/ui/AlertDialogCancel.vue";
import AlertDialogContent from "@/components/ui/AlertDialogContent.vue";
import AlertDialogDescription from "@/components/ui/AlertDialogDescription.vue";
import AlertDialogFooter from "@/components/ui/AlertDialogFooter.vue";
import AlertDialogHeader from "@/components/ui/AlertDialogHeader.vue";
import AlertDialogTitle from "@/components/ui/AlertDialogTitle.vue";
import Button from "@/components/ui/Button.vue";

interface Props {
  /** 是否打开 */
  open: boolean;
  /** 标题 */
  title: string;
  /** 提示消息：字符串或任意 VNode（表单字段走插槽） */
  message?: string;
  /** 确认回调 */
  onConfirm: () => void;
  /** 取消回调（点取消按钮、ESC 触发） */
  onCancel: () => void;
  /** 确认按钮文本，默认"确认" */
  confirmText?: string;
  /** 取消按钮文本，默认"取消" */
  cancelText?: string;
  /** 确认中 loading 状态（禁用按钮 + 文本变化） */
  loading?: boolean;
  /** loading 时确认按钮文本，默认"处理中..." */
  loadingText?: string;
  /** 确认按钮危险样式（红色），默认 true */
  danger?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  message: "",
  confirmText: "确认",
  cancelText: "取消",
  loading: false,
  loadingText: "处理中...",
  danger: true,
});

// reka 关闭 root 的唯一出口（ESC / 点取消键）。loading 时 ESC 已被
// handleEscape 拦下，取消键也是 disabled，所以处理中不会被触发。
function handleOpenChange(next: boolean): void {
  if (!next) props.onCancel();
}

// 处理中不许 ESC 逃走（迁移前的 handleKey 也有这个 !loading 判断）。
function handleEscape(e: KeyboardEvent): void {
  if (props.loading) e.preventDefault();
}
</script>

<template>
  <AlertDialog :open="open" @update:open="handleOpenChange">
    <AlertDialogContent
      data-testid="confirm-dialog"
      class="w-96 max-w-[90vw] gap-0 rounded-lg bg-white p-0 shadow-xl"
      @escape-key-down="handleEscape"
    >
      <AlertDialogHeader class="border-b border px-6 py-4">
        <AlertDialogTitle>{{ title }}</AlertDialogTitle>
      </AlertDialogHeader>
      <div class="px-6 py-4">
        <AlertDialogDescription v-if="message" class="text-sm text-muted-foreground">
          {{ message }}
        </AlertDialogDescription>
        <slot />
      </div>
      <AlertDialogFooter class="justify-end gap-2 border-t border px-6 py-3">
        <AlertDialogCancel :disabled="loading" data-fn="confirm-dialog-cancel">
          {{ cancelText }}
        </AlertDialogCancel>
        <Button
          variant="default"
          :disabled="loading"
          data-fn="confirm-dialog-confirm"
          :class="danger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''"
          @click="onConfirm"
        >
          {{ loading ? loadingText : confirmText }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
