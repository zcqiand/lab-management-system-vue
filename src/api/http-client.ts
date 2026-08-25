// HTTP client — axios + 1:1 endpoint mapping via local orval codegen.
//
// 端点 1:1 映射由 src/api/endpoints/endpoints.ts 提供（orval 从
// ../lab-management-system-shared/generated/openapi/openapi.yaml 生成，
// 产物直接 import 全局 axios — 所以拦截器也装在全局 axios 上，与 react 仓同构）。
// 本文件做两件事：
//   1) 装 axios 拦截器：每次请求从部署期配置（VITE_API_BASE_URL）拿 baseUrl，
//      从 getToken callback 拿 token，写进 Authorization 头
//   2) 提供 ApiError 封装（错误统一走 toApiError）
//
// ADR-0014：runtime baseUrl 已废弃，改走 env-driven 单 URL。

import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { getApiBaseUrl } from "./backend-config";

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown, message?: string) {
    super(message ?? `API ${status}`);
    this.status = status;
    this.body = body;
  }
}

/** 从 axios 错误构造 ApiError（响应体里的 ErrorResponse 直接透传） */
export function toApiError(err: unknown): ApiError {
  if (axios.isAxiosError(err)) {
    const axErr = err as AxiosError<unknown>;
    return new ApiError(axErr.response?.status ?? 0, axErr.response?.data ?? null, axErr.message);
  }
  if (err instanceof ApiError) return err;
  if (err instanceof Error) return new ApiError(0, null, err.message);
  return new ApiError(0, null, String(err));
}

/**
 * 注入运行时 baseUrl + Bearer token。
 * 在 main.ts 启动时调一次；getToken 用 callback 形式避免循环依赖。
 */
export function installHttpClient(getToken: () => string | null): void {
  axios.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (!config.baseURL) {
      config.baseURL = getApiBaseUrl();
    }
    const token = getToken();
    if (token) {
      config.headers.set("Authorization", `Bearer ${token}`);
    }
    // 跨源后端（aspnetcore/springboot）的 SSO state cookie 依赖 withCredentials：
    // cookie 是跨源 HttpOnly（lab-aspnetcore 域），XHR 默认不携带；
    // 后端 CORS 已配 AllowCredentials（labFrontend policy）。
    // 镜像 lab-react src/api/http-client.ts 同款。
    config.withCredentials = true;
    return config;
  });
}

export { getApiBaseUrl, getApiMode } from "./backend-config";