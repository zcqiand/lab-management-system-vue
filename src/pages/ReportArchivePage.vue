<script setup lang="ts">
// M03.F08 报告归档 — page 包装
import ReportPhasePage from "@/features/reports/ReportPhasePage.vue";
</script>

<template>
  <!-- @entry M03.F08.I01 归档队列 -->
  <ReportPhasePage
    title="报告归档"
    subtitle="归档完成后进入已完成（flowStatus=archived）"
    stage="archived"
    submit-label="归档完成"
    i01-data-fn="M03.F08.I01"
    i02-data-fn="M03.F08.I02"
  />
</template>