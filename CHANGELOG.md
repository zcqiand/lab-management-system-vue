# CHANGELOG — lab-management-system-vue

格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [0.3.35] — 2026-09-05

shadcn-vue 迁移 **Phase 1.2b**（5 个中量页 raw `<button>` → `<Button>` 原语）。
5 个独立 commit（按文件粒度回滚），共迁移 18 处按钮；全量回归 165 case 全绿。
TDD：每个文件先加失败回归锚（红）→ 迁移 → 绿 → commit。

- **CategoryDictList** 3 处（4 码表页 M04.F06-F09 共用）：新建（`bg-blue-600` 定制）/
  行内编辑 `variant=link text-primary` / 行内删除 `variant=link text-destructive`
- **TaskAssignmentList** 4 处：搜索 outline / 行内安排 `outline size=sm` /
  弹窗取消 outline / 弹窗保存 `bg-blue-600`
- **DataEntryPage** 4 处：搜索 outline / 行内录入结果 `outline size=sm` /
  弹窗取消 outline / 弹窗保存 `bg-blue-600`（data-fn M03.F03.I02）
- **ReportPhasePage** 5 处（报告 4 阶段共用）：搜索 outline / 批量提交 outline
  （`:data-fn=i02DataFn`）/ 行内退回 `variant=link text-destructive` /
  弹窗取消 outline / 弹窗确认退回 `bg-red-600`
- **ReceiptDetail** 2 处：报告预览 `outline size=sm text-primary`（data-fn M03.F09.I03）/
  返回 `outline size=sm text-muted-foreground`

**class 映射规则**（沿用 Phase 1.2a + hotfix 结论）：

- 顶部/弹窗主操作 → `<Button variant="default">`，蓝/红定制用
  `class="bg-blue-600 hover:bg-blue-700"` / `class="bg-red-600 hover:bg-red-700"`
  经 tailwind-merge 压过 CVA 的 `bg-primary`
- 搜索 / 取消 / 带边框行内操作 → `<Button variant="outline">`（行内加 `size="sm"`）
- **行内 link 风格操作一律 `variant="link"`**，不再用 `variant=ghost size=sm`
  （后者会带 `h-8 px-3` 高度回归，Phase 1.2a hotfix B1 的教训）
- 删除/退回一律 `text-destructive` 设计 token，不写 `text-red-600`

**未迁移（有意保留 raw `<button>`，1 处）**：CategoryDictList 左侧检测项目树选择项。
它是 `flex w-full` 块级树导航 + 条件 `:class` 着色，迁移需 7 个 class override
（`w-full/justify-start/h-auto/rounded-none/border-l-2/px-3 py-2/text-left`），
且调用方 `flex` 会被 tailwind-merge 吃掉 CVA 的 `inline-flex` —— 超出 Phase 1.2b
「>3 个 override 就停」阈值，留给后续 nav 专项（与 SidebarNav 同型）。
ReportPhasePage 的「全选」/ 行选择是 `<input type=checkbox>`，属 Phase 1.3 范围，本 Phase 不动。

**L5 不动**：`M03.F02.I02` / `M03.F03.I02` / `M03.F03.I03` / `M03.F09.I03` /
`i02DataFn` / `createDataFn` / `editDataFn` / `deleteDataFn` 全部经 `$attrs`
转发到真实 `<button>`，原测试 selector（`findAll("button")` / `find('button[data-fn=…]')` /
`findAll("aside button")`）零回归。

**测试新增 11 条 Phase 1.2b 回归锚**（不挂功能 ID，工程设施测试）：

- CategoryDictList 2：新建 `inline-flex` + `bg-blue-600` 压过 `bg-primary`；
  行内 link 无 `h-8/px-3` + 删除 `text-destructive`
- TaskAssignmentList 2：安排按钮 `tagName=BUTTON` + data-fn；保存 `disabled` 落到真实 DOM
- DataEntryPage 2：录入结果 outline border；保存 data-fn + `bg-blue-600`
- ReportPhasePage 3：批量提交 data-fn + 空选中 `disabled`；行内退回 link 且
  `text-destructive`、点击开弹窗；**「全选」仍是 `<input type=checkbox>`**
  （防 Button 迁移顺手动 checkbox）
- ReceiptDetail 2：预览 data-fn + `text-primary` + 点击开 ReportPreviewModal；返回 `text-muted-foreground`

## [0.3.32] — 2026-09-05

