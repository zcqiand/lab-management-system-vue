<script setup lang="ts">
// AlertDialogAction 原语 — shadcn-vue 风格的「确认」按钮。
//
// 底层 reka-ui AlertDialogAction（点击后自动关闭 AlertDialogRoot），
// `as-child` 把行为委托给内层 <Button>，这样 CVA variant / size / class
// 与仓内其它按钮完全一致，不用重写一套样式。
//
// `data-fn` / `aria-label` / `:disabled` 经 $attrs 落到真实 <button>。
import Button from "@/components/ui/Button.vue";
import { AlertDialogAction } from "reka-ui";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    class?: string;
    disabled?: boolean;
    /** 危险操作（删除等）走 destructive 配色，默认 true —— alert 场景本就危险。 */
    danger?: boolean;
  }>(),
  // 必须走 withDefaults：Vue 对**声明为 Boolean 的 prop** 做布尔转型，
  // 调用方不传时值是 `false` 而不是 `undefined`。所以 `props.danger !== false`
  // 或 `props.danger ?? true` 这类写法都拿不到「未传 = true」的语义。
  { danger: true },
);
</script>

<template>
  <AlertDialogAction as-child>
    <Button
      v-bind="$attrs"
      variant="default"
      :disabled="props.disabled ?? undefined"
      :class="[
        props.danger ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' : '',
        props.class ?? '',
      ].join(' ')"
    >
      <slot />
    </Button>
  </AlertDialogAction>
</template>
