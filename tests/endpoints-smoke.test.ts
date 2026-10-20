// Smoke test: verify orval-generated API client from shared contract is wired.
// 与 react 仓 endpoints-smoke.test.ts 同款契约：只断言生成产物存在（typeof），
// 行为语义由后端仓/契约测试覆盖（vue 仓内 auth-fsm.test.ts 管 FSM 层）。
import { describe, expect } from "vitest";
import { fnTest } from "./fn";
import * as auth from "../src/api/endpoints/auth/auth";

describe("shared contract client smoke", () => {
  // REQ-2026-023：原生登录代理通道，orval 自 shared 契约生成（I06 与 I01 同源生成层）
  fnTest(["M01.F05.I06"], "auth native-login endpoint generated", () => {
    expect(typeof auth.authNativeLogin).toBe("function");
    expect(typeof auth.getAuthNativeLoginMutationOptions).toBe("function");
  });
});
