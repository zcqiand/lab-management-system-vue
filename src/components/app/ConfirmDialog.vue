<script setup lang="ts">
// ConfirmDialog — vue 仓通用确认弹窗原语（Sprint 2 Batch 1 引入）。
//
// 镜像 react 仓 src/components/ConfirmModal.tsx（nextjs 同款，1:1 API 形状）。
// vue 用 Teleport 把弹窗挂到 document.body，避免 z-index/overflow 嵌套坑。
//
// 用途：CRUD 删除/保存等需要二次确认的危险操作（CLAUDE.md vue 仓明文禁止
// window.confirm / window.alert，删除/编辑/发布类必须走此原语）。
//
// Phase 1.0：内部两 raw <button> 切到 <Button> primitive（shadcn-vue 风格）。
//   - cancel: variant="outline"（border + bg-background + hover:bg-accent）
//   - confirm: variant="default"（bg-primary text-primary-foreground）
//     · danger=true 时 caller class 覆盖成 bg-destructive（tailwind-merge 胜出）
//   - data-fn / aria-label / @click / :disabled 全部由 Phase 0 的 inheritAttrs:false
//     + v-bind="$attrs" 转发到真实 <button>，无需手动接管
//
// 后续 Phase 2e 会用 reka-ui DialogPrimitive 替换外层 <Teleport> 与遮罩逻辑。
import { onUnmounted, watch } from "vue";
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
          <Button
            variant="outline"
            :disabled="loading"
            data-fn="confirm-dialog-cancel"
            @click="onCancel"
          >
            {{ cancelText }}
          </Button>
          <Button
            variant="default"
            :disabled="loading"
            data-fn="confirm-dialog-confirm"
            :class="danger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : ''"
            @click="onConfirm"
          >
            {{ loading ? loadingText : confirmText }}
          </Button>
        </div>
      </div>
    </div>
  </Teleport>
</template>