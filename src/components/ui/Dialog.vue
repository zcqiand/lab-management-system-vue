<script setup lang="ts">
// Dialog 原语 — shadcn-vue 风格（react 仓 dialog.tsx 的 Vue 版）。
//
// Phase 2e-1 起对齐 shadcn-vue 契约：
//   - 底层是 reka-ui DialogRoot，负责 open 状态 + focus trap + ESC + 滚动锁
//   - 复合原语：Root / Content / Header / Title / Description / Footer / Close
//     必须共享 DialogRoot context，所以拆成多个 sub-component
//   - **DialogRoot 是 Fragment**：`class` / `aria-label` / `data-fn` 挂在它上面
//     不会 propagate（同 SelectRoot 的坑），一律挂到 <DialogContent> 上
//   - **只支持受控用法**：`<Dialog :open="x" @update:open="...">` 或
//     `<Dialog v-model:open="x">`。不暴露 reka 的 `defaultOpen` 非受控模式 ——
//     Vue 的 Boolean prop 转型让 `open` 缺省时是 `false` 而不是 `undefined`，
//     reka 会当成「受控且关闭」，`defaultOpen` 永远不生效。本仓 14 个 modal
//     的开关状态本来就在父组件的 mode 判别联合里，受控正是想要的。
import { DialogRoot } from "reka-ui";

const props = withDefaults(
  defineProps<{
    open?: boolean;
    /** 非模态：不锁滚动、不 trap focus。本仓默认 modal，一般不传。 */
    modal?: boolean;
  }>(),
  // 必须走 withDefaults：Vue 对**声明为 Boolean 的 prop** 做布尔转型，
  // 调用方不传时值是 `false` 而不是 `undefined`。写成 `props.modal ?? true`
  // 会让每个弹窗都变成**非模态**（不 trap focus、不锁滚动）—— 静默且难查。
  { modal: true },
);

defineEmits<{ "update:open": [value: boolean] }>();
</script>

<template>
  <DialogRoot :open="props.open" :modal="props.modal" @update:open="$emit('update:open', $event)">
    <slot />
  </DialogRoot>
</template>
