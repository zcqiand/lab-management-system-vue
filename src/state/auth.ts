// AuthContext — Sprint 1 前端绑定契约的 Vue 实现（pinia defineStore，不是 provide/inject）。
//
// 契约（shared tsp/contracts/frontend-bind.tsp，TS 签名见 .state/decision-log.md §2.2）：
//   AuthState 4 态 FSM: idle → anonymous → awaiting_tenant → authenticated
//   行为: login / logout / refresh / switchTenant / hasPermission / onChange
//
// 实现要点（与 react 仓 auth-context.tsx 镜像）：
//   - pinia store 是状态真相；FSM 动作写成 store 外的模块级函数（$patch 推进状态），
//     与 react 版「模块级 store + Context 视图层」同构 — node 测试环境无需组件树即可驱动。
//   - FSM 转移（decision-log open_questions 留白，react 仓已落成显式表，此处镜像）：
//       idle        --hydrate()-->            anonymous | authenticated
//       anonymous   --login() 成功-->          awaiting_tenant（多租户）| authenticated（单租户）
//       awaiting_tenant --switchTenant()-->    authenticated
//       authenticated --switchTenant()-->      awaiting_tenant（换租户走契约同路径）
//       *           --logout()-->              anonymous
//       authenticated --refresh() 401-->       anonymous
//   - 持久化 key 全部来自 TOKEN_STORAGE_KEYS 契约常量（lab.*）。
//   - permissions 缓存 TTL 5 分钟（decision-log §4 风险表约定），
//     switchTenant / logout 主动失效。

import { defineStore } from "pinia";
import {
  authGetCurrentUser,
  authGetPermissions,
  authLogin,
  authLogout,
  authRefresh,
  authSwitchTenant,
} from "@/api/endpoints/endpoints";
import type {
  ErrorResponse,
  LoginRequest,
  LoginResponse,
  MyTenant,
  SwitchTenantRequest,
} from "@/api/endpoints/endpoints.schemas";
import { TOKEN_STORAGE_KEYS, type AuthState, type UnsubscribeFn } from "@/api/contracts";
import { toApiError } from "@/api/http-client";

// ---------------------------------------------------------------------------
// pinia store — 状态真相
// ---------------------------------------------------------------------------

const IDLE: AuthState = { kind: "idle", value: { kind: "idle" } };
const ANON: AuthState = { kind: "anonymous", value: { kind: "anonymous" } };

const PERMISSIONS_TTL_MS = 5 * 60 * 1000;

export const useAuthStore = defineStore("auth", {
  state: () => ({
    authState: IDLE as AuthState,
  }),
  getters: {
    /** AuthContext 契约的 state 字段（避免消费方写 store.authState） */
    state(state): AuthState {
      return state.authState;
    },
  },
});

// -- onChange 订阅（契约行为；listener 列表模块级，与 pinia 实例无关）------------

const listeners = new Set<(s: AuthState) => void>();

function setState(next: AuthState): void {
  const store = useAuthStore();
  store.authState = next;
  for (const l of listeners) l(next);
}

function subscribe(handler: (s: AuthState) => void): UnsubscribeFn {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

/** 契约 onChange 的裸暴露（测试 / 非 Vue 消费方用） */
export const onAuthChange = subscribe;

// -- localStorage 读写（key 名锁在 TOKEN_STORAGE_KEYS）-----------------------

// 存储介质探测：优先 window.localStorage（浏览器），node 测试环境退裸 localStorage 全局。
// 与其判 window 不如直接探测介质本身 — SSR / vitest node env 都能走对。
function storageOf(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // 访问 localStorage 本身抛异常（隐私模式）— 视为不可用
  }
  return null;
}

function readKey(key: string): string | null {
  const s = storageOf();
  if (!s) return null;
  try {
    return s.getItem(key);
  } catch {
    return null;
  }
}
function writeKey(key: string, value: string | null): void {
  const s = storageOf();
  if (!s) return;
  try {
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // 隐私模式等场景 localStorage 不可用 — 静默降级为会话内状态
  }
}

