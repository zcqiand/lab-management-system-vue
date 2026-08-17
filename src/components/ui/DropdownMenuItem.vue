<script setup lang="ts">
// DropdownMenuItem — 见 DropdownMenu.vue（轻量手写 family）。
import { inject, type Ref } from "vue";
import { cn } from "@/lib/utils";

defineProps<{ active?: boolean; testid?: string }>();

const close = inject<() => void>("dropdown-close", () => undefined);
const open = inject<Ref<boolean>>("dropdown-open", { value: true } as Ref<boolean>);
void open;
</script>

<template>
  <button
    type="button"
    :data-testid="testid"
    :class="
      cn(
        'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground',
        active ? 'bg-accent' : '',
      )
    "
    @click="close()"
  >
    <slot />
  </button>
</template>
