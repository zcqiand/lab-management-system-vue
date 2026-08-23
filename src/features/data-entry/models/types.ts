// 参数界面模型卡片的统一契约（vue 仓 Batch 2B-8 满版 12 卡）。
//
// 镜像 react 仓 models/types.ts（full 版）：
// - ParamModelProps 含 calcRule + crossRecord 入参（比值卡用）
// - CrossRecordInput 描述强屈比/超强比比值卡的跨记录联立入参
//
// 类型继续放 models/ 跨 SFC 共享；SFC 内只 import 类型 + 算法域函数。

import type { VNode } from "vue";
import type { TestRecord } from "@/api/endpoints/endpoints.schemas";

/**
 * 钢筋力学性能「比值卡」（强屈比/超强比）跨记录联立入参。
 * 由 EntryModal 从同一样品已保存的 IP-0087/IP-0086 记录 + 技术要求解析而来。
 */
export interface CrossRecordInput {
  tensileStrengths?: number[];
  yieldStrengths?: number[];
  specStandardYield?: number;
}

/** 检测参数对象（subset of InspectionParameter，仅 model 卡关心字段）。 */
export interface ParamParameter {
  code: string;
  name: string;
  canonicalName?: string;
  unit?: string;
  methodText?: string;
}

/** 检测标准（subset of InspectionStandard）。 */
export interface ParamStandard {
  code: string;
  name?: string;
}

/** 检测标准参数关联（subset of InspectionStandardParameter）。 */
export interface ParamStandardParam {
  inspectionParameterCode: string;
  inspectionStandardCode: string;
}

/** 技术要求（subset of InspectionTechnicalRequirement）。 */
export interface ParamTechReq {
  id?: string;
  inspectionParameterCode: string;
  unit?: string;
  valueType?: string;
  comparison?: string;
  minValue?: number | null;
  maxValue?: number | null;
  targetValue?: string | number | null;
  expression?: string;
  remark?: string;
  verificationStatus?: string;
}

/** 所有参数界面模型组件的统一契约。 */
export interface ParamModelProps {
  parameter: ParamParameter;
  record: TestRecord | undefined;
  sampleId: string;
  standards: ParamStandard[];
  stdParams: ParamStandardParam[];
  techReqs: ParamTechReq[];
  config: Record<string, unknown> | undefined;
  /** 该参数的计算方法（M06.F05）；仅取 specimenCount 驱动「做几组数据」。 */
  calcRule?: { specimenCount: number };
  /** 比值卡（强屈比/超强比）的跨记录联立入参；非比值卡忽略。 */
  crossRecord?: CrossRecordInput;
  /** 把改动上报给父组件（EntryModal）合并入 dirty 缓冲，由保存按钮统一落库。 */
  onChange: (patch: Partial<TestRecord>) => void;
  /** 只读模式（详情页用）：所有输入/select 灰化 + onChange 被吞掉。 */
  readOnly?: boolean;
}

export type ParamModelComponent = (props: ParamModelProps) => VNode;