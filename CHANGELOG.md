# CHANGELOG — lab-management-system-vue

格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

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
