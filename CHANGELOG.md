# CHANGELOG — lab-management-system-vue

格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [0.3.28] — 2026-09-04

shadcn-vue 迁移 **Phase 0（底座）**。纯工程设施，无业务行为改动 —— 目的是让后续
phase 换原语时不必各自重踩同一批设置问题。

- add `components.json`：静态落盘（CI 无网络跑不了 shadcn-vue CLI）。
  style=new-york / baseColor=slate / cssVariables=true，alias 对齐本仓 `@` 路径。
- `src/index.css` design token 扩到 19 项：
  - **格式变更**：token 值从 `hsl(0 0% 100%)` 改为裸 HSL 分量 `0 0% 100%`
    —— shadcn-vue 的 CVA 类名与 `bg-primary/90` 这类透明度变体依赖裸值。
  - 新增 primary / primary-foreground / secondary / secondary-foreground /
    accent / accent-foreground / destructive / destructive-foreground /
    card / card-foreground / popover / popover-foreground / input / ring
    共 14 个 token。
  - `@theme inline` 镜像全部 19 项，写法是 `--color-x: hsl(var(--x))`。**不是**
    `var(--x)` —— 裸分量直接塞进 color 属性是非法声明会被丢弃，
    `bg-background` / `border-input` 会静默全部失效（CSS 没有类型检查兜底）。
- ui 原语 `Button` / `Input` / `Label` 对齐 shadcn-vue 契约：
  - 加 `class?: string` prop，放在 `cn()` 最后一位 → 调用方 class 经
    tailwind-merge 压过 CVA 默认值（如 `h-10` 压掉 size=default 的 `h-9`）。
  - `inheritAttrs: false` + `v-bind="$attrs"` → `data-fn` / `aria-label`
    这类测试与埋点锚点落到真实 DOM 元素上，不再被 Vue 的 fallthrough 规则吞掉。
  - `Input` 的 `:disabled="disabled ?? undefined"` **无条件绑定**：disabled 为真时
    属性必须落 DOM，同级 `Label` 的 `peer-disabled:` 选择器才会命中。
  - `Label` 刻意不加「默认插槽包住 Input」的组合模式（Label/Input 配对留 Phase 2d）。
- add `src/components/ui/Card.vue` 最小外壳（card / card-foreground token 的消费方）。
- `vite.config.ts` 加 `build.rollupOptions.output.manualChunks`：
  vue / query / reka / icons 四个 vendor chunk。在原语大批进场**之前**定死基线，
  后续每个 phase 对着同一条线量体积。`index-*.js` 237 KB → 94.8 KB。
- `tests/helper.ts` portal stub：`teleport: true` 是 no-op（children 被丢掉，
  浮层内容断言不到），改为渲染默认插槽的 `<div data-portal-stub>`；
  同时按名 stub reka-ui 的 `DialogPortal`（Dialog / Sheet / AlertDialog 都靠它）。
- add `tests/foundation/shadcn-dialog.dom.test.ts` + `__test_helper__/DialogFixture.vue`：
  底座冒烟，钉住 portal stub / `$attrs` 转发 / class 合并三条契约。不挂功能 ID
  （工程设施测试）。

## [0.3.27] — 2026-09-04

- fix(AppShell): M01.F04.I03 守卫从 DashboardPage 提升到 AppShell — 未登录访问
  任何业务子路由（receipts / contracts / data-entry / ...）直接跳 /login，而不是
  让 AppShell 渲染「菜单加载失败」半残错误态。镜像 react 仓 app-shell.tsx §58
  `useRequireAuth()`。
  - `src/components/app/AppShell.vue` 加 `useRequireAuth()` 调用，template 三段门
    `v-if="checking"` / `v-else-if="!allowed"` / `v-else`(原内容)
  - `tests/features/auth/backendMenus.dom.test.ts`：axios mock POST 放行 +
    `toAuthenticated()` 前置（与 appShellLogout.dom.test.ts 同款），4 个
    useBackendMenus case 在 mount 前先推 authenticated 态
- fix(LoginPage): VITE_SAAS_CLIENT_ID 禁 UUID 字面兜底（ADR-0019）。之前
  `?? "11111111-1111-1111-1111-111111111111"` 是业务身份字段兜底到 demo
  字面量，L0.no_fallback 红。改为 `(() => { const v = ...; if (v ===
  undefined) throw new Error(...); return v; })()` — dev 期 .env.local
  显式声明、prod 由 Dockerfile ENV / deploy 脚本注入。

## [0.1.1] — 2026-08-27

- M01.F04.I01 前端失败语义改为上抛错误，不再静默回退静态 `FALLBACK_NAV`：
  - `useBackendMenus` 暴露 `error: () => Error | null`；AppShell 用 `watch(menuError)`
    - `onErrorCaptured` 接住拉取失败 / 子树抛错，写 `menuLoadError` ref
  - AppShell template：`v-if menuLoadError` 渲染「菜单加载失败」错误态，
    sidebar 头部 + 登出按钮 + 错误主体三段；登出按钮在错误态下仍可见（保证
    任意菜单状态都能登出，与 react 仓 AppShellErrorBoundary 一致）
  - 删除 `FALLBACK_NAV` 常量 + `navItems` 的 `?? FALLBACK_NAV` 兜底（demo 兜底
    删除后，前后端语义对齐：失败不静默）
  - 测试 backendMenus.dom.test.ts：失败用例断言「菜单加载失败」+「HTTP 500」，
    断言静态树「型号维护」不漏出（与 react 同款）

## [0.1.0] — 2026-08-27

- 初始化台账：Vue 3.5 + Vite 前端镜像仓。历史变更见 git log 与 `.state/session.json`。
