import { test as base } from "vitest";

// fnTest — 把功能子项 ID 写进测试名（vue 仓机制：fnReporter 从测试名提取
// M\d{2}(.F\d{2}(.I\d{2})?)? 模式，见 tests/fnReporter.ts；react 仓走 TaskMeta.fn，
// 两侧机制不同但对齐矩阵等价）。
//
// 契约：被 skip 的测试不会执行，名字照样带着 ID — fnReporter 对 skip 标 inert，
// 假绿在物理上不可能发生。这不是靠纪律，是靠机制。
//
//   fnTest(["M01.F05.I01"], "登录成功", () => { ... });
//
// 纪律部分（机器管不了的）：
//   - 只在测试直接验证该子项可观察行为时才挂 ID
//   - 间接受益不挂
//   - 工程设施的测试不挂任何业务 ID
//   - 一个测试挂 3 个以上 ID，通常说明它测得太宽
export function fnTest(ids: string[], name: string, body: () => void | Promise<void>) {
  const tag = ids.map((id) => `[${id}]`).join("");
  return base(`${tag} ${name}`, body);
}