shadcn-vue 迁移 **Phase 1.2a**（7 个 list 页 raw `<button>` → `<Button>` 原语）。
7 个独立 commit（按文件粒度回滚），共迁移 41 处按钮；全量回归 151 case 全绿、gate exit 0。

- **ContractsList** 5 处：新建合同 / 搜索 / 表单保存 / 行内编辑 / 行内删除
- **ReceiptsList** 9 处：新建接样 / 搜索 / 行内提交+编辑+删除 / 2× dialog 取消+保存
  - 注：ReceiptsList 视觉调色 `bg-blue-600`（区别于合同的 primary），用
    `<Button variant="default" class="bg-blue-600 hover:bg-blue-700">` 覆盖 CVA default 的 bg-primary。
- **ReportNameList** 6 处：新建 / 搜索 / 表单保存 / 行内关联+编辑+删除
- **InspectionCapabilityList** 6 处（4 个 resource 视图共用）：新建 / 行内关联标准
  （parameters 专属）/ 行内编辑+删除 / dialog 取消+保存。`disabled` 落到真实 `<button>`
  （官方行不可删）；`aria-label` 经 `$attrs` 转发。
- **ParamInterfaceList** 5 处：新建 / 搜索 / 表单保存 / 行内编辑+删除
- **TechnicalRequirementList** 5 处：新建 / 行内编辑+删除 / dialog 取消+保存。
  行内按钮走 `text-primary hover:underline` / `text-red-600 hover:underline` link 风格，
  用 `<Button size="sm" variant="ghost">` 保留视觉。
- **CalculationMethodList** 5 处：同上结构。

**class 映射规则**：

- 顶部主操作（新建 / 保存）→ `<Button variant="default">`（CVA base `inline-flex` +
  `bg-primary` 自带）
- 取消 / 搜索 → `<Button variant="outline">`
- 行内 link-style 操作 → `<Button size="sm" variant="ghost" class="text-primary hover:underline">`
  或 `text-red-600 hover:underline`
- ReceiptsList 蓝色定制 → `<Button variant="default" class="bg-blue-600 hover:bg-blue-700">`，
  CVA default 的 `bg-primary` 被调用方 `tailwind-merge` 压掉

**L5 不动**：所有原 `data-fn` 锚点经 `$attrs` 转发到真实 `<button>`，原测试 selector
（`find('button[data-fn="..."]')` / `findAll("button")` / `findAll('button[aria-label^="..."]')`）
零回归。`tailwind-merge` 保证调用方 class 压过 CVA 默认值，视觉零差异。

**测试新增 9 条 Phase 1.2a 回归锚**（不挂功能 ID，工程设施测试）：

- ContractsList 2：新建 default + 行内删除 ghost text-red-600
- ReceiptsList 2：新建 blue 覆盖 + 行内提交 size=sm h-8
- ReportNameList 2：新建 default + 行内关联 size=sm
- InspectionCapabilityList 1：parameters 行内关联 ghost text-primary
- TechnicalRequirementList 2：新建 default + 行内删除 ghost aria-label 转发
- CalculationMethodList 2：新建 default + 行内 aria-label + text-primary/text-red-600
- ParamInterfaceList 2：新建 default + 行内删除 ghost text-red-600

## [0.3.31] — 2026-09-05

shadcn-vue 迁移 **Phase 1.1**（SidebarNav action 按钮）。TDD：先写失败测试（4 case），
见红 → 替换 → 见绿 → 全量回归 138 case 全绿、gate exit 0。

- `src/components/app/SidebarNav.vue` action 分支 raw `<button>` → `<Button variant="ghost">`。
  router-link 分支（`<component :is="'router-link'">`）**不动** —— 它不是 `<button>`，
  Phase 1.1 范围只覆盖 raw button。
- caller class 走 `w-full justify-start gap-2 rounded-md px-3 py-2 text-sm`：
  - 删 `flex` —— Button CVA 基类已是 `inline-flex`，避免 tailwind-merge 把
    `inline-flex` 当 flex 冲突吞掉。
  - 加 `justify-start` —— CVA 默认 `justify-center`，侧栏 nav 布局要左对齐（icon 在 label 左）。
  - CVA `ghost` variant 自带 `hover:bg-accent hover:text-accent-foreground`，与原 raw
    button 的 `hover:bg-slate-100` 视觉相近（侧栏背景色统一后无差别）。
- add `tests/app/sidebarNav.dom.test.ts` 4 case：router-link 渲染为 `<a>` / action 渲染为
  `<button>` + inline-flex / `aria-label` 转发 / 点击 emit action。

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
