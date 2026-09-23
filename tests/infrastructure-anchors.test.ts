import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { fnTest } from "./fn";

// 接入点存在性 smoke（ADR-0033 阶段二：M98 infra 段自 function-tree 退役，
// M98 锚点解挂为普通 it（标题去 ID 字面防 fnReporter 误吸）；M03.F01.I07 保留）。
const SRC = path.resolve(__dirname, "..");

describe("Infrastructure anchor registration", () => {
  fnTest(["M03.F01.I07"], "[M03.F01.I07] SampleExtFieldsModal module source file exists", () => {
    expect(fs.existsSync(path.join(SRC, "src/features/data-entry/SampleExtFieldsModal.vue"))).toBe(
      true,
    );
  });

  it("BackendSwitcher module source file exists (2026-09-23 用户裁定恢复后端切换)", () => {
    expect(fs.existsSync(path.join(SRC, "src/components/app/BackendSwitcher.vue"))).toBe(true);
  });

  it("axios interceptor module source file exists", () => {
    expect(fs.existsSync(path.join(SRC, "src/api/http-client.ts"))).toBe(true);
  });

  it("orval-generated auth endpoint directory exists", () => {
    expect(fs.existsSync(path.join(SRC, "src/api/endpoints"))).toBe(true);
  });
});
