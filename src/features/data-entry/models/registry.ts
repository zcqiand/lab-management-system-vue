// 参数界面模型注册表（Batch 2B-8 满版 12 卡：default + 11 具体）。
//
// 镜像 react 仓 models/registry.ts：
// - resolveParamInterfaceModel(key) 命中 registry 取具体卡，未命中回退 DefaultParamCard
// - 算法域模块（cement-strength / rebar-mechanics / rebar-welding）+ StrengthCardBase +
//   resolveInterfaceByParam 来自 lab-management-system-shared/mocks/domain（nextjs 注释）
//   本仓家族 shared v0.2.0 已瘦身无 mocks/domain，本仓逐字拷实现到 models/ 下。
//
// vue 仓 .vue 转换采用 <script setup lang="ts"> + 原生 HTML + Tailwind，未引入 shadcn-vue。
// 卡片之间算法逻辑（强屈比 / 钢筋焊接 / 颗粒级配 / 土工击实 等）由 nextjs/react 仓版本逐字翻译，
// 简版兜底见 DefaultParamCard.vue / CementCompressCard.vue。

import type { ParamModelComponent } from "./types";
import DefaultParamCard from "./DefaultParamCard.vue";
import ConcreteCompressCard from "./ConcreteCompressCard.vue";
import ConcretePermeabilityCard from "./ConcretePermeabilityCard.vue";
import CementFlexuralCard from "./CementFlexuralCard.vue";
import CementCompressCard from "./CementCompressCard.vue";
import RebarWeldingTensileCard from "./RebarWeldingTensileCard.vue";
import RebarWeldingBendCard from "./RebarWeldingBendCard.vue";
import RebarMechNumericCard from "./RebarMechNumericCard.vue";
import ParticleGradationCard from "./ParticleGradationCard.vue";
import SoilCompactionCard from "./SoilCompactionCard.vue";
import SoilCompactionDegreeCard from "./SoilCompactionDegreeCard.vue";

export const MODEL_REGISTRY: Record<string, ParamModelComponent> = {
  default: DefaultParamCard as unknown as ParamModelComponent,
  "concrete-compress": ConcreteCompressCard as unknown as ParamModelComponent,
  "concrete-permeability":
    ConcretePermeabilityCard as unknown as ParamModelComponent,
  "cement-flexural": CementFlexuralCard as unknown as ParamModelComponent,
  "cement-compress": CementCompressCard as unknown as ParamModelComponent,
  "rebar-welding-tensile":
    RebarWeldingTensileCard as unknown as ParamModelComponent,
  "rebar-welding-bend": RebarWeldingBendCard as unknown as ParamModelComponent,
  "rebar-mech-numeric": RebarMechNumericCard as unknown as ParamModelComponent,
  "particle-gradation": ParticleGradationCard as unknown as ParamModelComponent,
  "soil-compaction": SoilCompactionCard as unknown as ParamModelComponent,
  "soil-compaction-degree":
    SoilCompactionDegreeCard as unknown as ParamModelComponent,
};

export function resolveParamInterfaceModel(key?: string): ParamModelComponent {
  return (
    (key && MODEL_REGISTRY[key]) ||
    (MODEL_REGISTRY["default"] as ParamModelComponent)
  );
}