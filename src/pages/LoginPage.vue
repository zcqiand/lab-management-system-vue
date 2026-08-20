<script setup lang="ts">
// @entry M01.F05.I03
// LoginPage — M01.F05.io（SSO OAuth 2.0 授权码流）纯 orchestrator，镜像 react 仓 /login。
//
// 对齐 nextjs 模型（2026-08-19 OAuth 2.0 收口）：登录全部委托 saas 身份平台走
// OAuth 2.0 授权码模式（RFC 6749），lab 后端 confidential client（持 client_secret）。
// 两分支：
//   1. URL 带 ?code=&state=（saas 已授权）→ 验 state（防 CSRF）→ POST /api/auth/sso/callback
//      换 lab 自家 JWT（grant_type=authorization_code，client_secret 仅后端持有，
//      saas token 不出 lab 后端）→ setSession 进业务页
//   2. 无回调参数 → 生成 state 存 sessionStorage → GET /api/auth/sso/authorize
//      （response_type=code, client_id, redirect_uri, state）→ window.location 跳 saas
// 旧的 ?token= shortcut 已删除：不符合 OAuth 2.0 + 首登缺 refreshToken 必抛错。

import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { FlaskConical } from "lucide-vue-next";
import { useAuthStore, setSession } from "@/state/auth";
import { useBackendStore } from "@/state/backend";
import { BACKEND_REGISTRY_DEFAULT } from "@/api/contracts";
import { authSsoAuthorize, authSsoCallback } from "@/api/endpoints/endpoints";
import type { LoginResponse, OAuthGrantType, OAuthResponseType } from "@/api/endpoints/endpoints.schemas";

// OAuth 2.0 client_id：lab 在 saas 注册的应用标识。
// 真部署走部署期注入（env 或运行时远端 config）；当前单仓 demo 硬编码。
const OAUTH_CLIENT_ID = "lab";
const SSO_STATE_STORAGE_KEY = "lab.sso.state";

// 生成 OAuth 2.0 state 字符串（防 CSRF，RFC 6749 §10.12）。
function generateOauthState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// 计算 authorize/callback 的 redirect_uri：lab 自己绝对地址的 /login 路径
function computeRedirectUri(from: string | null): string {
  const callbackPath = from ? `/login?from=${encodeURIComponent(from)}` : "/login";
  if (typeof window === "undefined") return callbackPath;
  return `${window.location.origin}${callbackPath}`;
}

const auth = useAuthStore();
const backendStore = useBackendStore();
const route = useRoute();
const router = useRouter();

const status = ref("检查登录态…");

const from = computed(() => (typeof route.query.from === "string" ? route.query.from : null));

/** 只允许站内路径，防 open redirect（镜像 react 仓 sanitize-redirect 语义） */
function sanitizeRedirect(target: string | null): string {
  if (target && target.startsWith("/") && !target.startsWith("//")) return target;
  return "/";
}

const backend = computed(() => backendStore.backend);
const baseUrl = computed(() => backendStore.baseUrl);
const ssoEnabled = computed(
  () =>
    BACKEND_REGISTRY_DEFAULT.available.find((b) => b.id === backend.value)?.features.sso === true,
);

onMounted(() => {
  void (async () => {
    const st = auth.authState;
    // 已登录访问 /login → 直接回业务页
    if (st.kind === "authenticated") {
      void router.replace(sanitizeRedirect(from.value));
      return;
    }
    if (!ssoEnabled.value) {
      status.value = `当前 backend（${backend.value}）未启用 SSO，请切到 msw / nextjs 后端`;
      return;
    }
    if (st.kind !== "anonymous" && st.kind !== "idle") return;

    // 阶段 1：OAuth 2.0 授权码模式（RFC 6749 §4.1）
    // saas 回跳带 ?code=&state= → 验 state（防 CSRF）→ POST sso/callback 换 lab JWT
    const code = typeof route.query.code === "string" ? route.query.code : null;
    const stateParam = typeof route.query.state === "string" ? route.query.state : null;
    if (code && stateParam) {
      // 验 state：sessionStorage 存的 vs URL 回跳的必须一致（防 CSRF）
      const expectedState =
        typeof window !== "undefined" ? sessionStorage.getItem(SSO_STATE_STORAGE_KEY) : null;
      if (!expectedState || expectedState !== stateParam) {
        status.value = "state 校验失败（可能 session 过期或被攻击），请重新登录";
        sessionStorage.removeItem(SSO_STATE_STORAGE_KEY);
        return;
      }
      // state 验证通过立即清掉（一次性）
      sessionStorage.removeItem(SSO_STATE_STORAGE_KEY);
      // 清掉 URL 上的 code/state（防 reload 重复触发阶段 1）
      const cleanUrl =
        window.location.pathname +
        (route.query.from ? `?from=${encodeURIComponent(String(route.query.from))}` : "");
      window.history.replaceState(null, "", cleanUrl);

      status.value = "拿到 saas code，正在换 token…";
      try {
        const resp = await authSsoCallback({
          grant_type: "authorization_code" satisfies OAuthGrantType,
          code,
          redirect_uri: computeRedirectUri(from.value),
        });
        const data = resp.data;
        if (data.token) {
          await setSession({
            accessToken: data.token,
            user: data.user,
            tenants: data.tenants,
            refreshToken: data.refreshToken,
          });
          void router.replace(sanitizeRedirect(from.value));
        } else {
          status.value = "code 换 token 失败：响应无 token";
        }
      } catch (err) {
        status.value = `code 换 token 失败（${(err as Error).message ?? "unknown"}）`;
      }
      return;
    }

    // 阶段 2：无回调参数 → 调 authorize 让 saas 跳过来
    status.value = `未登录，正在跳 saas 身份平台（backend=${backend.value}）…`;
    const fromParam = from.value;
    const csrfState = generateOauthState();
    sessionStorage.setItem(SSO_STATE_STORAGE_KEY, csrfState);
    try {
      const resp = await authSsoAuthorize({
        response_type: "code" satisfies OAuthResponseType,
        client_id: OAUTH_CLIENT_ID,
        redirect_uri: computeRedirectUri(fromParam),
        state: csrfState,
      });
      const data = resp.data as { authorizeUrl?: string };
      const url = data?.authorizeUrl;
      if (url) {
        window.location.href = url;
      } else {
        status.value = "authorizeUrl 缺失，请检查 msw / saas 配置";
        sessionStorage.removeItem(SSO_STATE_STORAGE_KEY);
      }
    } catch (err) {
      status.value = `SSO 跳转失败（${(err as Error).message ?? "unknown"}）`;
      sessionStorage.removeItem(SSO_STATE_STORAGE_KEY);
    }
  })();
});
</script>

<template>
  <div class="bg-muted flex min-h-screen items-center justify-center p-4">
    <div class="bg-background w-full max-w-sm rounded-lg border p-8 shadow-sm">
      <div class="mb-6 flex flex-col items-center gap-2">
        <FlaskConical class="text-primary size-8" />
        <h1 class="text-xl font-semibold">实验室管理系统</h1>
        <p class="text-muted-foreground text-sm">SSO 登录（OAuth 2.0 授权码模式）</p>
      </div>
      <p class="text-muted-foreground mb-4 text-sm" data-testid="login-status">{{ status }}</p>
      <p class="text-muted-foreground/70 text-xs">
        流程：lab /login → saas /authorize → saas 登录 → 带 code 回 lab /login → lab 后端换 token
      </p>
      <p class="text-muted-foreground/70 text-xs">demo 后端：{{ backend }} · saas 端口：3000</p>
    </div>
  </div>
</template>