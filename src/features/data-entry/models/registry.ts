// 参数界面模型注册表（vue 仓镜像 react 仓 Batch 2B-2）。
import type { ParamModelComponent } from "./types";
import DefaultParamCard from "./DefaultParamCard.vue";
import CementCompressCard from "./CementCompressCard.vue";

export const MODEL_REGISTRY: Record<string, ParamModelComponent> = {
  default: DefaultParamCard as unknown as ParamModelComponent,
  "cement-compress": CementCompressCard as unknown as ParamModelComponent,
};

export function resolveParamInterfaceModel(key?: string): ParamModelComponent {
  return (key && MODEL_REGISTRY[key]) || (MODEL_REGISTRY["default"] as ParamModelComponent);
}