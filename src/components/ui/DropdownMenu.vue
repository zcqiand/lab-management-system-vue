<script setup lang="ts">
// DropdownMenu 原语 — 轻量手写版（react 仓用 radix，Vue 侧不引 reka-ui：
// 只覆盖 BackendSwitcher 需要的 trigger/label/item/separator + 点外关闭）。
import { onBeforeUnmount, onMounted, provide, ref } from "vue";
import { cn } from "@/lib/utils";

const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);

provide("dropdown-close", () => {
  open.value = false;
});

function onDocClick(e: MouseEvent) {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node)) {
    open.value = false;
  }
}
function onEsc(e: KeyboardEvent) {
  if (e.key === "Escape") open.value = false;
}

onMounted(() => {
  document.addEventListener("mousedown", onDocClick);
  document.addEventListener("keydown", onEsc);
});
onBeforeUnmount(() => {
  document.removeEventListener("mousedown", onDocClick);
  document.removeEventListener("keydown", onEsc);
});

defineExpose({ open });
</script>

<template>
  <div ref="rootEl" class="relative inline-block text-left">
    <div @click="open = !open">
      <slot name="trigger" />
    </div>
    <div
      v-if="open"
      :class="
        cn(
          'bg-popover text-popover-foreground absolute right-0 z-50 mt-2 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md',
        )
      "
      :style="{ minWidth: '20rem' }"
    >
      <slot :close="() => (open = false)" />
    </div>
  </div>
</template>
