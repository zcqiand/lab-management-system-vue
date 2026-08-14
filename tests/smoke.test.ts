// v0.1.0 scaffold smoke test — 验证基础工具链 + 一个组件挂载路径。
// 不挂功能 ID（fixture 只在 /tree-change 提案批准后才上 ID）。
import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../src/App.vue";

describe("scaffold smoke", () => {
  it("mounts App.vue with single <router-view />", () => {
    const wrapper = mount(App, {
      global: {
        stubs: {
          "router-view": { template: "<div data-testid=\"router-view\" />" },
        },
      },
    });
    expect(wrapper.find("[data-testid=router-view]").exists()).toBe(true);
  });

  it("installHttpClient returns singleton axios instance", async () => {
    const { installHttpClient } = await import("../src/api/http-client");
    const a = installHttpClient();
    const b = installHttpClient();
    expect(a).toBe(b);
    expect(typeof a.get).toBe("function");
  });
});
