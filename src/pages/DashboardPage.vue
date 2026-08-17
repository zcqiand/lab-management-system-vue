<script setup lang="ts">
// DashboardPage — Sprint 1 仪表盘空壳（sprint-roadmap：内容 Sprint 2 加）。
// 路由守卫 M01.F04.I03 在此挂载：idle 挂起、anonymous → /login、
// awaiting_tenant → /login（选租户页已移除）、缺权 → 拦截（react 仓镜像）。
import { LayoutDashboard } from "lucide-vue-next";
import PageHeader from "@/components/app/PageHeader.vue";
import EmptyState from "@/components/app/EmptyState.vue";
import { useRequireAuth } from "@/state/require-auth";

const { allowed, checking } = useRequireAuth();
</script>

<template>
  <div v-if="!checking && allowed" class="space-y-4">
    <PageHeader title="仪表盘" description="检测业务总览" />
    <EmptyState
      title="仪表盘建设中"
      description="Sprint 2 将填充合同/接样/样品/报告统计与待办任务"
    >
      <template #icon><LayoutDashboard /></template>
    </EmptyState>
  </div>
  <!-- guard effect 已触发跳转，渲染空避免闪烁 -->
  <div v-else />
</template>
