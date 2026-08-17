// Backend store — 运行时后端切换（msw / aspnetcore / springboot / nextjs）。
//
// 设计（与 react 仓 backend-context.tsx 镜像）：
//   - 配置存 localStorage["lab.backend"]
//   - store 初始化时 hydrate 进模块级单例（backend-config.ts）
//   - setBackend / setBaseUrl 同步写单例 + localStorage
//   - 非 msw 后端：fetch 走对应 baseUrl；MSW worker 不启用
//   - msw 后端：fetch 同源，worker 拦截
//   - nextjs 后端：fetch 同源，命中 ../lab-management-system-nextjs 的 API routes
//
// 默认值：msw（dev 下零配置即可跑）。

import { defineStore } from "pinia";
import {
  BACKEND_DEFAULT_BASE_URLS,
  hydrateBackendConfig,
  type BackendMode,
} from "@/api/backend-config";

const STORAGE_KEY = "lab.backend";

interface PersistedConfig {
  backend?: BackendMode;
  baseUrls?: Partial<Record<BackendMode, string>>;
}

function loadPersisted(): PersistedConfig {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedConfig;
    return {
      backend: parsed.backend,
      baseUrls: parsed.baseUrls,
    };
  } catch {
    return {};
  }
}

function savePersisted(value: PersistedConfig): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export const useBackendStore = defineStore("backend", {
  state: () => {
    // 同步从 localStorage hydrate；hydrate 同时把模块级单例（backend-config）也同步刷新，
    // 否则 axios 拦截器拿到的 baseUrl 还是默认 msw
    const persisted = loadPersisted();
    hydrateBackendConfig(persisted);
    return {
      backend: (persisted.backend ?? "msw") as BackendMode,
      baseUrls: { ...BACKEND_DEFAULT_BASE_URLS, ...(persisted.baseUrls ?? {}) } as Record<
        BackendMode,
        string
      >,
    };
  },
  getters: {
    baseUrl(state): string {
      return state.baseUrls[state.backend];
    },
  },
  actions: {
    persist(next: { backend: BackendMode; baseUrls: Record<BackendMode, string> }) {
      hydrateBackendConfig(next);
      savePersisted(next);
    },
    setBackend(mode: BackendMode) {
      this.backend = mode;
      this.persist({ backend: mode, baseUrls: { ...this.baseUrls } });
    },
    setBaseUrl(mode: BackendMode, url: string) {
      this.baseUrls = { ...this.baseUrls, [mode]: url };
      this.persist({ backend: this.backend, baseUrls: { ...this.baseUrls } });
    },
    resetBaseUrls() {
      this.baseUrls = { ...BACKEND_DEFAULT_BASE_URLS };
      this.persist({ backend: this.backend, baseUrls: { ...this.baseUrls } });
    },
  },
});
