// vitest setup — minimal. v0.1.0 scaffold has no real tests yet;
// 仅清 Pinia + localStorage 防止后续 /tree-change 加挂测试时崩。
import { afterEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";

afterEach(() => {
  setActivePinia(createPinia());
  localStorage.clear();
});
