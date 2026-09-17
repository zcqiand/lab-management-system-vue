// FlowActionRequest.operator / CreateSampleReceiptRequest.receivedBy 的身份来源。
//
// ADR-0019：业务身份字段缺失必须报错，不许 fallback demo 字面量
// （旧的 "current-user" 占位已按此规则清除）。流程动作的操作人取自
// pinia auth store 的 authenticated 态 user.username；未登录直接 throw。
import { useAuthStore } from "@/state/auth";

export function currentOperator(): string {
  const s = useAuthStore().authState;
  if (s.kind !== "authenticated") {
    throw new Error("流程操作需要已登录会话（operator 取自 authState.user.username）");
  }
  return s.value.user.username;
}
