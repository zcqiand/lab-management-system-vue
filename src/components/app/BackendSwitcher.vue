<script setup lang="ts">
// 运行时后端切换器：msw / aspnetcore / springboot / nextjs
//
// Lab family 比 saas 多一个 nextjs 模式（命中 ../lab-management-system-nextjs 的
// Next.js API routes）。设计沿 saas：dropdown 选，可改 baseUrl（react 仓镜像）。

// @entry M98.F01.I01
// @entry M98.F01.I02
// @entry M98.F02.I01
import { ref } from "vue";
import { Server } from "lucide-vue-next";
import Button from "@/components/ui/Button.vue";
import Input from "@/components/ui/Input.vue";
import DropdownMenu from "@/components/ui/DropdownMenu.vue";
import DropdownMenuItem from "@/components/ui/DropdownMenuItem.vue";
import DropdownMenuLabel from "@/components/ui/DropdownMenuLabel.vue";
import DropdownMenuSeparator from "@/components/ui/DropdownMenuSeparator.vue";
import { useBackendStore } from "@/state/backend";
import type { BackendMode } from "@/api/backend-config";

const LABELS: Record<BackendMode, string> = {
  msw: "MSW（浏览器内 Mock）",
  aspnetcore: "ASP.NET Core",
  springboot: "Spring Boot",
  nextjs: "Next.js API（同仓 / 实验室管理）",
};

const SHORT: Record<BackendMode, string> = {
  msw: "MSW Mock",
  aspnetcore: "ASP.NET Core",
  springboot: "Spring Boot",
  nextjs: "Next.js API",
};

const MODES = Object.keys(LABELS) as BackendMode[];

const store = useBackendStore();
const editing = ref<BackendMode | null>(null);
const draft = ref("");

function startEdit(mode: BackendMode): void {
  editing.value = mode;
  draft.value = store.baseUrls[mode];
}

function commitEdit(): void {
  if (editing.value) {
    const trimmed = draft.value.trim().replace(/\/+$/, "");
    if (trimmed) store.setBaseUrl(editing.value, trimmed);
  }
  editing.value = null;
}
</script>

<template>
  <DropdownMenu>
    <template #trigger>
      <!-- 显式 text-slate-900：本组件嵌在浅色 header（bg-white）下，vue 仓
          BackendSwitcher 放在 header 里而不是侧栏里，但 outline 按钮的 bg-background
          在 light mode 下也是白底，若不显式字色会随父级语义 token 走而看不清。
          镜像 react 仓 backend-switcher.tsx 同款写法。 -->
      <Button
        variant="outline"
        size="sm"
        data-testid="backend-switcher-trigger"
        class="gap-2 bg-white text-slate-900 border-slate-300 hover:bg-slate-100 hover:text-slate-900"
        :title="`当前后端：${LABELS[store.backend]}`"
      >
        <Server class="h-4 w-4" />
        {{ SHORT[store.backend] }}
      </Button>
    </template>

    <DropdownMenuLabel>后端模式（运行时切换）</DropdownMenuLabel>
    <DropdownMenuSeparator />
    <DropdownMenuItem
      v-for="mode in MODES"
      :key="mode"
      :testid="`backend-option-${mode}`"
      :active="mode === store.backend"
      @click="store.setBackend(mode)"
    >
      <div class="flex-1">
        <div class="font-medium text-sm">{{ LABELS[mode] }}</div>
        <div class="font-mono text-xs text-muted-foreground truncate">
          {{ store.baseUrls[mode] || "(同源)" }}
        </div>
      </div>
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuLabel class="text-xs font-normal text-muted-foreground">
      自定义 baseUrl
    </DropdownMenuLabel>
    <div class="space-y-2 px-2 pb-2">
      <template v-if="editing">
        <div class="space-y-2">
          <div class="text-xs font-medium">{{ LABELS[editing] }}</div>
          <Input
            v-model="draft"
            placeholder="http://localhost:5000"
            @keydown.enter="commitEdit"
            @keydown.esc="editing = null"
          />
          <div class="flex justify-end gap-2">
            <Button variant="ghost" size="sm" @click="editing = null">取消</Button>
            <Button size="sm" @click="commitEdit">保存</Button>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="space-y-1">
          <button
            v-for="mode in MODES"
            :key="mode"
            class="w-full text-left text-xs px-2 py-1 rounded hover:bg-accent"
            @click="startEdit(mode)"
          >
            <span class="font-medium">{{ LABELS[mode] }}</span>
            <span class="ml-2 font-mono text-muted-foreground">
              {{ store.baseUrls[mode] || "(空 / 同源)" }}
            </span>
          </button>
          <button
            class="w-full text-left text-xs px-2 py-1 rounded hover:bg-accent text-muted-foreground"
            @click="store.resetBaseUrls()"
          >
            恢复默认 baseUrl
          </button>
        </div>
      </template>
    </div>
  </DropdownMenu>
</template>