function persistTokens(resp: LoginResponse): void {
  writeKey(TOKEN_STORAGE_KEYS.accessToken, resp.token);
  if (resp.refreshToken) writeKey(TOKEN_STORAGE_KEYS.refreshToken, resp.refreshToken);
  else writeKey(TOKEN_STORAGE_KEYS.refreshToken, null);
}

function clearPersisted(): void {
  for (const key of Object.values(TOKEN_STORAGE_KEYS)) writeKey(key, null);
}

// -- authenticated 态所需 permissions 缓存 ------------------------------------
// 独立于 AuthState（契约里 permissions 在 state 内），缓存层是纯优化：
// TTL + 主动失效（switchTenant/logout）。state.permissions 仍是判断源。

let permissionsCache: { value: string[]; fetchedAt: number } | null = null;

function invalidatePermissions(): void {
  permissionsCache = null;
  writeKey(TOKEN_STORAGE_KEYS.permissionsCache, null);
}

// @entry M01.F04.I02
async function fetchPermissions(token: string): Promise<string[]> {
  if (permissionsCache && Date.now() - permissionsCache.fetchedAt < PERMISSIONS_TTL_MS) {
    return permissionsCache.value;
  }
  const resp = await authGetPermissions({
    headers: { Authorization: `Bearer ${token}` },
  });
  const value: string[] = resp.data.permissions ?? [];
  permissionsCache = { value, fetchedAt: Date.now() };
  writeKey(TOKEN_STORAGE_KEYS.permissionsCache, JSON.stringify(value));
  return value;
}

// -- FSM 动作（模块级，store 只是暴露）--------------------------------------

export function isErrorResponse(v: unknown): v is ErrorResponse {
  return typeof v === "object" && v !== null && "code" in v && "message" in v;
}

/** login 成功后的共同落位：单租户直进 authenticated，多租户进 awaiting_tenant */
async function settleLogin(resp: LoginResponse): Promise<void> {
  persistTokens(resp);
  const tenantId = readKey(TOKEN_STORAGE_KEYS.activeTenantId);
  const tenants: MyTenant[] = resp.tenants ?? [];
  const remembered = tenants.find((t) => t.tenantId === tenantId);
  const single = tenants.length === 1 ? tenants[0] : undefined;
  const target = remembered ?? single;
  if (target) {
    writeKey(TOKEN_STORAGE_KEYS.activeTenantId, target.tenantId);
    const permissions = await fetchPermissions(resp.token).catch(() => [] as string[]);
    setState({
      kind: "authenticated",
      value: {
        kind: "authenticated",
        user: resp.user,
        tenant: target,
        permissions,
        tokenExpiresAt: Date.now() + 30 * 60 * 1000,
      },
    });
  } else {
    setState({
      kind: "awaiting_tenant",
      value: { kind: "awaiting_tenant", user: resp.user, tenants },
    });
  }
}

async function doLogin(req: LoginRequest): Promise<LoginResponse | ErrorResponse> {
  try {
    const resp = await authLogin(req);
    await settleLogin(resp.data);
    return resp.data;
  } catch (err) {
    return { code: "LOGIN_FAILED", message: toApiError(err).message };
  }
}

/** LoginPage 等组件消费的 login 入口（契约行为） */
export const login = doLogin;

/** SSO 场景直接落会话（镜像 react 仓 setSession；token 直达时只带 token+user） */
async function doSetSession(partial: {
  accessToken: string;
  refreshToken?: string;
  user?: LoginResponse["user"];
  tenants?: LoginResponse["tenants"];
}): Promise<void> {
  const refreshToken =
    partial.refreshToken ?? readKey(TOKEN_STORAGE_KEYS.refreshToken);
  if (!refreshToken || !partial.user) {
    throw new Error("setSession requires accessToken + user + refreshToken");
  }
  await settleLogin({
    token: partial.accessToken,
    refreshToken,
    user: partial.user,
    tenants: partial.tenants ?? [],
  });
}

export const setSession = doSetSession;

async function doLogout(): Promise<void> {
  const token = readKey(TOKEN_STORAGE_KEYS.accessToken);
  if (token) {
    await authLogout({ token }).catch(() => undefined);
  }
  clearPersisted();
  invalidatePermissions();
  setState(ANON);
}

