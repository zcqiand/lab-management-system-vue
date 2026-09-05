<script setup lang="ts">
// DialogFixture — Phase 0 底座冒烟测试的挂载靶子，**只给 tests/ 用**，
// 不被任何业务代码 import（不进 bundle）。
//
// 直接用 reka-ui 的 DialogRoot/Portal/Content 当占位（完整 shadcn-vue Dialog 在 Phase 2e），
// 目的是把三条契约钉在一个可挂载组件上：portal stub、$attrs 转发、class 合并。
import { ref } from "vue";
import { DialogRoot, DialogPortal, DialogContent, DialogTitle, DialogDescription } from "reka-ui";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";

const open = ref(true);
const note = ref("");
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogContent>
        <DialogTitle>Test Dialog</DialogTitle>
        <DialogDescription>This is a test fixture for Phase 0 validation</DialogDescription>
        <p data-testid="dialog-body">Body content</p>
        <Label for="dialog-note" data-fn="dialog-label" class="text-destructive">Note</Label>
        <Input id="dialog-note" v-model="note" data-fn="dialog-input" :disabled="true" />
        <Button
          data-fn="dialog-cancel"
          aria-label="close-dialog"
          class="mt-4 h-10"
          @click="open = false"
        >
          Cancel
        </Button>
        <Button variant="link" data-fn="dialog-link">
          Link
        </Button>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
