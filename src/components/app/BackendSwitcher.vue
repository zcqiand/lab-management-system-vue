<script setup lang="ts">
// 后端切换器（2026-09-23 用户裁定恢复，收窄 ADR-0014）— 侧栏底部运行时选择
// lab 家族三真后端（msw 仓 2026-09-17 已删）。镜像旧 BackendSwitcher（git
// 58be55e~1）的 DropdownMenu 交互，落位从 header 移到侧栏 footer（深色底，
// trigger 用 ghost + white/70 适配）。
//
// 切换语义（backend-config.ts）：写 localStorage 覆盖 → 清本机会话
//（跨后端 token 不通用，陈旧 token 401）→ 整页刷新拉新后端数据。
import { ref } from "vue";
import { ChevronsUpDown, Server } from "lucide-vue-next";
import Button from "@/components/ui/Button.vue";
import DropdownMenu from "@/components/ui/DropdownMenu.vue";
import DropdownMenuItem from "@/components/ui/DropdownMenuItem.vue";
import DropdownMenuLabel from "@/components/ui/DropdownMenuLabel.vue";
import DropdownMenuSeparator from "@/components/ui/DropdownMenuSeparator.vue";
import {
  KNOWN_BACKENDS,
  getActiveBackend,
  setBackendOverride,
  type BackendMode,
} from "@/api/backend-config";
import { clearPersistedSession } from "@/state/auth";

// 挂载时读一次即可：整页刷新是切换的唯一出口，不存在运行中变位
const active = getActiveBackend();
const switching = ref(false);

function onPick(mode: BackendMode): void {
  if (mode === active.mode || switching.value) return;
  switching.value = true;
  setBackendOverride(mode);
  clearPersistedSession();
  window.location.reload();
}
</script>

<template>
  <DropdownMenu>
    <template #trigger>
      <Button
        variant="ghost"
        size="sm"
        class="w-full justify-start gap-2 px-2 text-xs text-white/70 hover:bg-white/10 hover:text-white"
        data-testid="backend-switcher-trigger"
        :title="`当前后端：${active.label} · ${active.baseUrl}`"
      >
        <Server class="size-3.5 shrink-0" />
        <span class="truncate font-mono">{{ active.mode }}</span>
        <ChevronsUpDown class="ml-auto size-3 shrink-0 opacity-60" />
      </Button>
    </template>
    <DropdownMenuLabel>后端（运行时切换）</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      v-for="b in KNOWN_BACKENDS"
      :key="b.mode"
      :testid="`backend-option-${b.mode}`"
      :class="b.mode === active.mode ? 'bg-accent' : 'cursor-pointer'"
      @click="onPick(b.mode)"
    >
      <span class="flex min-w-0 flex-col">
        <span class="font-medium">{{ b.label }}</span>
        <span class="truncate font-mono text-xs text-slate-500">{{ b.baseUrl }}</span>
      </span>
    </DropdownMenuItem>
  </DropdownMenu>
</template>
