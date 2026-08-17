<script setup lang="ts">
// M04.F08 等级维护 — CategoryDictList endpoint=/grades（Sprint 2 Batch 1）
import CategoryDictList from "@/features/dicts/CategoryDictList.vue";
</script>

<template>
  <CategoryDictList
    endpoint="/grades"
    title="等级维护"
    hint="InspectionGrade 实体码表，按检测项目过滤"
    data-fn="M04.F08.I01"
    create-data-fn="M04.F08.I02"
    edit-data-fn="M04.F08.I02"
    delete-data-fn="M04.F08.I03"
  />
</template>