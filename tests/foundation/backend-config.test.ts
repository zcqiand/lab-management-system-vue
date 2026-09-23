// backend-config 运行时后端选择（2026-09-23 用户裁定恢复，收窄 ADR-0014）。
//
// 语义：KNOWN_BACKENDS 注册表（nextjs/aspnetcore/springboot，msw 已删）是唯一
// 合法集合；localStorage 覆盖（lab.backend.override）优先于 env 缺省；
// 未知 mode 写覆盖必须 throw（防 localStorage 手改残留脏值静默失效）。

import { describe, it, expect, beforeEach } from "vitest";
import {
  KNOWN_BACKENDS,
  clearBackendOverride,
  getActiveBackend,
  getApiBaseUrl,
  getApiMode,
  setBackendOverride,
} from "@/api/backend-config";

beforeEach(() => {
  localStorage.clear();
});

describe("backend-config 运行时后端选择", () => {
  it("注册表 = 三后端（msw 仓 2026-09-17 已删不在列）", () => {
    expect(KNOWN_BACKENDS.map((b) => b.mode)).toEqual(["nextjs", "aspnetcore", "springboot"]);
    expect(KNOWN_BACKENDS.map((b) => b.baseUrl)).toEqual([
      "http://localhost:5201",
      "http://localhost:5204",
      "http://localhost:5205",
    ]);
  });

  it("无覆盖时回落 env 配置（getApiBaseUrl/getApiMode 读同一活动后端）", () => {
    const active = getActiveBackend();
    expect(getApiBaseUrl()).toBe(active.baseUrl);
    expect(getApiMode()).toBe(active.mode);
  });

  it("setBackendOverride 写覆盖 → 活动/URL/mode 全部落被选后端 + localStorage 持久化", () => {
    setBackendOverride("springboot");
    expect(localStorage.getItem("lab.backend.override")).toBe("springboot");
    expect(getApiBaseUrl()).toBe("http://localhost:5205");
    expect(getApiMode()).toBe("springboot");

    setBackendOverride("aspnetcore");
    expect(getApiBaseUrl()).toBe("http://localhost:5204");
    expect(getApiMode()).toBe("aspnetcore");
  });

  it("clearBackendOverride 移除覆盖 → 回落 env", () => {
    setBackendOverride("springboot");
    clearBackendOverride();
    expect(localStorage.getItem("lab.backend.override")).toBeNull();
    const active = getActiveBackend();
    expect(getApiBaseUrl()).toBe(active.baseUrl);
    expect(getApiMode()).toBe(active.mode);
  });

  it("未知 mode throw（注册表外不落盘）", () => {
    expect(() => setBackendOverride("msw" as Parameters<typeof setBackendOverride>[0])).toThrow();
    expect(localStorage.getItem("lab.backend.override")).toBeNull();
  });
});
