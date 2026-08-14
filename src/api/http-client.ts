import axios, { type AxiosInstance } from "axios";

// v0.1.0 scaffold: 单实例 axios + 内存级 baseURL。
// 后续 /tree-change 加 M00 登录态时，会引入 getAccessToken callback + tenant
// interceptor，与 saas-vue 同款（lab-shared/spawn backend 模式）。

let httpInstance: AxiosInstance | null = null;

export function installHttpClient(): AxiosInstance {
  if (httpInstance) return httpInstance;

  httpInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api",
    timeout: 15000,
  });

  return httpInstance;
}

export function getHttpClient(): AxiosInstance {
  if (!httpInstance) {
    throw new Error("http-client not installed — call installHttpClient() at bootstrap");
  }
  return httpInstance;
}
