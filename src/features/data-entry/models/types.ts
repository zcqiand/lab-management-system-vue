// 参数界面模型卡片的统一契约（vue 仓镜像 react 仓 Batch 2B-2）。
//
// 类型继续内联进 SFC 顶部模式不适用（类型跨 SFC 共享），单独放在 models/types.ts。

import type { VNode } from "vue";
// 镜像 react 仓 Batch 2B-2 模型：通用兜底 + 水泥抗压示例
// 真实类型从 shared types 取，避免重复定义（与 react 仓同型但跨仓不放共享仓）

// 占位接口（vue 仓无 src/types/，类型在 features 内引用时再具体化）
export interface ParamModelProps {
  parameter: {
    code: string;
    name: string;
    canonicalName?: string;
    unit?: string;
  };
  record: TestRecordLike | undefined;
  sampleId: string;
  standards: Array<{ code: string; name?: string }>;
  stdParams: Array<{ inspectionParameterCode: string; inspectionStandardCode: string }>;
  techReqs: Array<{
    id: string;
    inspectionParameterCode: string;
    unit?: string;
    valueType?: string;
    comparison?: string;
    minValue?: number;
    maxValue?: number;
    targetValue?: string | number;
    expression?: string;
    remark?: string;
  }>;
  config: Record<string, unknown> | undefined;
  onChange: (patch: Partial<TestRecordLike>) => void;
  readOnly?: boolean;
}

export interface TestRecordLike {
  id?: string;
  sampleId: string;
  parameterCode: string;
  result?: string;
  verdict?: string;
  standardCode?: string;
  requirementCode?: string;
  requirement?: string;
}

export type ParamModelComponent = (props: ParamModelProps) => VNode;