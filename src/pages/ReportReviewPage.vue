<script setup lang="ts">
// M03.F05 报告审核 — page 包装
import ReportPhasePage from "@/features/reports/ReportPhasePage.vue";
</script>

<template>
  <!-- @entry M03.F05.I01 审核队列 -->
  <ReportPhasePage
    title="报告审核"
    subtitle="审核通过后进入报告批准（flowStatus=review）"
    stage="review"
    submit-label="审核通过"
    i01-data-fn="M03.F05.I01"
    i02-data-fn="M03.F05.I02"
  />
</template>