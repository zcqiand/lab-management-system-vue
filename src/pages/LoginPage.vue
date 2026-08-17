<script setup lang="ts">
// @entry M01.F05.I03
// LoginPage — M01.F05.I03（SSO 授权码流）纯 orchestrator，镜像 react 仓 /login。
//
// 对齐 nextjs 模型（2026-08-18 认证收口）：登录全部委托 saas 身份平台，
// 本页无用户名密码表单。三分支：
//   1. URL 带 ?token=（saas 已换 token）→ 存 localStorage + GET /me 建会话 → 跳业务页
//   2. URL 带 ?code=&state=（未换 token）→ POST /api/auth/sso/callback 换 mock-jwt → 跳业务页
//   3. 无回调参数 → GET /api/auth/sso/authorize → window.location 跳 saas /login
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { FlaskConical } from "lucide-vue-next";
import { useAuthStore, setSession } from "@/state/auth";
import { useBackendStore } from "@/state/backend";
import { BACKEND_REGISTRY_DEFAULT, TOKEN_STORAGE_KEYS } from "@/api/contracts";
import { authSsoAuthorize, authSsoCallback, authGetCurrentUser } from "@/api/endpoints/endpoints";
import type { LoginResponse } from "@/api/endpoints/endpoints.schemas";

const auth = useAuthStore();
const backendStore = useBackendStore();
const route = useRoute();
const router = useRouter();

const status = ref("检查登录态…");

const from = computed(() => (typeof route.query.from === "string" ? route.query.from : "/"));

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
    const s = auth.authState;
    // 已登录访问 /login → 直接回业务页
    if (s.kind === "authenticated") {
      void router.replace(sanitizeRedirect(from.value));
      return;
    }
    if (!ssoEnabled.value) {
      status.value = `当前 backend（${backend.value}）未启用 SSO，请切到 msw / nextjs 后端`;
      return;
    }
    if (s.kind !== "anonymous" && s.kind !== "idle") return;

    // 阶段 1：saas 跳回 lab 的 URL 带 ?token=（已换 token）→ 存 localStorage +
    // GET /api/auth/me 拿 user/tenants → setSession 建会话 → 跳业务页。
    const tokenFromSaas = typeof route.query.token === "string" ? route.query.token : null;
    if (tokenFromSaas) {
      status.value = "登录成功，正在进入系统…";
      localStorage.setItem(TOKEN_STORAGE_KEYS.accessToken, tokenFromSaas);
      try {
        const resp = await authGetCurrentUser({
          headers: { Authorization: `Bearer ${tokenFromSaas}` },
        });
        const data = resp.data as {
          user: LoginResponse["user"];
          tenants: LoginResponse["tenants"];
          currentTenantId?: string;
        };
        await setSession({
          accessToken: tokenFromSaas,
          user: data.user,
          tenants: data.tenants,
        });
        void router.replace(sanitizeRedirect(from.value));
      } catch (err) {
        console.error("[lab/login] /api/auth/me failed:", err);
        status.value = `token 已存但 /me 失败（${backend.value}）`;
      }
      return;
    }

    // 阶段 2：saas 给的是 ?code=&state=（未换 token）→ POST /api/auth/sso/callback 换 mock-jwt
    const code = typeof route.query.code === "string" ? route.query.code : null;
    const stateParam = typeof route.query.state === "string" ? route.query.state : null;
    if (code && stateParam) {
      status.value = "拿到 saas code，正在换 token…";
      try {
        const resp = await authSsoCallback({ code, state: stateParam });
        const data = resp.data as LoginResponse;
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

    // 阶段 3：没有 saas 回调参数 → 调 authorize 让 saas 跳过来
    status.value = `未登录，正在跳 saas 身份平台（backend=${backend.value}）…`;
    try {
      const resp = await authSsoAuthorize({ redirect: sanitizeRedirect(from.value) });
      const url = (resp.data as { authorizeUrl?: string }).authorizeUrl;
      if (url) {
        window.location.href = url;
      } else {
        status.value = "authorizeUrl 缺失，请检查 msw / saas 配置";
      }
    } catch (err) {
      status.value = `SSO 跳转失败（${(err as Error).message ?? "unknown"}）`;
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
        <p class="text-muted-foreground text-sm">SSO 登录（委托 saas 身份平台）</p>
      </div>
      <p class="text-muted-foreground mb-4 text-sm" data-testid="login-status">{{ status }}</p>
      <p class="text-muted-foreground/70 text-xs">
        流程：lab /login → saas /login → 带 token 回 lab /login → 进入系统
      </p>
      <p class="text-muted-foreground/70 text-xs">demo 后端：{{ backend }} · saas 端口：3000</p>
    </div>
  </div>
</template>