/** AppShell 等组件消费的 logout 入口（契约行为） */
export const logout = doLogout;

async function doRefresh(): Promise<LoginResponse | ErrorResponse> {
  const refreshToken = readKey(TOKEN_STORAGE_KEYS.refreshToken);
  if (!refreshToken) {
    setState(ANON);
    return { code: "NO_REFRESH_TOKEN", message: "无 refreshToken，退回匿名态" };
  }
  try {
    const resp = await authRefresh({ refreshToken });
    await settleLogin(resp.data);
    return resp.data;
  } catch {
    // 契约：401 时退到 anonymous
    clearPersisted();
    invalidatePermissions();
    setState(ANON);
    return { code: "REFRESH_FAILED", message: "刷新失败，退回匿名态" };
  }
}

async function doSwitchTenant(req: SwitchTenantRequest): Promise<LoginResponse | ErrorResponse> {
  const current = useAuthStore().authState;
  if (current.kind !== "awaiting_tenant" && current.kind !== "authenticated") {
    return { code: "WRONG_STATE", message: "switchTenant 仅在 awaiting_tenant / authenticated 态可调" };
  }
  try {
    const resp = await authSwitchTenant(req);
    writeKey(TOKEN_STORAGE_KEYS.activeTenantId, req.tenantId);
    invalidatePermissions();
    await settleLogin(resp.data);
    return resp.data;
  } catch (err) {
    return { code: "SWITCH_TENANT_FAILED", message: toApiError(err).message };
  }
}

function currentState(): AuthState {
  return useAuthStore().authState;
}

/** switchTenant 入口（契约行为；选租户页已移除，M00.F02 保持规划态由测试消费） */
export const switchTenant = doSwitchTenant;

function doHasPermission(perm: string): boolean {
  const s = currentState();
  return s.kind === "authenticated" ? s.value.permissions.includes(perm) : false;
}

// -- hydrate：App mount 时把 localStorage 恢复成 authenticated ------------------

/** 从持久化 token 恢复会话；无 token 落 anonymous。仅 mount 时调一次。 */
export async function hydrateAuth(): Promise<void> {
  if (currentState().kind !== "idle") return;
  const token = readKey(TOKEN_STORAGE_KEYS.accessToken);
  if (!token) {
    setState(ANON);
    return;
  }
  try {
    const resp = await authGetCurrentUser({
      headers: { Authorization: `Bearer ${token}` },
    });
    const session = resp.data;
    const tenantId = readKey(TOKEN_STORAGE_KEYS.activeTenantId) ?? session.currentTenantId ?? undefined;
    const tenant = session.tenants.find((t) => t.tenantId === tenantId);
    if (tenant) {
      writeKey(TOKEN_STORAGE_KEYS.activeTenantId, tenant.tenantId);
      const permissions = await fetchPermissions(token).catch(() => [] as string[]);
      setState({
        kind: "authenticated",
        value: {
          kind: "authenticated",
          user: session.user,
          tenant,
          permissions,
          tokenExpiresAt: Date.now() + 30 * 60 * 1000,
        },
      });
    } else {
      setState({
        kind: "awaiting_tenant",
        value: { kind: "awaiting_tenant", user: session.user, tenants: session.tenants },
      });
    }
  } catch {
    // token 已失效 — 静默刷新一次，仍失败落 anonymous
    await doRefresh();
  }
}

// -- 测试专用入口：模块级行为函数 + 当前状态读取 -------------------------------
// authLogin 等走 axios，测试在 vitest 里 vi.mock("axios") 即可拦住；
// 这些导出让 node 环境测试无需组件树就能驱动 FSM。
// 注意：pinia 需要 active 实例 — 测试里 setActivePinia(createPinia())。

export const __testActions = {
  login: doLogin,
  logout: doLogout,
  refresh: doRefresh,
  switchTenant: doSwitchTenant,
  hasPermission: doHasPermission,
};

export function __testState(): AuthState {
  return currentState();
}

export function __testReset(): void {
  useAuthStore().$reset();
  listeners.clear();
  permissionsCache = null;
}
