<script setup lang="ts">
// ConfirmDialog — vue 仓通用确认弹窗原语（Sprint 2 Batch 1 引入）。
//
// 镜像 react 仓 src/components/ConfirmModal.tsx（nextjs 同款，1:1 API 形状）。
// vue 用 Teleport 把弹窗挂到 document.body，避免 z-index/overflow 嵌套坑。
//
// 用途：CRUD 删除/保存等需要二次确认的危险操作（CLAUDE.md vue 仓明文禁止
// window.confirm / window.alert，删除/编辑/发布类必须走此原语）。
import { onUnmounted, watch } from "vue";

interface Props {
  /** 是否打开 */
  open: boolean;
  /** 标题 */
  title: string;
  /** 提示消息：字符串或任意 VNode（表单字段走插槽） */
  message?: string;
  /** 确认回调 */
  onConfirm: () => void;
  /** 取消回调（点取消按钮或遮罩层触发） */
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

function handleBackdrop(e: MouseEvent): void {
  // 仅点击遮罩层本身（非内容区）时触发取消
  if (e.target === e.currentTarget) props.onCancel();
}

// ESC 关闭：vue 端没用到 keydown 全局监听就完事，nextjs 也没用，保持镜像
function handleKey(e: KeyboardEvent): void {
  if (e.key === "Escape" && props.open && !props.loading) props.onCancel();
}

watch(
  () => props.open,
  (v) => {
    if (typeof document === "undefined") return;
    if (v) {
      document.addEventListener("keydown", handleKey);
    } else {
      document.removeEventListener("keydown", handleKey);
    }
  },
  { immediate: false },
);

onUnmounted(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("keydown", handleKey);
  }
});
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      data-testid="confirm-dialog"
      @click="handleBackdrop"
    >
      <div class="w-96 max-w-[90vw] rounded-lg bg-white shadow-xl">
        <div class="border-b border-gray-200 px-6 py-4">
          <h3 class="text-lg font-semibold">{{ title }}</h3>
        </div>
        <div class="px-6 py-4">
          <p v-if="message" class="text-sm text-gray-600">{{ message }}</p>
          <slot />
        </div>
        <div class="flex justify-end gap-2 border-t border-gray-200 px-6 py-3">
          <button
            type="button"
            :disabled="loading"
            class="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            data-fn="confirm-dialog-cancel"
            @click="onCancel"
          >
            {{ cancelText }}
          </button>
          <button
            type="button"
            :disabled="loading"
            class="rounded px-4 py-2 text-sm text-white disabled:opacity-50"
            :class="danger ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'"
            data-fn="confirm-dialog-confirm"
            @click="onConfirm"
          >
            {{ loading ? loadingText : confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>