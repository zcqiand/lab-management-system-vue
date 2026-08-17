<script setup lang="ts">
// M03.F07 报告发放 — page 包装
import ReportPhasePage from "@/features/reports/ReportPhasePage.vue";
</script>

<template>
  <!-- @entry M03.F07.I01 发放队列 -->
  <ReportPhasePage
    title="报告发放"
    subtitle="发放后进入归档（flowStatus=issuance，提交时自动生成报告编号）"
    stage="issuance"
    submit-label="发放"
    i01-data-fn="M03.F07.I01"
    i02-data-fn="M03.F07.I02"
  />
</template>