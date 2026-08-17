<script setup lang="ts">
// M04.F07 规格维护 — CategoryDictList endpoint=/specifications（Sprint 2 Batch 1）
import CategoryDictList from "@/features/dicts/CategoryDictList.vue";
</script>

<template>
  <CategoryDictList
    endpoint="/specifications"
    title="规格维护"
    hint="InspectionSpec 实体码表，按检测项目过滤"
    data-fn="M04.F07.I01"
    create-data-fn="M04.F07.I02"
    edit-data-fn="M04.F07.I02"
    delete-data-fn="M04.F07.I03"
  />
</template>