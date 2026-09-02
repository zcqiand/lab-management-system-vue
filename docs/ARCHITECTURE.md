# lab-management-system-vue Architecture

> lab-management-system-vue 单仓架构。回答四个问题：
> 1. 这个仓在 lab 家族里扮演什么角色、跟谁同构；
> 2. 它的目录长什么样、每个目录/文件的职责边界；
> 3. 一次"浏览器→API"的请求路径走哪些文件、env 怎么决定后端；
> 4. 哪些决策（ADR）和 lint 禁令决定了"为什么不像 react/nextjs 那样写"。

> **范围**：本文档只描述 *架构*（结构 / 边界 / 数据流 / 决策）。
> 编码细则见 [docs/conventions/](../conventions/)，流程/设计见 [docs/design/](../design/)，
> 决策索引见 [§6](#6-决策索引) 与 [父仓 ADR 目录](../../../docs/adr/)。

---

## 0. 阅读路径

| 你是… | 直接看 |
|---|---|
| 新人，要 20 分钟搞懂本仓 | §1 → §2.1 → §4 流程图 |
| 想加一个功能页 / 加一个 I 子项 | §3.4 pages/ → function-tree M 列 → [父仓 §4.3](../../ARCHITECTURE.md#43-前端仓reactvuenextjs--6-仓) |
| 想调试 dev 请求跨不过去 | §4 → §5（CORS + 端口表）→ [父仓 §6.2 CORS 白名单矩阵](../../ARCHITECTURE.md#62-cors-白名单矩阵) |
| 想问"为什么这样设计" | §6（决策索引）→ 对应 ADR（[0011](../../../docs/adr/0011-lab-vue-m98-whitelist-mirror.md) / [0012](../../../docs/adr/0012-msw-as-http-server.md) / [0014](#64-隐含-adr)） |

---

## 1. 角色与定位

**lab-management-system-vue 是 lab 家族的 *前端仓 2/3***：

- lab 家族 = 「建筑工程实验室管理系统」（合同 / 接样 / 样品 / 检测项 / 记录 / 报告），由 7 个 sibling 仓同构组成（见 [父仓 §2.2](../../../docs/ARCHITECTURE.md#22-14-个子仓的角色矩阵)）；
- vue 仓与 `lab-management-system-react` **镜像同构**：相同 M/F/I 编号、相同 UI 设计、相同 OpenAPI 契约；区别只在框架（react vs vue）与状态库（zustand vs Pinia）；
- vue 仓与 `lab-management-system-nextjs` 的关系：**不兼全栈后端**（nextjs 是 front+back+DB 同仓，vue 纯前端）；
- 后端由 `lab-management-system-msw`（dev/prod）/ `lab-management-system-springboot`（:8080）/ `lab-management-system-aspnetcore`（:5000）/ 未来 `lab-management-system-nextjs-self` 提供，**vue 仓不实现 `/api` route**。

**一句话**：Vue 3.5 + Vite + Pinia + Vue Query 前端仓，orval (`vue-query` client) 消费 `lab-management-system-shared` 的 `openapi.yaml`，env-driven 单 URL 配置（[ADR-0014 §6.4](#64-隐含-adr)）。

### 1.1 与 react / nextjs 的角色矩阵

| 维度 | lab-vue（本仓） | lab-react | lab-nextjs |
|---|---|---|---|
| 框架 | Vue 3.5 `<script setup>` | React 19 | Next.js App Router |
| 状态库 | Pinia 3 + Vue Query 5 | Zustand + React Query 5 | Server Components + Drizzle |
| orval client | `vue-query` | `react-query` | `react-query` |
| http 客户端 | axios（全局，拦截器一次安装） | axios（独立实例） | fetch（Server Actions） |
| M98（前端接线层） | ADR-0011 8 ID 白名单镜像（[0011](../../../docs/adr/0011-lab-vue-m98-whitelist-mirror.md)） | 同 | 同 |
| 后端 route | 不实现 | 不实现 | 实现（saas nextjs 兼全栈；lab nextjs 不兼） |
| 默认端口 | 5203（vue dev） | 5202（react dev） | 5201（nextjs） |

**核心约束**（来自 [CLAUDE.md §2](../../CLAUDE.md)）：

- 禁止本仓加 `src/api/*/route.ts` 类后端 route；
- 禁止从 `@lab/management-system-shared` import TS 客户端（shared 只产 OpenAPI.yaml）；
- 禁止复制 saas-identity-platform-vue 的 `src/components/app/*` 源码（lab 自己写）；
- 禁止运行时切后端 / 禁止恢复 `useBackendStore` / `BackendSwitcher` / `localStorage["lab.backend"]`（**v0.x 已废弃 — ADR-0014**）；
- 必须把 `VITE_API_BASE_URL` / `VITE_ENABLE_MSW` / `VITE_API_MODE` 写到 `.env.example`，部署平台覆盖。

---

## 2. 目录骨架

### 2.1 顶层结构

```
lab-management-system-vue/
├── CLAUDE.md                    ← 入口：技术栈 + 禁止事项 + 指向别处
├── .harness/stack.json          ← suite 门禁读取的项目自描述（声明 L1-L4）
├── .harness/common.lock.json    ← 公共 skill 锁
├── .harness/skills.lock.json    ← skill 锁
├── docs/
│   ├── functions/function-tree.md   ← F/I 级功能清单（BASE 镜像 + 子项）
│   ├── adr/.gitkeep             ← 本仓特定 ADR 占位（决策归父仓 docs/adr/）
│   ├── design/                 ← 流程/设计（人评审）
│   ├── conventions/
│   │   ├── README.md           ← 编码细则索引
│   │   └── sprint-roadmap.md   ← sprint 0/1/2 路线
│   └── ARCHITECTURE.md         ← 本文件
├── scripts/
│   ├── gen-shared.ts           ← 调 ../shared emit + 本地 orval codegen
│   └── gen-template-index.mjs
├── src/
│   ├── api/                    ← orval codegen + http 客户端 + 契约包装
│   ├── components/             ← AppShell + shadcn-vue UI 原语
│   ├── composables/            ← Vue 3 composition 函数（useRequireAuth 等）
│   ├── data/                   ← 静态 fixtures / 模板
│   ├── features/               ← 按业务切分的 Vue SFC 组件树
│   ├── lib/                    ← env / responses / utils（无业务）
│   ├── pages/                  ← 路由叶子：每个 F.I 子项对应一个 .vue 页
│   ├── state/                  ← Pinia stores（auth FSM）
│   ├── App.vue                 ← 根组件（RouterView）
│   ├── main.ts                 ← bootstrap：installHttpClient + 装 VueQuery + hydrate
│   ├── router.ts               ← vue-router 4 配置
│   └── index.css               ← Tailwind v4 入口
├── tests/                      ← vitest（fnTest 嵌入 fn-ID）
├── tools/                      ← dev-time 辅助脚本
├── package.json
├── orval.config.ts             ← orval 配置（client: "vue-query"）
├── vite.config.ts / vitest.config.ts
├── eslint.config.js
├── Dockerfile
├── nginx.conf
└── deploy/
    ├── lab-management-system-vue.sh
    ├── nginx-vps.conf.example
    └── setup-vps.sh
```

### 2.2 src/ 子目录一句话职责

| 目录 | 职责 | 禁止事项 |
|---|---|---|
| `api/` | 与后端的全部契约入口：env 配置、axios 拦截器、orval 端点 | 禁手写业务 fetch；禁绕 `@/api/` |
| `components/app/` | 应用骨架（AppShell / SidebarNav / PageHeader / EmptyState / ConfirmDialog / BackendBadge） | 各功能页禁写自己的标题栏/分页/空态 |
| `components/ui/` | shadcn-vue 风格 UI 原语（Button / Input / Label / DropdownMenu\*） | 禁手写 UI 原语 |
| `composables/` | 可复用 composition 函数（`useRequireAuth`、`useBackendMenus`） | 禁把业务 store 塞这里 |
| `data/` | 静态 fixtures 与模板（如菜单兜底 NAV） | 禁填活数据 |
| `features/` | 按业务切分的组合：contracts / data-entry / dicts / inspection-capability / param-interfaces / receipts / report-names / reports / summary / task-assignment | 跨 feature 互引禁；features 内部可拆 SFC |
| `lib/` | 与业务无关的工具：`env.ts`（`import.meta.env` 包装）/ `responses.ts` / `utils.ts` | 禁放 feature 业务 |
| `pages/` | 路由叶子：每个 F.I 子项一个 `.vue` | 禁把组合逻辑堆在 pages 里（用 features） |
| `state/` | Pinia stores：`auth.ts`（FSM）/ `require-auth.ts`（composable 兜底） | 禁造「后端 store」（已废） |
| `router.ts` | vue-router 配置（login 公共页 + AppShell 业务根 + 404 兜底） | 禁在 routes 上堆守卫逻辑（用 composables） |

### 2.3 三层 src 边界

```
+------------------------------------------------------------+
|  pages/*.vue        ← 路由叶子（一个 F.I 一个 SFC）       |
|     ↓ 引用                                            ↑    |
|  features/<业务>/    ← 跨页复用的组合（SampleManagerModal）|
|     ↓ 引用                                            ↑    |
|  components/app/    ← 应用骨架（PageHeader/EmptyState）   |
|  components/ui/     ← shadcn-vue 原语                     |
|                                                            |
|  api/ + state/ + composables/ + lib/  ← 横向公共          |
+------------------------------------------------------------+
```

`pages/` 永远只做路由映射 + 拼装 `features/`；`features/` 永远只做"业务组合（modal、table、list-item）"；骨架与原语只能调 `app/` 与 `ui/`。

---

## 3. 核心模块

### 3.1 src/api/ — 与后端的全部契约入口

| 文件 | 角色 | 关键导出 | 关联 ADR |
|---|---|---|---|
| `env.ts` | 删，移至 `src/lib/env.ts` | — | — |
| `backend-config.ts` | env-driven 后端配置 | `getApiBaseUrl()`、`getApiMode()` | [ADR-0014 §6.4](#64-隐含-adr) |
| `http-client.ts` | axios 拦截器 + `ApiError` 封装 + `installHttpClient(getToken)` | `installHttpClient`、`toApiError`、`ApiError` | [memory: orval-axios-baseurl-must-be-installed](../../../memory/orval-axios-baseurl-must-be-installed.md) |
| `endpoints/endpoints.ts` | **orval 产物**：`vue-query` client 具名函数（如 `authLogin`、`authGetPermissions`、`getContractsList`） | 26 资源 × N actions | [ADR-0011](../../../docs/adr/0011-lab-vue-m98-whitelist-mirror.md) (M98.F03) |
| `endpoints/endpoints.schemas.ts` | **orval 产物**：TS 类型（DTO / LoginRequest / ErrorResponse / AuthState / BackendRegistry / 等） | 同上 | [ADR-0011](../../../docs/adr/0011-lab-vue-m98-whitelist-mirror.md) (M98.F03) |
| `contracts.ts` | 把 `endpoints.schemas` re-export + 派生行为签名（`AuthContextActions`、`SwitchBackendFn`、`UnsubscribeFn`）+ 持久化 key 常量 + `BACKEND_REGISTRY_DEFAULT` 信息性示例 | `AuthContext` 类型、`TOKEN_STORAGE_KEYS`、`BACKEND_REGISTRY_DEFAULT` | shared `frontend-bind.tsp` SSOT |
| `legacy-client.ts` | 旧路由字面量表 `API_ROUTES`，由 features 层面向 msw 旧 `/api/catalog/*` 等路由消费 | `API_ROUTES`、`ApiRouteKey` | 镜像 `lab-management-system-nextjs/src/api/legacy-client.ts` |

**数据流**：

```
orval.config.ts 读 ../shared/generated/openapi/openapi.yaml
       │
       ▼ (npm run gen:shared)
src/api/endpoints/endpoints.ts        ← vue-query 具名函数
src/api/endpoints/endpoints.schemas.ts  ← TS 类型
       │
       ▼ 拦截器装在全局 axios 上（main.ts 调 installHttpClient）
authLogin() 等 → axios.request({ baseURL: getApiBaseUrl() })
       │
       ▼
后端（dev 默认 msw-http://localhost:5200 / prod 部署平台 env 覆盖）
```

**关键不变量**：

- `baseURL` 是 root URL，**不带 `/api/v1` 前缀**——path 自带，baseURL 别加（`memory/axios-baseurl-no-path-prefix.md`）；
- `installHttpClient` **必须在 `main.ts` bootstrap 调一次**，否则 prod 永远走同 origin 被 nginx 405（`memory/orval-axios-baseurl-must-be-installed.md`）；
- 拦截器置 `config.withCredentials = true`（跨源 aspnetcore springboot 凭 cookie 走 SSO state）；
- Token 注入用 callback `() => localStorage.getItem(TOKEN_STORAGE_KEYS.accessToken)`，避免循环依赖（state/auth 倒过来 import axios）。

### 3.2 src/components/app/ — 应用骨架

| 文件 | 角色 | 关联 fn-ID |
|---|---|---|
| `AppShell.vue` | 根布局：SidebarNav + 顶栏 + 内容区 + 登出按钮 | M01.F05.I04（登出入口） |
| `SidebarNav.vue` | 左侧菜单：菜单数据走 `composables/use-backend-menus.ts`（拉后端 `/api/auth/menus`，失败回静态 NAV） | M01.F04.I01（动态菜单下发） |
| `PageHeader.vue` | 标题栏（页面统一用） | — |
| `EmptyState.vue` | 空态组件（页面统一用） | — |
| `ConfirmDialog.vue` | 危险操作确认（取代 `window.confirm`） | — |
| `BackendBadge.vue` | 后端模式显示（读 env `apiMode + baseUrl`） | M98.F01.I01 |

**禁用**：每个功能页不得自己写标题栏 / 分页 / 空态 / `window.confirm` —— 必须调 `PageHeader` / `EmptyState` / `ConfirmDialog`（[CLAUDE.md §2 强制项](../../CLAUDE.md)）。

### 3.3 src/components/ui/ — shadcn-vue 原语

| 文件 | 角色 |
|---|---|
| `Button.vue` | shadcn-vue 风格按钮（CVA 变体） |
| `Input.vue` / `Label.vue` | 表单输入与标签 |
| `DropdownMenu.vue` + 子组件（Item/Label/Separator） | 下拉菜单容器 |

封装基于 `class-variance-authority` + `clsx` + `tailwind-merge`，与 react 仓 `src/components/ui/*` 1:1 形态对齐但**禁止源码复制**（[CLAUDE.md §2 §38](../../CLAUDE.md)）。

### 3.4 src/pages/ — 路由叶子（26 个 F.I 子项展开）

| 路由 path | 页面文件 | F.I | 备注 |
|---|---|---|---|
| `/login` | `LoginPage.vue` | M01.F05 | 公共页（不带 AppShell） |
| `/` | `DashboardPage.vue` | (M05.F01.I02) | 仪表盘统计 |
| `/models` / `/specifications` / `/grades` / `/brands` | `*Page.vue` (4) | M04.F06/07/08/09 | 基础数据 4 码表 |
| `/contracts` | `ContractsPage.vue` | M02.F01 | 合同列表三态过滤 |
| `/report-names` | `ReportNamesPage.vue` | M06.F07 | 报告名称 + extFields |
| `/param-interfaces` | `ParamInterfacesPage.vue` | M06.F08 | 参数界面维护 + link |
| `/receipts` | `ReceiptsPage.vue` | M03.F01 | 接样单列表（flowStatus 三态过滤） |
| `/receipts/:id` | `ReceiptDetailPage.vue` | M03.F09 | 接样单详情 + 历史时间线 + 报告预览 |
| `/task-assignment` | `TaskAssignmentPage.vue` | M03.F02 | 任务分配队列 |
| `/data-entry` | `DataEntryPage.vue` | M03.F03 | 样品 + 检测数据录入 |
| `/report-review` / `/report-approve` / `/report-issue` / `/report-archive` | `*Page.vue` (4) | M03.F05/06/07/08 | 报告 4 阶段（review/approval/issuance/archived） |
| `/inspection-specialties` | `SpecialtiesPage.vue` | M06.F01 | 检测专项 |
| `/inspection-objects` / `/inspection-parameters` / `/inspection-standards` / `/inspection-calculation-methods` / `/inspection-technical-requirements` | `*Page.vue` (5) | M06.F02/03/04/05/06 | 检测能力 5 主表 |
| `/summary` | `SummaryPage.vue` | M05.F01 | 报告汇总表 |
| `*` | `EmptyState`（404 兜底） | — | 路由不存在 |

每个 `*Page.vue` 几乎都是「调 `useXxxQuery()` 拉数据 → 拼 `features/<业务>/` 组件 → 套 `PageHeader` + `EmptyState`」。

### 3.5 src/state/ — Pinia stores

| 文件 | 角色 | 关联 fn-ID |
|---|---|---|
| `auth.ts` | AuthContext FSM 的 Vue 实现（`useAuthStore` + 模块级 FSM 动作 + 持久化 + 5 分钟 permissions 缓存） | M01.F04.I01/02 + M01.F05.I01/02/03/04 + M01.F05.I01（已废弃）+ M00.F01/F02 |
| `require-auth.ts` | `useRequireAuth({ permissions })` composable：监听 `auth.authState.kind` 做 redirect/拦截 | M01.F04.I03（路由守卫） |

**FSM 4 态**（镜像 nextjs `auth.ts`）：

```
idle → anonymous → awaiting_tenant → authenticated
                                            ↘ switchTenant ↗
```

**模块级函数而非 store action**：`login / logout / refresh / switchTenant / hasPermission` 都是模块级导出，store 只暴露 `state`。node 测试环境（vitest）无需组件树即可驱动 FSM。

### 3.6 src/features/ — 业务组合

10 个业务切分目录：

| 目录 | 对应 M | 形态 |
|---|---|---|
| `contracts/` | M02.F01 | list + form + delete modal |
| `data-entry/` | M03.F03 | sample + record 录入 + verdict 改判 |
| `dicts/` | M04.F06-F09 | 4 码表（models/specs/grades/brands）CRUD + 引用保护 |
| `inspection-capability/` | M06.F01-F05 | 5 主表 CRUD + 关联 link |
| `param-interfaces/` | M06.F08 | 接口维护 + link |
| `receipts/` | M03.F01 + M03.F09 | list + 详情 + 流程历史 + ext 字段补录 |
| `report-names/` | M06.F07 | 报告名称 + extFields + 标准/参数 link |
| `reports/` | M03.F05-F08 | 4 阶段审核动作（review/approve/issue/archive） |
| `summary/` | M05.F01 | 报告汇总表 + 仪表盘卡片 |
| `task-assignment/` | M03.F02 | 任务分配队列 + 安排/取消 |

每个 feature 内部按 `<业务>List.vue` / `<业务>FormModal.vue` / `<业务>RowActions.vue` 拆分。

### 3.7 src/composables/ / lib/

| 文件 | 角色 |
|---|---|
| `composables/use-backend-menus.ts` | 动态菜单加载：调 orval `authGetMenus()`（绑定 `M01.F04.I01`），拉失败回静态 `data/templates/nav.ts` |
| `lib/env.ts` | `import.meta.env.VITE_*` 集中读取 + 默认值兜底（dev 离线可跑） |
| `lib/responses.ts` | 响应归一化辅助（如 `ErrorResponse` 形态判断） |
| `lib/utils.ts` | `cn(...)`（clsx + tailwind-merge） |

---

## 4. 核心流程

### 4.1 dev：浏览器 → 后端

```
1. 启动 mock 后端:
   cd ../lab-management-system-msw && npm start
   → http://localhost:5200  ← GET /healthz → { ok: true, mode: "msw" }

2. 启动 vue:
   npm run dev
   → http://localhost:5200（Vite 默认端口；.env 默认 VITE_API_BASE_URL=http://localhost:5200）

3. main.ts bootstrap:
   createApp(App)
   app.use(pinia)
   installHttpClient(getTokenCallback)   ← 全局 axios 拦截器装上（baseUrl + Bearer + withCredentials）
   app.use(VueQueryPlugin, { queryClient })   ← retry: false
   app.use(router)
   app.mount("#app")
   void hydrateAuth()                      ← 从 localStorage 恢复会话

4. 浏览器进入 /contracts:
   <ContractsPage> 调 contractsListKey = useQuery(() => getContractsList({ ... }))
   → orval 具名函数 → axios.request({ url: "/api/contracts", baseURL: getApiBaseUrl() })
   → 拦截器置 Authorization: Bearer <token> (从 localStorage)
   → axios 发到 http://localhost:5200/api/contracts
   → msw 拦截 → handler 走 in-memory fixture
   → 返回 JSON

5. dev 切真后端（springboot :8080 / aspnetcore :5000）:
   .env.local 改 VITE_API_BASE_URL=http://localhost:5000
   → 重启 vite → 拦截器拿新 baseUrl → axios 走绝对 URL 直连 aspnetcore
   → 后端 TenantGuard 校验 HS256 真签 JWT（prod 走 JWKS，dev 走对称密钥）
```

### 4.2 dev：浏览器 → 真实后端（lab-aspnetcore :5000）

```
.env.local:
  VITE_API_BASE_URL=http://localhost:5000
  VITE_API_MODE=real
  VITE_SAAS_BASE_URL=http://localhost:5101  （SSO 跳板保留独立 env）

1. 启动 lab-aspnetcore (cd ../lab-management-system-aspnetcore && dotnet run)
2. 启动 vue (npm run dev)
3. 浏览器进入 /contracts
   → axios baseURL = http://localhost:5000
   → .NET 端 NimbusJwtDecoder HS256 真验签 (Phase 2B 后无 dev 兜底分支)
   → TenantGuard 校验 token.tenant_id vs path.tenantId
   → 业务返回

CORS：lab-aspnetcore 必须 allow 5202/5203（react/vue origin）+ 5201（nextjs origin；端口分段 conventions §6）
漏配 → preflight 失败 + 浏览器误报 CORS（详见父仓 §6.2）
```

### 4.3 一次"用户在合同页点新建"的全流程

```
点击「新建合同」按钮 (M02.F01.I02)
   ↓
ContractsPage 触发 features/contracts/ContractFormModal 打开
   ↓
用户填表 + 提交
   ↓
useMutation(() => postContract({ ... }))   ← orval vue-query 具名函数
   ↓
axios.post("/api/contracts", body, { baseURL: getApiBaseUrl() })
   ↓
拦截器：set Authorization: Bearer <accessToken>
拦截器：set withCredentials: true（跨源后端 SSO state cookie）
   ↓
→ msw（dev）或 aspnetcore/springboot（dev/prod）
   ↓ 响应
mutation onSuccess: queryClient.invalidateQueries(["contracts"])
   ↓
ContractsPage 列表自动 refetch
```

### 4.4 路由守卫（DashboardPage 内挂载）

```
App mount → pinia store 初始 state = { kind: "idle" }
            ↓
        void hydrateAuth()
            ↓
   idle --有 token-->         hydrate getCurrentUser 成功 → { kind: "authenticated" }
        --无 token-->         setState(anonymous)              → { kind: "anonymous" }
        --token 失效-->       refresh() 失败                    → { kind: "anonymous" }
            ↓
useRequireAuth() (DashboardPage 内)
   ↓ watch auth.authState.kind
        --anonymous-->     router.replace("/login?from=<path>")
        --awaiting_tenant--> router.replace("/login")  （2026-08-18 起合并到 /login）
        --authenticated + 缺权--> router.replace("/403")
        --authenticated + 有权--> allowed = true → render
```

---

## 5. v0.x 关键基建（与 saas-vue 同款 5 文件 + 废止项）

### 5.1 v0.x 已落地的 5 个接线文件（与 saas-vue 完全同构）

| 文件 | 角色 | 等价 saas-vue 文件 |
|---|---|---|
| `src/lib/env.ts` | `import.meta.env` 集中 + 默认值 | `saas-identity-platform-vue/src/lib/env.ts` |
| `src/api/backend-config.ts` | `getApiBaseUrl()` / `getApiMode()` | `saas-identity-platform-vue/src/api/backend-config.ts` |
| `src/api/http-client.ts` | `installHttpClient` + `ApiError` + `toApiError` | `saas-identity-platform-vue/src/api/http-client.ts` |
| `src/api/contracts.ts` | re-export + 行为签名 + `TOKEN_STORAGE_KEYS` + `BACKEND_REGISTRY_DEFAULT` 信息 | `saas-identity-platform-vue/src/api/contracts.ts` |
| `orval.config.ts` | 读 `../lab-management-system-shared/generated/openapi/openapi.yaml`，client `vue-query`，filters `tags: ["frontend-bind-meta"]` | `saas-identity-platform-vue/orval.config.ts`（同款） |

**不在 5 文件内的 mirror**：vue 仓独有 `src/api/legacy-client.ts`（镜像 nextjs Sprint 2 Batch 1），与 react 仓的 `apiClient = axios.create(...)` 不一致——见 `legacy-client.ts` 头部注释。

### 5.2 已废止项（禁止复活）

| 废止项 | 来源 | 现替代 |
|---|---|---|
| `useBackendStore`（Pinia） | backend-context.tsx 镜像 | env 直接读 `getApiMode()` |
| `BackendSwitcher.vue` 下拉切换 | M98.F01.I01 已上线 ≠ 运行时切后端 | `BackendBadge.vue` 仅展示 |
| 持久化 baseUrl 到 `localStorage["lab.backend"]` | M98.F01.I02 已废弃 | env-driven（`.env.local` 文件级） |
| `VITE_ENABLE_MSW=true` + Service Worker 拦截 | ADR-0012 v0.3.0 | msw-http 模式（独立 HTTP 服务） |
| `isMswEnabled()` getter | v0.3.0 | 删除（msw-http 是默认 dev mode） |
| 4-backend 联合类型 `BackendId = "msw" | "nextjs" | "springboot" | "aspnetcore"` + 运行时切 | ADR-0014 | env-driven 单 URL；`BackendId` 仍存在但只在 `BACKEND_REGISTRY_DEFAULT` 信息性数组中 |

### 5.3 三层 env 与部署

| 层 | 文件 | git | 用途 |
|---|---|---|---|
| 模板 | `.env.example` | committed | 部署平台/新人看 VITE_* 变量 |
| 本地 | `.env.local` | **gitignored** | dev 真后端（aspnetcore :5000、springboot :8080） |
| 测试 | `.env.test` | committed | vitest MSW 隔离（react/vue/nextjs 共用同一组） |

**`.env.example` 必须含**：VITE_API_BASE_URL / VITE_API_MODE / VITE_SAAS_BASE_URL / VITE_DEV_PORT（实际部署平台覆盖）。

---

## 6. 决策索引

本仓决策 90% 落在 *父仓* `docs/adr/`，本仓 `docs/adr/` 仅 `.gitkeep` 占位。引用如下：

### 6.1 直接相关（lab / vue 仓专项）

| ADR | 主题 | 与本仓的关联 |
|---|---|---|
| [0011](../../../docs/adr/0011-lab-vue-m98-whitelist-mirror.md) | lab-vue M98 白名单镜像 | vue 仓镜像 react 仓的 8 个 M98 ID 进 `LAB_VUE_EXTRA`，避免 L5 红 |
| [0012](../../../docs/adr/0012-msw-as-http-server.md) | msw 仓升级为独立 HTTP 服务（B 强度） | 本仓 dev 默认 baseUrl = `http://localhost:5200`（lab-msw HTTP 服务），不再用 Service Worker |

### 6.2 通用（所有 6 个前端仓对称）

| ADR | 主题 | 本仓落地 |
|---|---|---|
| [0001](../../../docs/adr/0001-suite-owns-l0-and-l5.md) | suite 保留 L0 / L5 门 | 本仓仅在 `.harness/stack.json` 声明 L1-L4 |
| [0002](../../../docs/adr/0002-trace-json-as-cross-language-anchor-contract.md) | trace.json 是跨语言锚点 | vitest 用 `fnTest(["M0x.F0y.I0y"], "desc", ...)`，由 suite 提供 `trace_cmd` |
| [0003](../../../docs/adr/0003-function-tree-requires-human-approval.md) | 功能清单变更需人批 | 改 F/I 必须先提 `/tree-change` 提案 |
| [0005](../../../docs/adr/0005-defense-in-depth-for-protected-paths.md) | 受保护路径纵深防御 | `.claude/hooks/` 不让改 + pre_bash_guard 启发式拦截 |
| [0007](../../../docs/adr/0007-shared-sql-ssot.md) | shared 仓扩到双 SSOT | 本仓只 consume openapi.yaml（SSOT-A），不碰 SQL（SSOT-B） |
| [0008](../../../docs/adr/0008-nextjs-full-stack.md) | nextjs 全栈决策 | **本仓不适用**（vue 不兼全栈；与 nextjs-self 全栈形成对照） |

### 6.3 镜像同源（react 仓同款）

| ADR | 主题 | 来源仓 | vue 仓镜像日期 |
|---|---|---|---|
| M98 接线层 8 ID 白名单 | lab-react a9d6d99 | ADR-0011 | 2026-08-18 |

### 6.4 隐含 ADR（[multi-repo-family.md §4](../../../../docs/conventions/multi-repo-family.md)）

| 编号 | 主题 | 本仓落地 |
|---|---|---|
| ADR-0014 | env-driven 单 URL | `src/api/backend-config.ts` + `src/lib/env.ts`；`getApiBaseUrl()` + `getApiMode()` 替代旧 4-backend 联合类型 |

---

## 7. 术语表

| 术语 | 含义 | 详细 |
|---|---|---|
| **vue-query client** | orval 输出形态之一 | 产出 `@tanstack/vue-query` 的 `useQuery` + 具名函数；区别于 `react-query` |
| **installHttpClient** | axios 拦截器入口 | main.ts bootstrap 调一次，装 `baseURL + Authorization + withCredentials` |
| **fs (FSM)** | 4 态 `AuthState`：`idle / anonymous / awaiting_tenant / authenticated` | shared `frontend-bind.tsp` 契约，vue 端 `state/auth.ts` 实现 |
| **withCredentials** | axios 跨源凭据 cookie | aspnetcore/springboot SSO state cookie 是 `HttpOnly`，XHR 默认不携带，必须显式 true |
| **env-driven 单 URL** | ADR-0014 落地形态 | 替代 4-backend 联合类型 + localStorage 持久化；只在 .env 改 VITE_API_BASE_URL |
| **M98** | 前端接线层（apiclient / 后端切换 / orval endpoint 引用） | 与业务模块 M00-M06 正交；vue 仓镜像 8 ID（ADR-0011） |
| **M98.F01.I02 已废弃** | 持久化 baseUrl 到 localStorage | env-driven 落地后，作废；禁止复活 |
| **legacy-client** | 旧路由字面量表 `API_ROUTES` | 镜像 nextjs；features 层面向 msw `/api/catalog/*` 路由消费；新代码走 orval |
| **5 文件接线** | env / backend-config / http-client / contracts / orval.config | 与 saas-vue 完全同构；vue 独有 legacy-client 不在此列 |
| **msw-http** | ADR-0012 v0.3.0 dev 默认模式 | msw 仓升级为独立 Express 服务，本仓 baseUrl 默认 `http://localhost:5200` |
| **shadcn-vue** | UI 原语风格 | 基于 CVA + clsx + tailwind-merge；与 react 仓 shadcn/ui 1:1 形态，禁止源码复制 |
| **trace.json** | 测试命中 fn-ID 的清单 | 由 suite 提供 `trace_cmd` 产物，禁止手写 |
| **fnTest** | 测试嵌入 fn-ID 模式 | `fnTest(["M0x.F0y.I0y"], "desc", () => ...)` |
| **stack.json** | 项目自描述（栈 + 门配置） | suite 门禁读它，项目只能声明 L1-L4 |

---

## 8. 参考索引

| 想看… | 跳到 |
|---|---|
| 功能清单（BASE 镜像 + I 子项） | [docs/functions/function-tree.md](../functions/function-tree.md) |
| 项目入口（技术栈 + 禁令） | [CLAUDE.md](../../CLAUDE.md) |
| Sprint 路线（0/1/2） | [docs/conventions/sprint-roadmap.md](../conventions/sprint-roadmap.md) |
| 流程/设计（人评审） | [docs/design/](../design/) |
| 编码细则（不入主上下文） | [docs/conventions/README.md](../conventions/README.md) |
| 父仓架构总览 | [docs/ARCHITECTURE.md](../../../../docs/ARCHITECTURE.md) |
| 父仓 ADR 索引（12 份） | [docs/adr/](../../../../docs/adr/) |
| 跨仓经验教训（不入仓） | `~/.claude/projects/d--qiand-life-1-projects-xr-code-suite/memory/`（含 11 条 memory） |
| Lab 管理家族契约 SSOT | `../lab-management-system-shared/tsp/main.tsp` |
| Lab mock 后端 HTTP 服务 | `../lab-management-system-msw/src/server.ts` |

---

## 附录 A：与父仓 docs/ARCHITECTURE.md 的关系

本文档 **不重复** 父仓已经写过的内容，只做"zoom in"：

| 主题 | 父仓章节 | 本仓独有的展开 |
|---|---|---|
| 多仓家族 14 仓全景 | [父仓 §1](../../../docs/ARCHITECTURE.md#1-套件全景) | 本仓 §1.1 与 react/nextjs 的角色矩阵 |
| 5 种角色契约流 | [父仓 §2.1](../../../docs/ARCHITECTURE.md#21-五种角色) | 本仓 §3 核心模块（src/api/ 详尽） |
| 端形态 6 个前端仓 | [父仓 §4.3](../../../docs/ARCHITECTURE.md#43-前端仓reactvuenextjs--6-仓) | 本仓 §2 目录骨架 + §5 v0.x 接线 5 文件 |
| 后端模式 env-driven | [父仓 §3.3](../../../docs/ARCHITECTURE.md#33-后端模式env-driven-单-urladr-0014) | 本仓 §3.1 backend-config + §5.2 废止项 |
| OAuth 2.0 + JWT（HS256）契约 | [父仓 §3.4](../../../docs/ARCHITECTURE.md#34-认证与授权模型oauth-20--jwt) | 本仓不展开（前端不验签，由后端 NimbusJwtDecoder / jose 负责） |
| 端口 CORS env 全景 | [父仓 §6](../../../docs/ARCHITECTURE.md#6-端口--cors--env-全景) | 本仓不重复表，按需跳父仓 |
| 决策索引 12 份 ADR | [父仓 §7](../../../docs/ARCHITECTURE.md#7-决策索引) | 本仓 §6 标"本仓直接相关 + 通用"，其余按需跳父仓 |
| 14 子仓索引 | [父仓 §9](../../../docs/ARCHITECTURE.md#9-索引14-子仓-claudemd-一览) | 不重复 |

**原则**：本仓读者遇到的"什么是 shared 仓""什么是 msw 仓""什么是 function tree"，跳父仓；遇到"本仓 src/api/ 长什么样""本仓 FSM 怎么走""本仓 5 文件接线是什么"，看本仓。

## 附录 B：典型陷阱（本仓踩过的坑）

| 陷阱 | 后果 | 解法 | 来源 |
|---|---|---|---|
| 没调 `installHttpClient()` | prod 永远走同 origin 被 nginx 405；bundle grep 看 URL 又正确 | main.ts bootstrap 调 `installHttpClient(getTokenCallback)` | `memory/orval-axios-baseurl-must-be-installed.md` |
| `baseURL` 含 `/api/v1` | path 前缀重复 → 404 | baseURL 是 root URL；path 自带 `/api/v1` 前缀 | `memory/axios-baseurl-no-path-prefix.md` |
| orval 不显式钉 `openapi-types` | npm install 不动；npm ci EUSAGE | devDeps 显式钉 `openapi-types` 版本 | `memory/orval-openapi-types-lockfile-trap.md` |
| 把 `enableMsw` 留着当 SW 拦截 | v0.3.0 后 SW 已删除；`isMswEnabled()` 也删除 | msw-http 是唯一 dev 模式；baseUrl 默认 `http://localhost:5200` | ADR-0012 v0.3.0 |
| 复活 `BackendSwitcher` / `useBackendStore` | 违反 ADR-0014；L5 红 | 改 `BackendBadge` 只展示 env | ADR-0014 |
| 跨源后端没 enable `withCredentials` | SSO state cookie 不带 → 401 | http-client.ts 拦截器统一定 `config.withCredentials = true` | 本仓 §4.1 |
| 给 skip/xfail 测试挂 fn-ID | L5 红（fnTest 无对应表行） | 测试须真跑通才能挂 ID | [父仓 §5.4](../../../docs/ARCHITECTURE.md#54-门禁链) |
| `codegraph` 工具不解析 shared `tsp/` | shared 契约仓别装 codegraph | 看 `docs/functions/function-tree.md` 就够 | `memory/codegraph-typespec-mismatch.md` |
| 后端跑 `dotnet run` 停不干净 | 残留子进程占端口 | 按端口反查杀子进程 exe | `memory/stop-dotnet-run-kills-full-tree.md` |
| shared emit 撞号（V014 / V015 重号） | Spring Boot Flyway 启动失败 | `gen-shared.sh` `cmp` 目标 + 永久分叉白名单 | [父仓 §5.1](../../../docs/ARCHITECTURE.md#51-改一次契约--三端同步codegen-链) |

---

## 附录 C：版本/部署/提交

| 项 | 值 | 备注 |
|---|---|---|
| 当前版本 | 0.1.0（Sprint 2 Batch 2B-5 上线） | `package.json` |
| orval 版本 | ^7.5.0 | `package.json` devDep |
| vue-query 版本 | ^5.62.0 | `package.json` dep |
| Vue 版本 | ^3.5.0 | `package.json` dep |
| Tailwind 版本 | ^4.3.3（v4 语法：`@import "tailwindcss"`） | `index.css` |
| Dockerfile | nginx 静态构建 | 顶层 |
| 部署脚本 | `deploy/lab-management-system-vue.sh` + `setup-vps.sh` | VPS init + nginx + certbot |
| 反向代理 | `deploy/nginx-vps.conf.example` | 模板，实例化覆盖 |
