<script setup lang="ts">
// M03.F06 报告批准 — page 包装
import ReportPhasePage from "@/features/reports/ReportPhasePage.vue";
</script>

<template>
  <!-- @entry M03.F06.I01 批准队列 -->
  <ReportPhasePage
    title="报告批准"
    subtitle="批准后进入报告发放（flowStatus=approval）"
    stage="approval"
    submit-label="批准"
    i01-data-fn="M03.F06.I01"
    i02-data-fn="M03.F06.I02"
  />
</template>