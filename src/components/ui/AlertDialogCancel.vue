<script setup lang="ts">
// AlertDialogCancel 原语 — shadcn-vue 风格的「取消」按钮。
//
// 底层 reka-ui AlertDialogCancel（点击后自动关闭；打开时焦点默认落在它上面，
// 这是 alertdialog 的安全默认 —— 回车不会误触发危险操作）。
// `as-child` 委托给 <Button variant="outline">，样式与仓内其它按钮一致。
import Button from "@/components/ui/Button.vue";
import { AlertDialogCancel } from "reka-ui";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  class?: string;
  disabled?: boolean;
}>();
</script>

<template>
  <AlertDialogCancel as-child>
    <Button
      v-bind="$attrs"
      variant="outline"
      :disabled="props.disabled ?? undefined"
      :class="props.class"
    >
      <slot />
    </Button>
  </AlertDialogCancel>
</template>
