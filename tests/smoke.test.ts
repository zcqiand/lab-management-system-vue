// 工具链 smoke test — 验证基础组件挂载路径 + http-client 拦截器安装。
// 不挂功能 ID（工程设施测试）。
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

  it("installHttpClient 装全局 axios 拦截器（幂等可重复调用）", async () => {
    const { installHttpClient } = await import("../src/api/http-client");
    // Sprint 1 起签名带 getToken callback；拦截器装在全局 axios（orval 产物直连全局）
    expect(() => installHttpClient(() => null)).not.to.throw();
    expect(() => installHttpClient(() => null)).not.to.throw();
  });
});
