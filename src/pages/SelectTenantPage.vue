<script setup lang="ts">
// SelectTenantPage — M00.F02（登录选租户）。awaiting_tenant 态的落地页。
import { computed } from "vue";
import { useRouter } from "vue-router";
import { Building2 } from "lucide-vue-next";
import Button from "@/components/ui/Button.vue";
import { useAuthStore, switchTenant as authSwitchTenant } from "@/state/auth";

const auth = useAuthStore();
const router = useRouter();

const page = computed(() => {
  const s = auth.authState;
  if (s.kind === "awaiting_tenant") return { user: s.value.user, tenants: s.value.tenants };
  return null;
});

// 非 awaiting_tenant 态访问 → 按状态弹回
if (!page.value) {
  void router.replace(auth.authState.kind === "authenticated" ? "/" : "/login");
}
</script>

<template>
  <div v-if="page" class="bg-muted flex min-h-screen items-center justify-center p-4">
    <div class="bg-background w-full max-w-md rounded-lg border p-8 shadow-sm">
      <div class="mb-6 flex flex-col items-center gap-2">
        <Building2 class="text-primary size-8" />
        <h1 class="text-xl font-semibold">选择租户</h1>
        <p class="text-muted-foreground text-sm">
          {{ page.user.displayName ?? page.user.username }}，你属于 {{ page.tenants.length }}
          个租户，请选择一个进入
        </p>
      </div>
      <div class="space-y-2">
        <Button
          v-for="t in page.tenants"
          :key="t.tenantId"
          variant="outline"
          class="w-full justify-between"
          @click="void authSwitchTenant({ tenantId: t.tenantId })"
        >
          <span>{{ t.name }}</span>
          <span class="text-muted-foreground font-mono text-xs">{{ t.code }}</span>
        </Button>
      </div>
    </div>
  </div>
</template>
