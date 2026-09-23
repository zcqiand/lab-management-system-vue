<script setup lang="ts">
// 租户切换器（M00.F02.I01）— 镜像 lab-nextjs tenant-switcher.tsx：DropdownMenu +
// Building2 + ChevronsUpDown。候选清单来自 auth 模块 sessionTenantsList()
//（settleLogin / hydrateAuth 时同步），切换走契约 switchTenant → 后端换发新
// tenant claim 的 HS256 token，会话不中断；成功后 emit switched 由 AppShell
// 整页刷新（vue-query 缓存跨租户不通用，react 版走 router.refresh 同理）。
import { computed, ref } from "vue";
import { Building2, ChevronsUpDown } from "lucide-vue-next";
import Button from "@/components/ui/Button.vue";
import DropdownMenu from "@/components/ui/DropdownMenu.vue";
import DropdownMenuItem from "@/components/ui/DropdownMenuItem.vue";
import DropdownMenuLabel from "@/components/ui/DropdownMenuLabel.vue";
import DropdownMenuSeparator from "@/components/ui/DropdownMenuSeparator.vue";
import { isErrorResponse, sessionTenantsList, switchTenant, useAuthStore } from "@/state/auth";

const emit = defineEmits<{ switched: [] }>();
const auth = useAuthStore();
const error = ref("");
const pending = ref(false);

const current = computed(() =>
  auth.authState.kind === "authenticated" ? auth.authState.value.tenant : null,
);
const tenants = computed(() => sessionTenantsList());

async function onSwitch(tenantId: string): Promise<void> {
  if (pending.value) return;
  if (current.value && tenantId === current.value.tenantId) return;
  pending.value = true;
  error.value = "";
  try {
    const resp = await switchTenant({ tenantId });
    if (isErrorResponse(resp)) {
      error.value = resp.message;
      return;
    }
    emit("switched");
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="flex flex-col items-start gap-1">
    <DropdownMenu>
      <template #trigger>
        <Button
          variant="outline"
          size="sm"
          class="gap-2"
          data-testid="tenant-switcher"
          data-fn="M00.F02.I01"
          :title="current ? current.name : '选择租户'"
        >
          <Building2 class="size-4 text-slate-500" />
          <span class="max-w-40 truncate font-medium">{{
            current ? current.name : "选择租户"
          }}</span>
          <ChevronsUpDown class="size-3.5 text-slate-400" />
        </Button>
      </template>
      <DropdownMenuLabel>切换租户</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        v-for="t in tenants"
        :key="t.tenantId"
        :testid="`tenant-option-${t.tenantId}`"
        class="cursor-pointer"
        @click="onSwitch(t.tenantId)"
      >
        <Building2 class="mr-2 size-4 shrink-0 text-slate-500" />
        <span class="flex min-w-0 flex-col">
          <span class="truncate font-medium">{{ t.name }}</span>
          <span class="truncate font-mono text-xs text-slate-500">{{ t.code }}</span>
        </span>
      </DropdownMenuItem>
    </DropdownMenu>
    <!-- 切换失败就地展示在触发器下方（reka 点选菜单项即关菜单，错误若渲染在
         content 里会随菜单卸载而不可见；本仓无 toast 基建，window.alert 被仓规禁止） -->
    <p v-if="error" class="text-xs text-destructive" data-testid="tenant-switcher-error">
      {{ error }}
    </p>
  </div>
</template>
