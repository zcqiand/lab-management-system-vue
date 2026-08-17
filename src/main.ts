import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import App from "./App.vue";
import { router } from "./router";
import { installHttpClient } from "./api/http-client";
import { hydrateAuth } from "./state/auth";
import { TOKEN_STORAGE_KEYS } from "./api/contracts";
import "./index.css";

async function bootstrap() {
  const app = createApp(App);
  const pinia = createPinia();
  app.use(pinia);

  // axios 拦截器：baseUrl 走 backend-config 单例，token 走契约 key lab.accessToken
  installHttpClient(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEYS.accessToken);
    } catch {
      return null;
    }
  });

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  app.use(VueQueryPlugin, { queryClient });

  app.use(router);
  app.mount("#app");

  // pinia 就绪后恢复会话（anonymous | awaiting_tenant | authenticated）
  void hydrateAuth();
}

bootstrap();
