<script setup lang="ts">
// LoginPage — M01.F05.I01（用户名+密码登录）+ M00.F02（多租户登录走选租户页）。
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { FlaskConical } from "lucide-vue-next";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import Label from "@/components/ui/Label.vue";
import { useAuthStore, isErrorResponse, login as authLogin } from "@/state/auth";

const auth = useAuthStore();
const route = useRoute();
const router = useRouter();

const username = ref("");
const password = ref("");
const error = ref<string | null>(null);
const submitting = ref(false);

const from = computed(() => (typeof route.query.from === "string" ? route.query.from : "/"));

// 已登录访问 /login → 直接回业务页；多租户 → 选租户页
const redirect = computed(() => {
  const s = auth.authState;
  if (s.kind === "authenticated") return from.value;
  if (s.kind === "awaiting_tenant") return "/select-tenant";
  return null;
});
if (redirect.value) void router.replace(redirect.value);

async function onSubmit(): Promise<void> {
  submitting.value = true;
  error.value = null;
  const resp = await authLogin({ username: username.value, password: password.value });
  submitting.value = false;
  if (isErrorResponse(resp)) {
    error.value = "用户名或密码错误";
    return;
  }
  // FSM 已推进：单租户 → authenticated，多租户 → awaiting_tenant
  // 跳转由 guard/redirect 处理，这里兜底回 from
  void router.replace(from.value);
}
</script>

<template>
  <div class="bg-muted flex min-h-screen items-center justify-center p-4">
    <div class="bg-background w-full max-w-sm rounded-lg border p-8 shadow-sm">
      <div class="mb-6 flex flex-col items-center gap-2">
        <FlaskConical class="text-primary size-8" />
        <h1 class="text-xl font-semibold">实验室管理系统</h1>
        <p class="text-muted-foreground text-sm">请登录以继续</p>
      </div>
      <form class="space-y-4" @submit.prevent="onSubmit">
        <div class="space-y-2">
          <Label for="username">用户名</Label>
          <Input id="username" v-model="username" autocomplete="username" required />
        </div>
        <div class="space-y-2">
          <Label for="password">密码</Label>
          <Input
            id="password"
            v-model="password"
            type="password"
            autocomplete="current-password"
            required
          />
        </div>
        <p v-if="error" class="text-destructive text-sm">{{ error }}</p>
        <Button type="submit" class="w-full" :disabled="submitting">
          {{ submitting ? "登录中…" : "登录" }}
        </Button>
      </form>
    </div>
  </div>
</template>
