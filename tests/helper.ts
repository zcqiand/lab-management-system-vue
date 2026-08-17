// tests/helper.ts — mount components with Pinia + VueQueryPlugin + Router
//
// v0.1.0 scaffold: helper 现成就位，业务页后续按 /tree-change 加页面时直接复用。
import { mount, type MountingOptions } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createMemoryHistory } from "vue-router";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import type { Component } from "vue";

export function mountWithProviders(
  component: Component,
  options: MountingOptions<any> & { router?: { initialRoute?: string } } = {},
) {
  const pinia = createPinia();
  setActivePinia(pinia);

  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/:pathMatch(.*)*", component: { template: "<div />" } }],
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  if (options.router?.initialRoute) {
    router.push(options.router.initialRoute).catch(() => {});
  }

  return mount(component, {
    ...options,
    global: {
      ...options.global,
      plugins: [
        pinia,
        router,
        [VueQueryPlugin, { queryClient }],
        ...(options.global?.plugins ?? []),
      ],
      stubs: {
        // 默认 stub Teleport（no-op，丢弃 children），避免 Teleport 找 body 报错；
        // 业务组件若需要在测试里验证 Teleport 子内容，per-test 传
        // `global: { stubs: { teleport: false } }` 覆盖。
        teleport: true,
        ...(options.global?.stubs ?? {}),
      },
    },
  });
}
