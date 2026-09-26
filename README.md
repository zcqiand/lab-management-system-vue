# 实验室管理系统 · Vue 前端

建筑工程实验室管理系统的 Vue 前端 —— 镜像 react 仓实现（Vite + Pinia + shadcn-vue），前端 only。

本仓为《Vue从入门到项目实践》（亚马逊电子书）案例一「实验室管理系统」（第 34-38 章）的可运行配套工程，是书稿代码块的 **source of truth**。

## 快速开始

```bash
npm install        # 安装依赖
npm test           # 全量测试（无 Key / 无 Docker / 无网可跑）
npm run dev        # 本地开发（Vite）
npm run build      # 生产构建
```

以上为前端本仓；完整跑通业务链路还需按各章说明启动配套后端与数据库（见第 34 章）。

## 功能特性

- react 仓先实现、vue 仓翻译；不实现后端 route（无 mock 层，dev 由 BackendSwitcher 直连三真后端：nextjs :5201 / aspnetcore :5204 / springboot :5205）
- orval 读 shared 仓 OpenAPI 生成 `src/api/endpoints/`（vue-query client）
- shadcn-vue + Tailwind v4；env 驱动单 URL（ADR-0014）

## 技术栈

| 技术 | 版本 |
| :--- | :--- |
| Vue | ^3.5.0 |
| Vue Router | ^4.5.0 |
| Pinia | ^2.3.0 |
| @tanstack/vue-query | ^5.62.0 |
| orval | ^7.5.0 |
| TypeScript | ^5.7.0 |
| Vite | ^6.0.0 |
| Vitest | ^2.1.0 |
| Tailwind CSS | ^4.3.3 |

> 依赖版本与 `version-lock.json` 的 `version_lock` 一致，不引入 lock 外的库。

## 配套书籍及章节映射

> 同一案例仓后续接入其他书籍时，在此节下新增书籍小节。

### 《Vue从入门到项目实践》（亚马逊电子书）

- 书稿基线：tag `v0.3.40-20260925`（冻结，正文代码清单以此为准）
- 书稿定位：案例一「实验室管理系统」，覆盖第 34-38 章

| 章 | 主题 | 对应源文件 |
| :--- | :--- | :--- |
| 34 | 案例一：项目立项与架构设计 | `src/main.ts`、`src/router.ts`、`src/components/app/AppShell.vue` |
| 35 | 案例一：认证与权限模块 | `src/pages/LoginPage.vue`、`src/state/auth.ts`、`src/state/require-auth.ts` |
| 36 | 案例一：数据管理与业务模块 | `src/features/contracts/ContractsList.vue`、`src/features/data-entry/DataEntryPage.vue`、`src/features/inspection-capability/InspectionCapabilityList.vue` |
| 37 | 案例一：流程引擎与状态机 | `src/features/task-assignment/TaskAssignmentList.vue`、`src/features/reports/ReportPhasePage.vue`、`src/features/receipts/ReceiptDetail.vue` |
| 38 | 案例一：测试与交付 | `tests/`、`vitest.config.ts`、`nginx.conf`、`Dockerfile`、`.github/workflows/ci.yml` |

## 快速链接

- [CLAUDE.md](CLAUDE.md) — 开发约定与编码规范
- [系统架构.md](docs/ARCHITECTURE.md) — 结构 / 边界 / 数据流 / 决策
- [功能规格.md](docs/functions/function-tree.md) — 功能名称、描述与验收标准
- [未来开发计划](PLAN.md) — 待办与迭代方向
- [更新日志](CHANGELOG.md) — 版本变更记录
