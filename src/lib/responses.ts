// 防御性列表响应归一器（lab-vue 镜像 lab-react/src/lib/responses.ts）。
//
// 把后端可能返回的 3 种形状统一成 `{ items, total }`：
//  1) 裸数组 `T[]`         — msw handler 直返 / SpringBoot 旧版裸 List
//  2) 完整 Page<T>          — `{ items, page, pageSize, total }`：当前契约
//  3) 短 envelope           — `{ items, total }`：junction GET 旧 wrap
//
// lab-vue 的 features/inspection-capability/InspectionCapabilityList.vue 与
// ParameterStandardLinkDialog.vue 之前直接读 `res.data?.items` 与 `Array.isArray(...)`
// 双形态 fallback，逻辑分散。该 adapter 把 fallback 收敛到一处。
//
// 不要塞进 src/api/legacy-client.ts（那是 API_ROUTES 常量 + 注释）；
// 不要放在 src/api/（orval 生成的领地）。

import type { AxiosResponse } from "axios";

export interface ListEnvelope<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
}

function isBareArray<T>(x: unknown): x is T[] {
  return Array.isArray(x);
}

function isEnvelope<T>(x: unknown): x is ListEnvelope<T> {
  if (typeof x !== "object" || x === null) return false;
  const obj = x as { items?: unknown; total?: unknown };
  return Array.isArray(obj.items) && typeof obj.total === "number";
}

/**
 * 把任意 `{bare array | full Page<T> | short envelope}` 归一成 `{items, total}`。
 * 非数组也非 envelope 时返回空（避免 undefined 抛错）。
 */
export function normalizeListResponse<T>(raw: unknown): { items: T[]; total: number } {
  if (isBareArray<T>(raw)) {
    return { items: raw, total: raw.length };
  }
  if (isEnvelope<T>(raw)) {
    return { items: raw.items, total: raw.total };
  }
  return { items: [], total: 0 };
}

/** AxiosResponse 友好入口：传入 axios 返回的整个 response，直接拿归一后数据。 */
export function unwrapListResponse<T>(
  res: AxiosResponse<unknown>,
): { items: T[]; total: number } {
  return normalizeListResponse<T>(res.data);
}