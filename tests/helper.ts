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
        ...(options.global?.stubs ?? {}),
        teleport: true,
      },
    },
  });
}
