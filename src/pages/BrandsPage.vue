<script setup lang="ts">
// M04.F09 牌号维护 — CategoryDictList endpoint=/brands（Sprint 2 Batch 1）
import CategoryDictList from "@/features/dicts/CategoryDictList.vue";
</script>

<template>
  <CategoryDictList
    endpoint="/brands"
    title="牌号维护"
    hint="InspectionBrand 实体码表，按检测项目过滤"
    data-fn="M04.F09.I01"
    create-data-fn="M04.F09.I02"
    edit-data-fn="M04.F09.I02"
    delete-data-fn="M04.F09.I03"
  />
</template>