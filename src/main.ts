import { createApp } from "vue";
import { createPinia } from "pinia";
import { VueQueryPlugin, QueryClient } from "@tanstack/vue-query";
import App from "./App.vue";
import { router } from "./router";
import { installHttpClient } from "./api/http-client";
import "./index.css";

async function bootstrap() {
  const app = createApp(App);
  app.use(createPinia());

  // Install http-client first so any query that runs on mount has baseURL set.
  installHttpClient();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  app.use(VueQueryPlugin, { queryClient });

  app.use(router);
  app.mount("#app");
}

bootstrap();
