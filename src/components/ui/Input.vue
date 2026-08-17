<script setup lang="ts">
// Input 原语 — shadcn/ui 风格（react 仓 input.tsx 的 Vue 版）。
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    type?: string;
    id?: string;
    autocomplete?: string;
    required?: boolean;
    placeholder?: string;
    autofocus?: boolean;
    modelValue?: string;
  }>(),
  { type: "text", modelValue: "" },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  keydown: [event: KeyboardEvent];
}>();
</script>

<template>
  <input
    :id="id"
    :type="type"
    :autocomplete="autocomplete"
    :required="required"
    :placeholder="placeholder"
    :autofocus="autofocus"
    :value="props.modelValue"
    :class="
      cn(
        'border-input bg-background flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
      )
    "
    @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    @keydown="$emit('keydown', $event)"
  />
</template>
