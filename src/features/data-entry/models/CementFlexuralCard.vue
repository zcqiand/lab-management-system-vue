<script setup lang="ts">
// 水泥胶砂抗折强度卡（Sprint 2 Batch 2B-8 镜像 react 仓 full 版）。
// 3 试件破坏荷载(kN) → 抗折强度(MPa, Rf=1.5·F·L/b³) → ±10% 剔除均值 → 单项评定。
// 镜像 react/src/features/data-entry/models/CementFlexuralCard.tsx（28 行 thin wrapper）。
import { computed } from "vue";
import type { ParamModelProps } from "./types";
import { computeCementFlexural, type StrengthResult } from "./cement-strength";
import StrengthCardBase from "./StrengthCardBase.vue";

const props = defineProps<ParamModelProps>();

const specimenCount = computed(() => (props.config?.["specimenCount"] as number) ?? 3);
const span = computed(() => (props.config?.["span"] as number) ?? 100);
const width = computed(() => (props.config?.["width"] as number) ?? 40);

function compute(loads: number[]): StrengthResult {
  return computeCementFlexural(loads, span.value, width.value);
}
</script>

<template>
  <StrengthCardBase
    v-bind="props"
    :specimen-count="specimenCount"
    :compute="compute"
    strength-label="抗折强度 (MPa)"
  />
</template>