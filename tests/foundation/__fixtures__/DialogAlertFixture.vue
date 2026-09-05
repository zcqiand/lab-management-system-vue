<script setup lang="ts">
// Phase 2e-1 foundation fixture — Dialog + AlertDialog 原语底座。
// 两个弹窗都受控（open 由本地 ref 驱动），镜像本仓 14 个 modal 的现状：
// 开关状态在父组件手里，不用 <DialogTrigger>。
import { ref } from "vue";
import Button from "@/components/ui/Button.vue";
import Dialog from "@/components/ui/Dialog.vue";
import DialogContent from "@/components/ui/DialogContent.vue";
import DialogDescription from "@/components/ui/DialogDescription.vue";
import DialogFooter from "@/components/ui/DialogFooter.vue";
import DialogHeader from "@/components/ui/DialogHeader.vue";
import DialogTitle from "@/components/ui/DialogTitle.vue";
import AlertDialog from "@/components/ui/AlertDialog.vue";
import AlertDialogAction from "@/components/ui/AlertDialogAction.vue";
import AlertDialogCancel from "@/components/ui/AlertDialogCancel.vue";
import AlertDialogContent from "@/components/ui/AlertDialogContent.vue";
import AlertDialogDescription from "@/components/ui/AlertDialogDescription.vue";
import AlertDialogFooter from "@/components/ui/AlertDialogFooter.vue";
import AlertDialogHeader from "@/components/ui/AlertDialogHeader.vue";
import AlertDialogTitle from "@/components/ui/AlertDialogTitle.vue";

const dialogOpen = ref(true);
const alertOpen = ref(true);
const confirmed = ref(0);
const cancelled = ref(0);
</script>

<template>
  <div>
    <span data-testid="dlg-state">{{ dialogOpen ? "open" : "closed" }}</span>
    <span data-testid="alert-state">{{ alertOpen ? "open" : "closed" }}</span>
    <span data-testid="confirmed">{{ confirmed }}</span>
    <span data-testid="cancelled">{{ cancelled }}</span>

    <Dialog v-model:open="dialogOpen">
      <DialogContent data-testid="dlg-content" class="extra-dlg" close-label="关掉">
        <DialogHeader>
          <DialogTitle data-testid="dlg-title">编辑接样</DialogTitle>
          <DialogDescription data-testid="dlg-desc">改完点保存。</DialogDescription>
        </DialogHeader>
        <div data-testid="dlg-body">表单区</div>
        <DialogFooter>
          <Button data-fn="dlg-save" @click="dialogOpen = false">保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <AlertDialog v-model:open="alertOpen">
      <AlertDialogContent data-testid="alert-content" class="extra-alert">
        <AlertDialogHeader>
          <AlertDialogTitle data-testid="alert-title">确认删除</AlertDialogTitle>
          <AlertDialogDescription data-testid="alert-desc">
            删除后不可恢复。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-fn="alert-cancel" @click="cancelled++">取消</AlertDialogCancel>
          <AlertDialogAction data-fn="alert-confirm" @click="confirmed++">删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
