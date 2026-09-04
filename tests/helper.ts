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
        // 两个 portal stub，都**渲染默认插槽**（不像 `teleport: true` 那样丢 children）：
        //
        //  - `teleport`：Vue 内置 <Teleport>。原来是 no-op stub，内容被丢掉，
        //    业务测试没法断言浮层内容。改成渲染 slot 的 <div data-teleport-stub>，
        //    既避开 Teleport 找不到 body 目标的报错，内容又留在 wrapper 子树里。
        //    标识符 `data-teleport-stub` 与仓内 12 处 per-test stub 对齐。
        //  - `DialogPortal`：reka-ui 的 portal 组件。它内部走 Teleport 把内容送进
        //    document.body，wrapper.find 就扫不到；直接按组件名 stub 掉最稳，
        //    shadcn-vue Dialog/Sheet/AlertDialog 都靠它。
        //
        // per-test 想要真 portal 行为，传 `global: { stubs: { teleport: false } }` 覆盖。
        teleport: { template: "<div data-teleport-stub><slot /></div>" },
        DialogPortal: { template: "<div data-teleport-stub><slot /></div>" },
        ...(options.global?.stubs ?? {}),
      },
    },
  });
}
