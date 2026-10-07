# REQ-2026-020 M05.F01 仪表盘核心指标卡 + 任务状态漏斗（vue）

| 项 | 值 |
|---|---|
| 提出人 | Claude 机器侧规划推进 |
| 提出日期 | 2026-10-07 |
| 优先级 | P1 |
| 状态 | 开发中 |
| 关联 ADR | ADR-0042（mirror 免批三类） |

## 1. 需求描述

react 仓 REQ-2026-017 已把 M05.F01.I03/I04 做到已上线待人工验收（015e376）。
vue 仓树同两行仍规划：契约字段在 shared 生成物里俱在
（DashboardStats.todayTestCount/qualifiedRateByMaterial/reportOutputByStatus/
funnelByStage），nextjs/react 同名行已上线产出数据，vue SummaryList.vue
补同名 UI 区块即可对齐，属镜像推进。

### 澄清记录

| 疑问 | 澄清结论 | 澄清人 | 日期 |
|---|---|---|---|
| 测试形状 | vi.mock axios + 内联 fixture（vue 仓既有机制，非真链路） | Claude | 2026-10-07 |
| UI 形状 | 镜像 react SummaryList 同名区块，testid 逐字对齐 nextjs/react | Claude | 2026-10-07 |

## 2. 验收标准

| 编号 | 场景（给定） | 操作（当） | 预期（则） |
|---|---|---|---|
| AC-1 | SummaryList.vue 无 I03/I04 区块 | 加载后 | 核心指标三卡（今日试验总数/报告产出量/检测合格率）与六段漏斗渲染，data-fn 锚在场 |
| AC-2 | 真实现前 | 跑 summaryList.dom.test.ts 新增 I03/I04 fnTest | 红（锚不存在），证测试先行 |
| AC-3 | 实现后 | 全门 L1-L4 + trace + gate | 全绿，trace I03/I04 各锚 ≥1 |

## 3. 任务拆解

| 任务 ID | 任务描述 | 类型 | 负责人 | 预估 | 状态 |
|---|---|---|---|---|---|
| T-1 | REQ + 树 2 行推进开发中（tree_change 正门 mirror --apply）+ 设计映射 2 行 + 台账 + 测试先行（red） | 流程 | Claude | 0.5h | 完成 |
| T-2 | SummaryList.vue 补 I03/I04 区块转绿 | 实现 | Claude | 1h | 完成 |
| T-3 | 全门链 L1-L4 + trace + gate + 提交推送 | 门禁 | Claude | 0.5h | 完成 |

## 4. 功能影响（需求与功能对齐的唯一位置）

| 功能 ID | 功能名称 | 影响类型 | 说明 | 关联任务 |
|---|---|---|---|---|
| M05.F01.I03 | 核心指标卡 | 变更 | 规划→开发中：SummaryList 补核心指标三卡（todayTestCount/reportOutputByStatus/qualifiedRateByMaterial），镜像 nextjs/react 同名区块 | T-1/T-2 |
| M05.F01.I04 | 任务状态漏斗 | 变更 | 规划→开发中：SummaryList 补六段漏斗（funnelByStage），镜像 nextjs/react 同名区块 | T-1/T-2 |
