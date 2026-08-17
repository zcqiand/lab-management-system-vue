<script setup lang="ts">
// M04.F06 型号维护 — CategoryDictList endpoint=/models（Sprint 2 Batch 1）
import CategoryDictList from "@/features/dicts/CategoryDictList.vue";
</script>

<template>
  <CategoryDictList
    endpoint="/models"
    title="型号维护"
    hint="InspectionModel 实体码表，按检测项目过滤"
    data-fn="M04.F06.I01"
    create-data-fn="M04.F06.I02"
    edit-data-fn="M04.F06.I02"
    delete-data-fn="M04.F06.I03"
  />
</template>