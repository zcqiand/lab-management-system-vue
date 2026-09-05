# CHANGELOG — lab-management-system-vue

格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)。

## [0.3.50] — 2026-09-05

shadcn-vue 迁移 **Phase 2d-2**（Select 收官）。至此 `src/` 下**不再有任何 raw
`<select>` 元素**（剩余 grep 命中全是注释）。本条目记录收尾的 6 个文件 15 处
`<select>`，外加 ReceiptsList 14 处 `<label>` 的配对重构。

上半场由前一会话迁了 4 个文件（InspectionCapabilityList 6 / CalculationMethodList 4
/ TechnicalRequirementList 3 / DefaultParamCard 3）。

**4 张数据录入卡（10 处）**：

- `RebarMechNumericCard.vue` — 3 处（技术要求 / 整体单项评定 / 逐行断裂位置）
- `RebarWeldingTensileCard.vue` — 3 处（技术要求 / 整体单项评定 / 逐行断裂特征）
- `RebarWeldingBendCard.vue` — 2 处（整体单项评定 / 逐行弯曲结果）
- `StrengthCardBase.vue` — 2 处（技术要求 / 单项评定）；`onReqChange` /
  `onManualVerdictChange` 签名从 `(e: Event)` 改 `(v: string | number)`

**DefaultParamCard 补正**：Phase 2d-1 给 3 个 `<Label>` 加了 `for="standardCode"`
之类的**悬空 for**（指向不存在的 id —— 卡片按参数重复挂载，id 必撞所以没法配对）。
悬空 for 对读屏比没有更糟，本次全部删掉，改用 `<SelectTrigger aria-label>`。

**ReceiptsList（5 处 select + 14 处 label）**：

- 列表页流程状态筛选：`FlowFilter` 的 `""` 改 `"__all__"` sentinel（与
  ContractsList / InspectionCapabilityList 同约定）；`load()` 只认
  `receiving` / `submitted`，所以 `__all__` 天然翻译成「不下发 flowStatus」
- 新建 / 编辑弹窗各 2 处（检测类别 / 样品来源），选项字面量提成
  `TEST_CATEGORIES` / `SAMPLE_SOURCES` 常量，去掉两弹窗 6 处重复
- **14 个 raw `<label>` 包裹式关联 → `<Label for>` + 控件 `id` 显式配对**。
  这批是 Phase 1.4 特意跳过、留给 Select 到位后一起改的：reka-ui 触发器是
  `<button role="combobox">`，包在 `<label>` 里点击语义会打架（label 激活
  button = 开下拉）。id 前缀 `receipt-create-*` / `receipt-edit-*` 分开 ——
  两弹窗 `v-if` 互斥本不会撞，分开是防以后有人改成同时渲染

**测试**（295 → 298）：

- `cardsAll.dom.test.ts` 新增 Phase 2d-2 锚测 11 条；`receiptsList.dom.test.ts`
  新增 4 条
- 其中 4 条是**行为断言**而非形态断言，锁 `__none__` 哨兵翻译回路 +
  `__all__` 不下发 flowStatus。做过变异验证：把
  `v === NONE ? '' : String(v)` 改成 `String(v)`，锚测立刻变红
- 新增 `tests/selectInteraction.ts`：把 foundation 测试里的
  `openSelect` / `pickSelectItem`（native PointerEvent dispatch）提出来共享

**踩坑记录**：

1. **`<option value="">` 不能直译** —— reka-ui `SelectItem` 禁空串 value（保留给
   placeholder）。统一走 `NONE = "__none__"` 哨兵 + handler 里翻译回 `''`，
   `onChange` 语义与迁移前逐字节一致
2. **`SelectValue` 首帧不回显选中项文本** —— reka-ui 在关闭态把 `SelectContent`
   的 items teleport 进一个 `DocumentFragment`，靠 `SelectItemText.onMounted`
   注册 `value→text` 到 `rootContext.optionsSet`；而 fragment 本身在
   `SelectContent` 的 `onMounted` 里才创建。所以首帧没有 options，
   测试断言回显文本必须先 `await flushPromises()`。**产品侧无影响**
   （挂载后一帧就补上），只影响同步断言
3. **`openSelect` / `pickSelectItem` 只在 Teleport 被 stub 时有效** ——
   `mountWithProviders` 会 stub；裸 `mount()` 下走真实 portal，pointerup
   打不通选中回路。裸 mount 的场景改从 `<Select>` 组件边界
   `$emit("update:modelValue", v)` 直接验业务 handler
4. **`RebarWeldingBendCard` 的整体单项评定 `<Select>` 是死分支** ——
   `parseBendRecord` 把 `results[t]` 归一成「合格 | 不合格」（非 `不合格` 一律
   `合格`），`overall` 恒非空 → 顶部永远走 `<span>` 分支，`v-else` 渲染不出来。
   本次照译保行为等价，锚测断言它「不出现」；**清理留 Phase 3**（要产品确认
   这个兜底还要不要）
5. **触发器视觉对齐** —— `TRIGGER_CLS` 是
   `"inline-flex h-8 w-auto min-w-24 gap-1 px-2 text-sm"`，压过 CVA 基类的
   `flex h-9 w-full`（display / width / height 同组，tailwind-merge 二选一取后者）

**验证**：gate exit 0，L0 / L0.no_fallback / L0.5 / L1 / L2 / L3 / L4 / L5 全 PASS；
298 测试 29 文件全绿；`vue-tsc --noEmit` 零错；100 功能条目引用完整，软告警 0 条。

## [0.3.49] — 2026-09-05

shadcn-vue 迁移 **Phase 2d-1**（raw `<select>` → `<Select>` / `<SelectTrigger>`
/ `<SelectContent>` / `<SelectItem>` / `<SelectValue>` 五原语）。新增 5 个原语
（基于 reka-ui `SelectRoot` + `SelectPortal` + `SelectItemText`），迁移 5 个文件
共 7 处 `<select>`。

**新增 5 个原语**（reka-ui Select 复合原语，单 Select 包不下 — trigger / content
/ item 必须共享 SelectRoot context，所以拆 5 sub-component）：

- `src/components/ui/Select.vue` — reka-ui `SelectRoot` 包裹；`v-bind="$attrs"`
  `inheritAttrs:false` 让 `class` 走 `cn()` 末尾（调用方胜出，tailwind-merge）；
  `modelValue` 类型 `string | number`；emit `update:modelValue` + `update:open`
- `src/components/ui/SelectTrigger.vue` — reka-ui `SelectTrigger` + `SelectIcon`
  `lucide-vue-next` 的 `<ChevronDown>`（替代 native select 下拉箭头）；
  shadcn-vue 标准 class 串（`flex h-9 w-full rounded-md border border-input ...`）；
  默认插槽放 `<SelectValue>`；`aria-label` / `data-fn` 经 `$attrs` 落到真实
  `<button role="combobox">`；`disabled` 无条件绑定（undefined 时 Vue 移除属性）
- `src/components/ui/SelectContent.vue` — reka-ui `SelectPortal` + `SelectContent`
  `SelectViewport` 包裹；shadcn-vue 标准 class 串（`z-50 max-h-96 ... shadow-md`
  data-state 动画）；`position="popper" | "item-aligned"`（默认 popper）
- `src/components/ui/SelectItem.vue` — reka-ui `SelectItem` + `SelectItemText`
  `SelectItemIndicator` + `<Check>` icon 选中指示（`absolute left-2`）；`text`
  prop 走 SelectItemText（reka-ui 把 SelectItemText 文本配对回写到 SelectValue）；
  默认插槽也支持
- `src/components/ui/SelectValue.vue` — reka-ui `SelectValue` 包裹；从 SelectRoot
  context 读当前值并展示；`placeholder` 在 value 为空时显示 fallback

**5 个文件 7 处 `<select>` 迁移**：

- `src/features/dicts/CategoryDictList.vue` — 1 处（弹窗「检测项目」select，
  `:disabled="!!editing"` 编辑态锁住，class `w-full rounded border ... disabled:bg-gray-100`）
- `src/features/summary/SummaryList.vue` — 1 处（顶部「报告类别」filter，6 个
  option：ALL / RC / ST / MT / AD / ID；`<Label for=categoryCode>` 配对改为
  SelectTrigger 的 `id="categoryCode"`）
- `src/features/contracts/ContractsList.vue` — 2 处（顶部 status filter：3 个
  option 「全部状态 / 在用 / 已归档」；弹窗 form.status：2 个 option 「在用 / 已归档」）。
  顶部 filter 的 `value=""` 在 reka-ui 是禁用值（保留给 placeholder），所以走
  `"__all__"` sentinel，在 `load()` 里翻译回空串才不下发给 API
- `src/features/data-entry/DataEntryPage.vue` — 2 处（录入弹窗样品 + 检测参数
  select，**保留 Phase 1.4 wrapping 模式**：`<Label class=text-xs block>` 包着
  `<Select>`，SelectTrigger 渲染的 `<button role="combobox">` 是 `<label>` 的后代，
  测试断言 selector 从 `find("select")` 改 `find('[role="combobox"]')`）
- `src/features/data-entry/models/ConcretePermeabilityCard.vue` — 1 处 ×6 行
  （渗水情况 select ×6：`未渗` / `已渗`；原 `:value` + `@change` 受控写法改
  `:model-value` + `@update:model-value`；`aria-label` 从 `<Select>` 移到
  `<SelectTrigger>` 才能落到真实 button — reka-ui SelectRoot 是 Fragment，
  attrs 不会自动 propagate 到 trigger）

**Phase 2d-1 原语回归锚 8 case**（不挂功能 ID，工程设施测试）：
`tests/foundation/shadcn-select.dom.test.ts` + `__fixtures__/SelectFixture.vue`

- `<SelectTrigger>` 渲染为 `<button type="button" role="combobox">`；
  `aria-label` / `data-fn` 走 `$attrs` 落到真实 DOM；class prop 经 `cn()` 合并
- `<SelectValue>` placeholder 在 modelValue 为空时显示 fallback
- 点 `<SelectTrigger>` 打开 portal → `<SelectContent>` 渲染为 `div[role="listbox"]`
- `<SelectItem>` 渲染为 `div[role="option"]`；3 个选项文本正确
- 点 `<SelectItem>` → v-model 双向写回（trigger 显示新值，state span 同步）
- 选中态 `<SelectItem>` 挂 `data-state="checked"`
- `<Select :disabled>` 受控 disabled 落到真实 `<button>` 的 disabled 属性
- class prop `<SelectTrigger class="extra-class">` 经 `cn()` 合并（基类 + 调用方共存）

**测试 selector 迁移 3 文件**：

- `tests/features/data-entry/cardsAll.dom.test.ts` — Phase 2a-4 ConcretePermeabilityCard 锚：
  `bodyRows[0]!.find('[role="cell"] select[aria-label="试件 1 渗水情况"]')` →
  `bodyRows[0]!.find('[role="cell"] [role="combobox"][aria-label="试件 1 渗水情况"]')`
- `tests/features/data-entry/dataEntryPage.dom.test.ts` — Phase 1.4 wrapping 锚：
  `labels[0].find("select")` → `labels[0].find('[role="combobox"]')`，注释
  从「raw <select> 留 Phase 2d」改「<Select> 触发器渲染为 <button role=combobox>」
- `tests/features/summary/summaryList.dom.test.ts` — F01+F02 下拉存在断言：
  `#categoryCode` 现在指向 SelectTrigger button，`role="combobox"`；初始显示
  从「请选择类别」placeholder 改「全部」（categoryCode 默认值 "ALL" 被
  SelectItemText 配对回写）

**踩坑 / 教训**：

- **reka-ui SelectItem 不允许 `value=""`**：`reka-ui/src/Select/SelectItem.vue:129`
  显式抛 "A <SelectItem /> must have a value prop that is not an empty string.
  This is because the Select value can be set to an empty string to clear the
  selection and show the placeholder." —— 空串是 placeholder 的哨兵值，业务
  想表达「不限 / 全部」必须换 sentinel。ContractsList 顶部 status filter
  从 `value=""` 改 `value="__all__"`，`status = ref("__all__")` 初始化同步；
  `load()` 里 `apiStatus = status.value === "__all__" ? "" : status.value` 翻译
  回空串才不下发给 API（业务接口约定 `status` 缺省 = 全部）
- **reka-ui SelectRoot 是 Fragment，`$attrs` 不会自动 propagate 到 SelectTrigger**：
  `<Select aria-label="...">` 把 `aria-label` 给到 SelectRoot 的 root（一个 Fragment，
  渲染时直接挂 slot），不会下沉到 SelectTrigger。`aria-label` / `data-fn` /
  `id` 必须直接挂在 `<SelectTrigger>` 上。ConcretePermeabilityCard 6 行 ×
  `aria-label="试件 N 渗水情况"` 从 `<Select>` 移到 `<SelectTrigger>` 才生效
- **reka-ui SelectTrigger 监听 `pointerdown` 开门，不是 `click`**：
  `onTriggerPointerDown` → `handlePointerOpen` → `rootContext.onOpenChange(true)`；
  `onTriggerClick` 只做 `event.currentTarget.focus()`。所以 jsdom 测试不能用
  `trigger.trigger("click")` 触发打开，必须 dispatch native `pointerdown` event。
  jsdom 25 缺 `PointerEvent` 构造函数 + `HTMLElement.hasPointerCapture`，需
  fallback 到 `MouseEvent` + 给 element 补 `hasPointerCapture = () => false`
- **reka-ui SelectItem 用 `pointerup` 选中，不是 `click` 也不是 `pointerdown`**：
  `onPointerup: handleSelectCustomEvent` 是选中入口；`onPointerdown` 只做
  `event.currentTarget.focus({ preventScroll: true })`。所以测试触发选中
  必须 dispatch `pointerup` event（同 fallback 处理）
- **SelectValue 文本显示靠 SelectItemText 配对**：reka-ui 在 SelectItem mount
  时把 `SelectItemText` 内的文本 content 配对回写到 SelectValue context，
  SelectValue 渲染时优先用这个文本而不是 placeholder。所以 `<SelectItem
  value="ALL">全部</SelectItem>` + 初始 `modelValue = "ALL"` 时，trigger 显示
  「全部」（不是 placeholder）。这与 raw `<select><option selected>` 行为 1:1

**验证**：

- vitest: 283 case / 29 文件全绿（Phase 2b/c 基线 275 + 新 Select 回归锚 8）
- vue-tsc --noEmit 零错误
- gate -p lab-management-system-vue exit 0，L0/L0.no_fallback/L0.5/L1/L2/L3/L4/L5
  全 PASS，100 个功能条目引用完整

## [0.3.48] — 2026-09-05

shadcn-vue 迁移 **Phase 2b + 2c**（raw `<input type="checkbox">` / `<textarea>` →
`<Checkbox>` / `<Textarea>` 原语）。新增 2 个原语，迁移 8 处表单控件（5 checkbox
和 2 checkbox 和 1 textarea），引入 reka-ui 的 `CheckboxRoot` 作为底层（a11y
升级：`<button role="checkbox">` 自带键盘处理，aria-checked 三态）。

**新增 2 个原语**：

- `src/components/ui/Checkbox.vue` — reka-ui `CheckboxRoot` + `CheckboxIndicator`
  包裹；shadcn-vue 标准 class 串（`h-4 w-4 rounded-sm border-primary ...`，
  `data-[state=checked]:bg-primary`，`data-[state=indeterminate]:bg-primary`）；
  `lucide-vue-next` 的 `<Check>` 当 checked 视觉；`inheritAttrs:false` +
  `v-bind="$attrs"` 让 `aria-label` / `data-fn` 落到真实 `<button>`
- `src/components/ui/Textarea.vue` — 手写原生 `<textarea>`（Phase 1.5 审计原则：
  原生 tag 够用不引 reka-ui），shadcn-vue 标准 class 串
  （`min-h-[60px] rounded-md border border-input bg-background ...`）；
  `inheritAttrs:false` + `v-bind="$attrs"` 让 `data-fn` / `aria-*` 落到真实
  `<textarea>`；modelValue 类型严格 `string`（与 `<Input>` 的 `string|number|boolean`
  不同 — Textarea 语义上没有数字/布尔场景）

**3 个文件迁移**：

- `src/features/inspection-capability/InspectionCapabilityList.vue` — 5 处
  `<input type="checkbox" v-model="form.isOfficial|enabled|isOptionalForQualification" />`
  迁 `<Checkbox>`（specialties 资源：官方 / 启用；objects 资源：官方 / 启用 / 资质可选）
- `src/features/reports/ReportPhasePage.vue` — 2 处 `<input type="checkbox" :checked ... @change ...>`
  迁 `<Checkbox :model-value @update:model-value>`（全选 columnheader + 行选 cell）
- `src/features/report-names/ReportNameList.vue` — 1 处 `<textarea v-model="form.extFieldsText" class="border rounded ... font-mono" />`
  迁 `<Textarea v-model="form.extFieldsText" class="h-32 font-mono" />`
  （`h-32` / `font-mono` 是业务定制保留；其他 class 由原语基类接管）

**Phase 2b/c 原语回归锚 8 case**（不挂功能 ID，工程设施测试）：
`tests/foundation/shadcn-checkbox-textarea.dom.test.ts`

- `<Checkbox>` 渲染为 `<button type="button" role="checkbox">`，`aria-label` /
  `data-fn` 走 `$attrs` 落到真实 DOM；class prop 经 `cn()` 合并调用方胜出
- `<Checkbox>` `aria-checked` 反映初始 `modelValue`（false），点击切换为
  true，再点击回到 false
- `<Textarea>` 渲染为真实 `<textarea>`，`rows` / `placeholder` / `data-fn` 落到
  真实 DOM；class prop 经 `cn()` 合并
- `<Textarea>` setValue 双向写回（DOM value 与 v-model span 同步）
- `<Textarea :model-value :disabled>` `disabled` 落到真实 DOM

**踩坑 / 教训**：

- **`form` 是宽类型 Record 时 `<Checkbox>` 的 `v-model` 直接 TS2322**：
  `<Checkbox>` modelValue 严格 `boolean | "indeterminate"`，但
  `form: Record<string, string|number|boolean>` 宽类型在 v-model 推导时
  不能窄化为 boolean。试过把 Checkbox 也放宽到 `string|number|boolean|"indeterminate"`
  —— **不行**：reka-ui 的 `update:modelValue` 回调类型从泛型 T 默认 boolean
  走到模板里 `$event` 是 `string|number|boolean`（泛型被 v-bind 推导抹平），
  再 emit 给外层 `boolean | "indeterminate"` 报 TS2345。最后落到 **`readBool(key)`
  / `writeBool(key, v)` helper**：读侧 `=== true` 收敛，写侧 `=== true` 收敛，
  业务侧 `submitForm` 也是 `=== true` 收敛，三处口径一致。`<Checkbox>` 自身
  保持严格 boolean 类型（语义清晰）
- **`<Checkbox>` 在原生 `<input type=checkbox>` 之上的 a11y 升级**：
  reka-ui CheckboxRoot 默认 `as="button"` 渲染 `<button type="button" role="checkbox" aria-checked>`，
  比 raw `<input>` 多出键盘 handling（WAI ARIA checkbox 模式：Space 切换，
  Enter 不触发），所以测试 selector 必须从 `input[type=checkbox][aria-label=...]`
  改 `[role=checkbox][aria-label=...]`。这是 Phase 1.5 审计原则的合理例外：
  原生 HTML 不能给 button 一样的 checkbox 键盘语义，迁移即升级
- **`<Textarea>` fixture 用 `:rows="4"` 而不是 `rows="4"`**：HTML 属性
  template 编译时 `rows="4"` 给字符串 `"4"`，而 prop 类型是 number，触发
  Vue dev warn。`vue-tsc` 不报但 VTU 跑出来会有 8 条 stderr warning
  （grep "Invalid prop: type check failed for prop rows"）。`:rows="4"` 是
  JS 表达式，类型对得上

**验证**：

- vitest: 275 case / 28 文件全绿（Phase 2a-4 基线 267 + 新 Checkbox/Textarea
  回归锚 8）
- vue-tsc --noEmit 零错误
- gate -p lab-management-system-vue exit 0，L0/L0.no_fallback/L0.5/L1/L2/L3/L4/L5
  全 PASS
- 100 个功能条目，引用完整；L5 无断裂
- `grep -rn 'type="checkbox"' src/features/` 命中 0 处（5 原 checkbox 迁完 +
  ReportPhasePage 2 处经 form 走 Checkbox）
- `grep -rn '<textarea' src/features/` 命中 1 处 —— 仍是 ReportNameLinkDialog
  内的纯字符串展示模板（不是表单控件，**不在本 Phase 范围**）

## [0.3.46] — 2026-09-05

shadcn-vue 迁移 **Phase 2a-4**（数据录入页 + 8 张检测模型卡的 raw `<table>` →
`<Table>` 家族原语迁移）。本批收尾 **Phase 2a**：`src/features/**` 下已无
raw `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<th>` / `<td>`。

**9 个文件迁移**（共 9 张表，每文件 6 个新 import：`Table` / `TableHeader` /
`TableBody` / `TableRow` / `TableHead` / `TableCell`；视觉零变更 —
Tailwind class 全保留，卡片 `bg-white` / `border rounded p-3` 外壳不动）：

- `src/features/data-entry/DataEntryPage.vue` — M03.F03 待录入接样单表
  （6 列 × 1 fixture 行；行内 router-link + `data-fn="M03.F03.I03"` 按钮；
  空态行 `colspan="6"` 保留）
- `src/features/data-entry/models/ConcreteCompressCard.vue` — 3 列 × N 试件
- `src/features/data-entry/models/ConcretePermeabilityCard.vue` — 3 列 × 6 试件
- `src/features/data-entry/models/RebarWeldingTensileCard.vue` — 5 列 × 3 试件
- `src/features/data-entry/models/RebarWeldingBendCard.vue` — 3 列 × 3 试件
- `src/features/data-entry/models/RebarMechNumericCard.vue` — 2~4 列（`isStrength`
  / `isRatio` / `connectionMode` 条件列）× N 组
- `src/features/data-entry/models/SoilCompactionCard.vue` — 转置表（列头 = 序号 +
  5 组点位，2 体行 = 含水率 / 干密度），`v-for` 同时在 TableHead 与 TableCell 上
- `src/features/data-entry/models/SoilCompactionDegreeCard.vue` — 9~10 列
  （`showMaxDensityColumn` 条件列）× 6 行，评定列条件色
- `src/features/data-entry/models/ParticleGradationCard.vue` — 本批最大表
  （砂 10 列 / 碎石 15 列；每样品 3 子行 + 末尾平均行；`<template v-for>` 包
  3 个 `<TableRow>`；序号 cell 带 `rowspan="3"`）

**Phase 2a-4 Table 回归锚新增 9 case**（不挂功能 ID，工程设施测试）：

- `tests/features/data-entry/cardsAll.dom.test.ts` — 8 case，每张卡钉
  `div[role="table"]` 语义、列头文本顺序、rowgroup[1] 体行数与每行 cell 数、
  行内 `<Input>` / raw `<select>` 嵌在 cell 内而非被吞
- `tests/features/data-entry/dataEntryPage.dom.test.ts` — 1 case，钉 6 列头顺序，
  以及行内 router-link `<a>` 与 `data-fn` 按钮嵌在 cell 内

**踩坑 / 教训**：

- `SoilCompactionDegreeCard` 评定列原本是 `:class="[cellCls, 条件色]"` 数组绑定。
  `TableCell` 的 `class` prop 类型是 `string` 不是 `string[]`，数组会被
  Vue 当 `$attrs.class` 直接 stringify — 改成脚本侧 `verdictCls(verdict)` 拼成
  单个字符串（与 Phase 1.4 的 `<Input>` `:class` 数组陷阱同源）
- `TableCell` 是 `inheritAttrs:false` + `v-bind="$attrs"`，调用方 `class` 走
  `$attrs` 通道，与 `:class="cn(...)"` 的基类是**拼接**不是 twMerge 二选一 —
  基类 `p-2` 仍留在 class 串里，靠 Tailwind 样式表里 `py-*` 排在 `p-*` 之后取胜。
  回归锚断言的是 `indexOf("py-1") > indexOf("p-2")`，不是 `not.toContain("p-2")`
- `CementCompressCard` **本来就没有 `<table>`**（它是 `grid grid-cols-6` 布局），
  Phase 2a-4 原定 10 文件实际只有 9 张表；该卡零改动
- `ParticleGradationCard` 序号 cell 的 `rowspan="3"` 在 div-based Table 上是
  惰性属性（div 不支持跨行合并）。保留它是为了和 `ContractsList` 等已迁文件
  保留 `colspan` 的处理一致；跨行视觉留 Phase 2f 主题收敛时按 grid 一并处理
- `SoilCompactionDegreeCard` 默认 config 下是 **9 列**不是 10 列
  （`showMaxDensityColumn` 未开 → 无「最大干密度」列），写回归锚别照抄模板列数

**验证**：

- vitest: 267 case / 27 文件全绿（Phase 2a-3 基线 258 + 新 Table 回归锚 9）
- gate -p lab-management-system-vue exit 0，L0/L0.no_fallback/L0.5/L1/L2/L3/L4/L5
  全 PASS
- 100 个功能条目，引用完整；L5 无断裂
- `grep -rn "<table" src/features/` 零命中（Phase 2a 收尾自检）

## [0.3.45] — 2026-09-05

shadcn-vue 迁移 **Phase 2a-3**（5 个 list pages / modals / dialogs 表格 raw
`<table>` → `<Table>` 家族原语迁移，含 2 张内嵌表 + 1 张 Teleport 弹窗内关联表）。

**5 个文件迁移**（共 7 张表，每页 7 个 import：`Table` / `TableHeader` /
`TableBody` / `TableRow` / `TableHead` / `TableCell` + 既有的 `Button` /
`Input` / `Label`；视觉零变更 — Tailwind class 全保留）：

- `src/features/report-names/ReportNameList.vue` — M06.F07 报告名称维护（1 张表
  6 列 × 2 fixture 行；行级 `data-fn="M06.F07.I01"` 落真实 `div[role="row"]`）
- `src/features/reports/ReportPhasePage.vue` — M03.F05/F06/F07/F08 4 阶段报告页
  共用 1 张表（6 列含全选 checkbox columnheader + 委托书编号 router-link +
  检测结果 / 流程状态 / 操作；行级 `data-fn` 由 `i01DataFn` prop 注入）
- `src/features/receipts/ReceiptsList.vue` — M03.F01 接样管理（1 张表 7 列 ×
  2 fixture 行；行级 `data-fn="M03.F01.I01"`；Phase 1.4 跳过的 14 处 label
  包 select/input 留 Phase 2d 不动）
- `src/features/data-entry/ReportPreviewModal.vue` — M03.F09.I03 报告预览弹窗
  内 2 张只读表：基础信息 4 列 × 2 行（无 header 标签+值结构）+ 检测参数结果
  4 列（项目/技术要求/检测结果/单项评定，空 records）
- `src/features/inspection-capability/ParameterStandardLinkDialog.vue` —
  M06.F03.I02 参数↔标准关联弹窗（Teleport 内 1 张关联表 5 列；行内 raw
  button `data-fn="M06.F03.I02"` 嵌套在 TableCell 内而非被吞）

**Phase 2a-3 Table 回归锚新增**（不挂功能 ID，工程设施测试；5 文件钉 4 件事 —
`<Table>` 渲染 `div[role="table"]` / `<TableHead>` 文本顺序 / 行 `data-fn` 落
rowgroup[1] 内 `div[role="row"]` / TableCell class 经 `cn()` 合并）：

- `tests/features/report-names/reportNameList.dom.test.ts` — 4 case：
  6 columnheader 文本顺序（编码/简称/全称/模板/排序/操作）+ 2 fixture 行
  `data-fn="M06.F07.I01"` 落 `div[role="row"]` + 编码 cell `font-mono text-xs`
  - 行内「关联」按钮嵌套在 cell 内
- `tests/features/reports/reportPhasePage.dom.test.ts` — 4 case：
  6 columnheader 文本顺序（含 checkbox 列头）+ 1 fixture 行 `data-fn=i01DataFn`
  - 委托书编号 cell `font-mono text-xs` + checkbox / 「退回」按钮嵌套在 cell 内
- `tests/features/receipts/receiptsList.dom.test.ts` — 4 case：
  7 columnheader 文本顺序（委托书编号/工程名称/委托单位/检测类别/流程状态/
  创建时间/操作）+ 2 fixture 行 `data-fn="M03.F01.I01"` + 委托书编号 cell
  `font-mono text-xs` + 「提交/编辑/删除」按钮嵌套在 cell 内且流程状态徽章
  span 仍在 cell 内
- `tests/features/data-entry/extFieldsPreviewModalsButtons.dom.test.ts` — 4 case：
  2 张 `div[role="table"]` 同时渲染（基础信息表 + 检测参数结果表）+ 第 2 张
  4 columnheader 文本顺序（项目/技术要求/检测结果/单项评定）+ 第 1 张 2 行 4 cell
  无 header 结构 + 第 2 张 TableHead `border + px-2 + py-1 + text-left` 保留
- `tests/features/inspection-capability/parameterStandardLink.dom.test.ts` —
  4 case：5 columnheader 文本顺序（标准编码/名称/版本/状态/操作）+ 2 fixture 行
  无 `data-fn`（data-fn 挂在行内 button）+ 行内 button 嵌套在 cell 内 + 标准编码
  cell `font-mono text-xs`

**踩坑 / 教训**：

- `parameterStandardLink.dom.test.ts` 原始只 `import { describe, expect, ... }`
  无 `it`；加 `Phase 2a-3` `describe` 块里用 `it(...)` 报 `ReferenceError: it is
  not defined`。补 `it` 进 vitest 导入一行修好，**不要靠 defineGlobals** — 显式
  import 走 vitest ESM 是稳态
- `ReportPhasePage` 行内 `<input type="checkbox">` + `<Button>` 嵌套在
  `<TableCell>` 里不能被吞掉 — 这两个元素本身不是 TableCell 后代的标准用例
  （shadcn-vue TableCell 的 `cn('p-2 align-middle')` 不会改 DOM 结构），回归锚
  显式断言 `parentElement.getAttribute('role') === 'cell'` 是物理证明
- `ReportPreviewModal` 第 1 张表是 4 列 × 2 行的「标签 + 值 + 标签 + 值」结构，
  没有 header — 回归锚要先扫 `[role="table"]` 数组下标 0 找 rowgroup，**不要
  假设每张表都有 TableHeader**

**验证**：

- vitest: 258 case / 27 文件全绿（Phase 2a-2 基线 238 + 新 Table 回归锚 20）
- gate -p lab-management-system-vue exit 0，L0/L0.no_fallback/L0.5/L1/L2/L3/L4/L5
  全 PASS
- 100 个功能条目，引用完整；L5 无断裂

## [0.3.44] — 2026-09-05

shadcn-vue 迁移 **Phase 2a-2**（6 个 list pages 表格 raw `<table>` →
`<Table>` 家族原语迁移，对应测试 selector 同步）。

**6 个 list 页迁移**（每页 7 个 import：`Table` / `TableHeader` / `TableBody` /
`TableRow` / `TableHead` / `TableCell` + 既有的 `Button` / `Input` / `Label`；
视觉零变更 — Tailwind class 全保留）：

- `src/features/contracts/ContractsList.vue` — M02.F01 合同管理（7 列 × 3 fixture
  行，行级 `data-fn="M02.F01.I01"` 经 `$attrs` 落到真实 `div[role="row"]`）
- `src/features/inspection-capability/InspectionCapabilityList.vue` —
  M06.F01/F02/F03/F04 多资源（4 资源 × 5 列 + 操作列 = 6 列；行级不挂 data-fn，
  data-fn 在 3 个行内按钮上）
- `src/features/inspection-capability/CalculationMethodList.vue` —
  M06.F05 计算方法（7 列含复合主键 + 算法类型徽章；调用方 class `font-mono
  text-xs` 走 TableCell class prop 经 `cn()` 合并）
- `src/features/inspection-capability/TechnicalRequirementList.vue` —
  M06.F06 技术要求（11 列含 4 维筛选字段 + 判定方式徽章 + 上限/下限；
  11 `<TableHead>` 文本顺序锁）
- `src/features/param-interfaces/ParamInterfaceList.vue` —
  M06.F08 参数界面维护（4 列 × 3 fixture 行，行级 `data-fn="M06.F08.I01"`）
- `src/features/task-assignment/TaskAssignmentList.vue` —
  M03.F02 任务分配（6 列 × 1 fixture 行，行内安排按钮
  `data-fn="M03.F02.I02"` 落到真实 `<button>` 而非 div）

**测试 selector 同步**（Phase 1.5 audit 第 5 类「按 tag 名查」本批正式迁移）：

- `tests/features/inspection-capability/inspectionCapabilityPages.dom.test.ts`
  3 处 `findAll("tbody tr")` → `[role="rowgroup"]` 第 2 个（TableBody）内
  `findAll('[role="row"]')`：
  - F01 检测专项维护渲染测试（specialties fixture 2 行）
  - F05 计算方法维护渲染测试（1 行 + OBJ-1/P-1 文本穿透）
  - F06 技术要求列表行 + 新建/编辑/删除按钮（1 行）

**Phase 2a-2 Table 回归锚新增**（不挂功能 ID，工程设施测试；为 6 个
list 页钉 3 件事 — `<Table>` 渲染 `div[role="table"]` /
`<TableHead>` 文本顺序 / TableCell class 经 `cn()` 合并）：

- `tests/features/contracts/contractsList.dom.test.ts` — 3 case：
  7 columnheader 文本顺序（合同编号/项目名称/委托单位/见证人/状态/委托日期/
  操作）+ 3 fixture 行 `data-fn` 落到 `div[role="row"]` + 合同编号 cell
  `font-mono` + `text-xs`
- `tests/features/inspection-capability/inspectionCapabilityPages.dom.test.ts`
  — 5 case：InspectionCapabilityList specialties 6 `<TableHead>` 文本 +
  parameters 行内关联标准按钮 `aria-label` + CalculationMethodList 7
  `<TableHead>` 文本 + 判定标准 cell `font-mono text-xs` + TechnicalRequirementList
  11 `<TableHead>` 文本 + 判定标准 cell `font-mono text-xs`
- `tests/features/param-interfaces/paramInterfaceList.dom.test.ts` — 3 case：
  4 columnheader 文本顺序（编码/组件路径/排序/操作）+ 3 fixture 行
  `data-fn="M06.F08.I01"` + 编码 cell `font-mono text-xs`
- `tests/features/task-assignment/taskAssignmentList.dom.test.ts` — 3 case：
  6 columnheader 文本顺序（委托书编号/工程名称/检测人员/计划日期/流程状态/
  操作）+ 1 fixture 行内安排按钮 `data-fn="M03.F02.I02"` 落到真实
  `<button>` + 委托书编号 cell `font-mono text-xs`

**踩坑 / 教训**：

- `<TableCell colspan="N">` 渲染到 `<div>` 是空 HTML attribute（div 不支持
  colspan），但视觉无影响（CSS `text-center` + `px-4 py-8` 居中布局生效）；
  本批 4 个含空态行的列表（ContractsList / ParamInterfaceList /
  TaskAssignmentList / ReceiptsList 留 2a-3）都安全，无回归
- CalculationMethodList 的「检测项目」cell class 不直接是 `font-mono text-xs`
  （那是 `<div>` 子元素 class），改测判定标准 cell（class 直接在 TableCell
  上）以保持回归锚的语义

**验证**：

- vitest: 238 case / 27 文件全绿（Phase 2a-1 基线 223 + 新 Table 回归锚 15）
- gate -p lab-management-system-vue exit 0，L0/L0.no_fallback/L0.5/L1/L2/L3/L4/L5
  全 PASS
- 100 个功能条目，引用完整；L5 无断裂

## [0.3.43] — 2026-09-05

shadcn-vue 迁移 **Phase 2a-1**（Table 家族原语引入 + 2 个 pilot 迁移）。

**新增 6 个 Table 原语**（`src/components/ui/Table*.vue`）：

- `Table.vue` — `div[role="table"]` 容器，class prop 走 `cn()` 合并
- `TableHeader.vue` — `div[role="rowgroup"]`，语义等价 `<thead>`
- `TableBody.vue` — `div[role="rowgroup"]`，`&:last-child:border-0` 让末行无下边框
- `TableRow.vue` — `div[role="row"]`，**继承 Phase 0 契约**：`inheritAttrs:false` +
  `v-bind="$attrs"` 把 `data-fn` 落到真实 DOM
- `TableHead.vue` — `div[role="columnheader"]`，语义等价 `<th>`
- `TableCell.vue` — `div[role="cell"]`，语义等价 `<td>`

**与 Button/Input/Label 原语差异**：

- Table 家族是**div-based**（shadcn-vue 约定）：用 `role="table"` /
  `role="rowgroup"` / `role="row"` / `role="columnheader"` / `role="cell"`
  维持 ARIA 语义，浏览器无 table-layout 强制，便于 flex/grid 灵活布局 + 滚动条定制
- 容器原语（Table/Header/Body）**不**挂 `inheritAttrs:false`，因为锚点
  （`data-fn`）通常挂在行/单元格上；Row/Head/Cell 三个 leaf 挂 `inheritAttrs:false`

**新增 1 个底座冒烟测试**（`tests/foundation/shadcn-table.dom.test.ts`，8 case）：

- 钉 6 个原语的 role 属性 + 基础 class
- 钉 `$attrs` 转发：`data-fn="M99.F99.I99"` 在 `<TableRow>` 上落到真实 `<div>`
- 钉 `class` prop 合并：调用方 `bg-amber-100` 走 `cn()` 合并到默认类后

**Pilot 迁移 2 个文件**（表格 raw `<table>`/`<thead>`/`<tbody>`/`<tr>`/`<th>`/`<td>`
→ `<Table>`/`<TableHeader>`/`<TableBody>`/`<TableRow>`/`<TableHead>`/`<TableCell>`）：

- `src/features/summary/SummaryList.vue` — 1 个汇总表（含 6 列、flowStatus/result 状态徽章）
- `src/features/data-entry/models/StrengthCardBase.vue` — 1 个强度卡基类的破坏荷载表
  （3 列 × 3/6 试件行）
- 视觉零变更：Tailwind class 全保留（`bg-slate-50` / `hover:bg-slate-50` / `border-t`
  / `px-4 py-2` / `text-left` 等），调用方 class 通过 `cn()` 末段合并

**测试 selector 同步迁移**（Phase 1.5 audit 第 5 类「按 tag 名查」开始破例）：

- `tests/features/summary/summaryList.dom.test.ts:77` `findAll("thead th")` →
  `findAll('[role="columnheader"]')`
- `tests/features/summary/summaryList.dom.test.ts:89` `findAll("tbody tr")` →
  第二个 rowgroup（TableBody）的 `findAll('[role="row"]')`（避开 TableHeader 那行）
- 其他表测试（`inspectionCapabilityPages.dom.test.ts` 3 处 `findAll("tbody tr")`）
  **不在本阶段范围**，对应源文件（`InspectionCapabilityList`）留 Phase 2a-2/3 迁

**踩坑 + 修复**：

- `StrengthCardBase.vue:182` 原本 `<td :class="['py-1', conditional]">` 用 array binding，
  TableCell class prop 是 `string`（与 Input/Button 一致），L3 类型 2345 报
  `string[] not assignable to string`。**修法**：改模板字符串 ``:class="`py-1 ${cond ? '...' : '...'}`"``，
  与 Phase 1.4「卡片 Label class 数组→字符串」同源教训——详见 MEMORY「不要在
  <Input>/TableCell 等单值 class prop 上用 :class="[]" 数组」。

**Phase 2a 计划**：

- 2a-2/2a-3 继续迁剩余 14 个列表页（InspectionCapabilityList / CalculationMethodList /
  TechnicalRequirementList / ParamInterfaceList / TaskAssignmentList / ContractsList /
  ReportPhasePage / ReportNameList / ReceiptsList / ReportPreviewModal / ParameterStandardLinkDialog
  / SoilCompactionDegreeCard / SoilCompactionCard / RebarWeldingTensileCard /
  RebarWeldingBendCard / RebarMechNumericCard / ParticleGradationCard /
  ConcretePermeabilityCard / ConcreteCompressCard / DataEntryPage），对应测试
  selector 同步迁移

**验证**：

- vitest: 223 case / 27 文件全绿（Phase 0/1 基线 215 + 新 Table 底座 8）
- gate -p lab-management-system-vue exit 0，L0/L0.no_fallback/L0.5/L1/L2/L3/L4/L5 全 PASS
- 100 个功能条目，引用完整；L5 无断裂

## [0.3.42] — 2026-09-05

shadcn-vue 迁移 **Phase 1.5**（test selector 审计）。原计划担心 Phase 0 / 1.0–1.4
的 `<Button>` / `<Input>` / `<Label>` 原语替换会破坏 `findAll("button")` /
`find('input[type=…]')` / `find('label[for=…]')` 这类基于 native HTML 标签名的
DOM selector，所以留 Phase 1.5 做专项审计。

**结论：所有 26 个 `*.dom.test.ts` / 215 个 case 仍然全绿。无 selector 需要迁移。**

shadcn-vue 三个原语都直接渲染 native HTML element（`v-bind="$attrs"` 落到真实
`<button>` / `<input>` / `<label>`），所以「按 tag 名查」和「按 `type` /
`aria-label` / `placeholder` / `data-fn` 属性查」都保持有效。

Selector 类型分布与风险评估（详见
[`docs/conventions/phase-1-5-selector-audit.md`](docs/conventions/phase-1-5-selector-audit.md)）：

- `findAll("button")` + 按 text 过滤：28 处，全安全（slot 落在 native button 内）
- `find('button[data-fn=…]')`：19 处，全安全（$attrs 透传）
- `find('input[aria-label=…]')` / `input[placeholder=…]`：35 处，全安全
- `find('input[type=…]')`：8 处，全安全（`type` prop 显式 bind）
- `findAll("label")` / `find('label[for=…]')` / `find("#…")`：10 处，全安全
- `findAll("h2")` 弹窗标题：4 处，全安全（Dialog 标题在 source 仍是 raw `<h2>`）
- `findAll("aside button")` 结构化选择：3 处，全安全（aside 是布局容器）

**已知脆弱 selector（不修，留 Phase 2f 处理）**：

- `tests/features/data-entry/cardsAll.dom.test.ts:188` 用 `find(".text-green-600")`
  断言 `RebarWeldingBendCard` 整体评定文字 = "合格"。判定 class 写在
  `RebarWeldingBendCard.vue:70-76`，Phase 1.2 没动这个字面量，**所以当前仍绿**。
  - 不修原因：Phase 1.5 范围只覆盖「shadcn 迁移造成的破损」，「class 字面量 →
    semantic token」属于 Phase 2f 主题收敛
  - 同源的 `RebarMechNumericCard` / `RebarWeldingTensileCard` /
    `StrengthCardBase` / `ParticleGradationCard` / `SoilCompactionDegreeCard` /
    `CementCompressCard` 也都用 `text-green-600` / `text-red-600` 写判定字样，
    但**只有 BendCard 被测试断言**，其他 6 个「未测的脆弱 class」同样不属本阶段

**给 Phase 2 的提醒**（写在 audit §6）：

- 2b Checkbox / 2c Textarea / 2d Select 落地时，要么保 native 标签，要么把测试
  selector 同步迁到 `role="checkbox"` / `role="combobox"` 等
- 2d Select 落到 `ReceiptsList` 「label 包 select」结构时，现有 `find("select")`
  要同步改

**新增文件**：

- `docs/conventions/phase-1-5-selector-audit.md` — 审计报告（含 26 个测试文件
  selector 分类矩阵、Phase 0 $attrs 契约回放、脆弱 selector 处置、Phase 2 提示）

## [0.3.41] — 2026-09-05

shadcn-vue 迁移 **Phase 1.4**（15 个文件 raw `<label>` → `<Label>` 原语，共迁移 79 处；
`ReceiptsList` 的 14 处「label 包 select/input」按计划排除，留 Phase 2d 与 Select 原语一起改）。

- **ContractsList**（contracts）：17 处。表单全字段 label，原 `class="text-sm font-medium"`
  与 Label 基类重复 → 直接去掉，由原语提供
- **InspectionCapabilityList**（inspection-capability）：17 处。12 处 `text-sm font-medium`
  表单 label + 5 处 checkbox 旁的裸 `<label>`（官方 / 启用 / 资质可选），
  裸 label 迁移后统一拿到 Label 基类；`<input type=checkbox>` 仍 raw（Phase 2b）
- **TechnicalRequirementList**（inspection-capability）：11 处表单 label
- **CalculationMethodList**（inspection-capability）：7 处表单 label
- **ReportNameList**（report-names）：7 处表单 label（含 extFields `<textarea>` 的 label）
- **ParamInterfaceList**（param-interfaces）：3 处表单 label
- **CategoryDictList**（dicts）：3 处弹窗 label，`mb-1 block text-xs text-gray-600` 保留，
  冗余 `font-medium` 去掉（基类已有）
- **DataEntryPage**（data-entry）：2 处 **wrapping** label（`<Label>` 包 raw `<select>`），
  select 留 Phase 2d
- **TaskAssignmentList**（task-assignment）：2 处 **wrapping** label（`<Label>` 包 `<Input>`）
- **ReportPhasePage**（reports）：1 处 **wrapping** label（退回原因）
- **DefaultParamCard**（data-entry）：4 处，迁移时补 `text-xs`（基类 `text-sm` 会放大卡片字号）
- **StrengthCardBase**（data-entry）：2 处（技术要求 / 单项评定），补 `text-xs`
- **CementCompressCard**（data-entry）：1 处（v-for × 6 试件）
- **SoilCompactionDegreeCard**（data-entry）：1 处 **wrapping** label（包最大干密度 `<Input>`）
- **SummaryList**（summary）：1 处 **显式 for/id 配对** label，`for="categoryCode"` 经
  Label `props.for` 转发，仍指向 raw `<select id="categoryCode">`

迁移规则：

- 冗余基类（`text-sm` / `font-medium`）去掉，由 Label 原语提供
- 卡片小字号（原本靠父级 `text-xs` 继承）迁移后必须显式写 `text-xs`，
  否则基类 `text-sm` 会放大字号 —— tailwind-merge 保证调用方 `text-xs` 压过基类
- **wrapping 模式保留**：`<Label>` 包 `<Input>` / `<select>` 的隐式关联不改结构
- 不引入 variant —— Label.vue 是手写原语，不是 CVA

新增 15 个 Label 原语回归锚（不挂功能 ID，regression-anchor 模式）：

- contracts：17 label + 基类 4 token + 末尾「状态」label 与 raw select 同级
- inspection-capability：IC（编码 label + checkbox 裸 label 拿到基类）/ TechReq 11 / CalcMethod 7
- report-names 7 / param-interfaces 3（文本序列全等断言）
- dicts：`text-xs` 压过 `text-sm` + `mb-1 block` 保留
- task-assignment / reports / data-entry：wrapping 断言（`<input>` / `<select>` 是 `<label>` 后代）
- cardsAll：SoilCompactionDegreeCard wrapping + StrengthCardBase + CementCompressCard 6 试件
  - DefaultParamCard 4 label 文本序列
- summary：`label[for=categoryCode]` 与 `#categoryCode` 配对不断

红→绿分界：迁移前 raw `<label class="text-sm font-medium">` 没有 `peer-disabled:` 前缀，
所有锚点都断言 `peer-disabled:opacity-70` 在真实 `<label>` 的 class 上。

**不回归**：

- 全量 215 case（26 文件）全绿（v0.3.40 = 200 case，本次 +15）
- `for` / `id` / `data-fn` / 调用方 class 全经 `$attrs` + `cn()` 落到真实 `<label>`
- 仍是 raw 的：`ReceiptsList` 14 处 label（Phase 2d）、所有 `<select>`（2d）、
  `<input type=checkbox>`（2b）、`<textarea>`（2c）

## [0.3.40] — 2026-09-05

shadcn-vue 迁移 **Phase 1.3c**（12 个 data-entry card / page 文件 raw `<input>` → `<Input>`
原语，共迁移 23 处；保留所有 `<input type=checkbox>` / `<textarea>` / `<select>` / `<label>`
父级）。

- **DataEntryPage**（data-entry）：1 处 `<input>`。
  搜索框（`@keyup.enter="load"`，`max-w-sm` + `bg-white` 保留）
- **SoilCompactionDegreeCard**（data-entry）：7 处 `<input>`（含 v-for × 6 行）。
  1 处最大干密度（`type=number step=0.001` + `aria-label` + `disabled` 转发）
  - 6 行 × 6 字段（试样编号 / 取样部位 / 层次 / 设计压实度 `type=number step=0.1` /
  湿密度 `type=number step=0.001` / 含水率 `type=number step=0.1`），
  `@change` 转发 + `read-only:bg-gray-50 read-only:text-gray-500` 灰化样式保留
- **ParticleGradationCard**（data-entry）：3 处 `<input>`（v-for × 筛孔）。
  分筛前总量 `type=number step=1` + 分计筛余 `type=number step=0.1` +
  分筛后总量 `type=number step=1`，`@change` + `@blur` 双事件转发
- **SoilCompactionCard**（data-entry）：2 处 `<input>`（v-for × 5 组）。
  含水率 `type=number step=0.1` + 干密度 `type=number step=0.001`
- **RebarWeldingTensileCard**（data-entry）：2 处 `<input>`（v-for × 3 试件）。
  最大荷重 `type=number step=0.01 placeholder=kN` + 断口距 `type=number step=0.1 placeholder=mm`
- **RebarMechNumericCard**（data-entry）：2 处 `<input>`。
  公称直径 `type=number step=0.1 placeholder=直径 aria-label=公称直径` +
  v-for 数值 `type=number step=0.01 placeholder=数值`
- **StrengthCardBase**（data-entry）：1 处 `<input>`（v-for × 试件）。
  破坏荷载 `type=number step=0.01 aria-label=试件 N 破坏荷载`，
  `:readonly` + `read-only:bg-gray-50 read-only:text-gray-500` 灰化样式保留
- **RebarWeldingBendCard**（data-entry）：1 处 `<input>`（v-for × 3 试件）。
  弯曲角度 `type=number step=1 placeholder=90`
- **DefaultParamCard**（data-entry）：1 处 `<input>`。
  检测结果（`placeholder=录入检测结果`，`@update:model-value` 改判）
- **ConcretePermeabilityCard**（data-entry）：1 处 `<input>`（v-for × 6 试件）。
  渗水压力 `type=number step=0.1 placeholder=渗水压力 (MPa)`
- **ConcreteCompressCard**（data-entry）：1 处 `<input>`（v-for × 3 试件）。
  破坏荷载 `type=number placeholder=破坏荷载 (kN)`
- **CementCompressCard**（data-entry）：1 处 `<input>`（v-for × 6 试件）。
  破坏荷载 `type=number step=0.01 placeholder=kN`，
  `@update:model-value` 模式（同步 input 事件即时改判，非 change-on-blur）

新增 11 个 Input 原语回归锚（不挂功能 ID，regression-anchor 模式）：

- `tests/features/data-entry/dataEntryPage.dom.test.ts`：搜索 v-model + max-w-sm + bg-white 保留
- `tests/features/data-entry/cardsAll.dom.test.ts`：10 个 card 覆盖
  - ConcreteCompressCard：type=number + placeholder + @change 触发 updateLoad
  - ConcretePermeabilityCard：step + aria-label 落 DOM
  - RebarWeldingTensileCard：双 type=number + 双 step 落 DOM
  - RebarWeldingBendCard：@change 触发 updateAngle
  - RebarMechNumericCard：tensile_strength 直径 + 2 组共 3 个 type=number
  - ParticleGradationCard：分筛前 / 分计 / 分筛后 3 类 type=number
  - SoilCompactionCard：含水率 + 干密度 step 0.1 / 0.001 落 DOM
  - SoilCompactionDegreeCard：最大干密度 step=0.001 + 6 行试样编号 + 含水率 step=0.1 + 湿密度 step=0.001
  - StrengthCardBase：readonly + read-only 灰化样式经 tailwind-merge 合成
  - RebarWeldingBendCard readOnly：readonly 落 DOM，@change 不触发 onChange

**不回归**：

- 全量 51 case（4 文件）data-entry 全绿（v0.3.39 = 40 case，本次 +11）
- v-model / `:model-value` + `@change` / `@update:model-value` / `@blur` / `@keyup.enter` /
  `type=number` / `step` / `placeholder` / `aria-label` / `:disabled` / `:readonly` /
  `read-only:bg-gray-50` 全经 `$attrs` 落到真实 `<input>`
- 调用方 class（`max-w-sm` / `bg-white` / `w-32` / `w-24` / `w-20` / `w-16` /
  `read-only:bg-gray-50 read-only:text-gray-500`）经 tailwind-merge 与 CVA base 合成

## [0.3.39] — 2026-09-05

shadcn-vue 迁移 **Phase 1.3b**（6 个 list-page 文件 raw `<input>` → `<Input>` 原语，
共迁移 24 处；保留所有 `<input type="checkbox">` / `<textarea>` / `<select>` / `<label>` 父级）。

- **ReportNameList**（report-names）：7 处 `<input>`。
  1 处搜索框（`@keydown.enter="load"`，`max-w-sm` 保留）+ 6 处表单字段（编码 / 简称 /
  全称 / 模板路径 / 排序 `type=number v-model.number` / 描述）。`<textarea>` extFields 保留 raw
- **ReportPhasePage**（reports）：4 处 `<input>`。
  1 处搜索框（`@keyup.enter`，`max-w-sm` 保留）+ 1 处退回原因表单（`mt-1` 保留）。
  `<input type="checkbox">` 全选 / 行选保留 raw（Phase 2b 范围）
- **ParamInterfaceList**（param-interfaces）：4 处 `<input>`。
  1 处搜索框 + 3 处表单字段（编码 `:disabled` 在 edit 模式保留 / 组件路径 / 排序 `type=number`）
- **CalculationMethodList**（inspection-capability）：4 处 `<input>`。
  1 处搜索框 + 3 处表单字段（试件数量 `type=number` / 修约规则 placeholder 转发 / 备注）。
  `<select>` 4 个保留 raw（Phase 2d 范围）
- **TaskAssignmentList**（task-assignment）：3 处 `<input>`。
  1 处搜索框 + 2 处表单字段（检测人员 + 计划检测日期 `type=date`）。
  `<input type="date">` 经 `$attrs` 转发 type 到 DOM
- **CategoryDictList**（dicts）：2 处 `<input>`。
  2 处表单字段（名称 + 备注）。`<select>` 检测项目保留 raw（Phase 2d 范围）

新增 6 段 Input 原语回归锚（不挂功能 ID，regression-anchor 模式）：

- `tests/features/report-names/reportNameList.dom.test.ts`：搜索 v-model + 弹窗 6 个 input + type=number
- `tests/features/reports/reportPhasePage.dom.test.ts`：搜索 v-model + 退回弹窗 v-model
- `tests/features/param-interfaces/paramInterfaceList.dom.test.ts`：搜索 v-model + 弹窗 3 个 input + :disabled / type=number
- `tests/features/inspection-capability/inspectionCapabilityPages.dom.test.ts`：搜索 v-model + 弹窗 3 个 input + type=number + placeholder
- `tests/features/task-assignment/taskAssignmentList.dom.test.ts`：搜索 v-model + 弹窗 2 个 input + type=date
- `tests/features/dicts/categoryDictPages.dom.test.ts`：弹窗 2 个 input v-model

**不回归**：

- 189 case（26 文件）全绿（v0.3.38 = 178 case，本次 +11）
- v-model / @keydown.enter / @keyup.enter / type=number / type=date 全经 `$attrs` 落到真实 `<input>`
- 调用方 class（`max-w-sm` / `mt-1` / `disabled:bg-slate-100`）经 tailwind-merge 与 CVA base 合成

## [0.3.38] — 2026-09-05

shadcn-vue 迁移 **Phase 1.3a**（4 个 form-heavy 文件 raw `<input>` → `<Input>` 原语，
共迁移 55 处；保留所有 `<input type="checkbox">` / `<textarea>` / `<select>`）。

- **ContractsList**（contracts）：17 处 `<input>`。
  1 处搜索框（`@keydown.enter="load"` 转发）+ 16 处表单字段（合同编号 / 委托单位 /
  项目名称 / 项目地点 / 施工单位 / 检测专项 / 建设单位 / 监理单位 / 检测人 /
  检测人电话 / 见证单位 / 见证人 / 见证人电话 / 联系人 / 联系人电话 / 委托日期）。
  调用方 class 全部移除（CVA base 已含 `border bg-background h-9 rounded px-3`）
- **InspectionCapabilityList**（inspection-capability）：10 处 `<input>`。
  1 处搜索框（`max-w-sm` 保留）+ 8 处表单字段（编码 / 名称 / 官方序号 / 来源行号 /
  来源行名称 / 单位 / 版本 / 来源文件）+ 1 处排序（`type=number v-model.number`）。
  **保留 6 处 `<input type="checkbox">`**（官方/启用/资质可选 — Phase 2b Checkbox 原语范围）
- **TechnicalRequirementList**（inspection-capability）：12 处 `<input>`。
  4 个筛选框（牌号/型号/等级/规格，`aria-label` + `max-w-32` 保留）+ 8 处表单字段
  （判定标准 `font-mono` 保留 / 牌号 / 型号 / 等级 / 规格 / 下限 `type=number` /
  上限 `type=number` / 备注）
- **ReceiptsList**（receipts）：11 处 `<input>`。
  1 处搜索框（`@keyup.enter="load"` 转发，`max-w-sm` 保留）+ 10 处表单字段
  （委托书编号 / 委托日期 `type=date` / 工程名称 / 委托单位 / 报告类别编码，
  各 1 份 × 新建 + 编辑两个 dialog）。`<label>` 父级保留 raw（Phase 1.4 单独处理）

新增 4 段 Input 原语回归锚（不挂功能 ID，regression-anchor 模式）：

- `tests/features/contracts/contractsList.dom.test.ts`：搜索框 v-model + 弹窗内合同编号 v-model
- `tests/features/inspection-capability/inspectionCapabilityPages.dom.test.ts`：
  搜索框 / 编辑模式 disabled 落到真实 input / type=number 转发 / 4 维筛选
  aria-label 保留 / 下限上限 type=number / 判定标准 font-mono 合并
- `tests/features/receipts/receiptsList.dom.test.ts`：搜索框 v-model + 弹窗内 5 个 input + type=date 转发

**不回归**：

- 47 case（5 文件）全绿；Phase 0 hotfix `:disabled ?? undefined` 让 Label 的
  `peer-disabled:` 选择器在 edit 模式仍激活（specialties 编码测试锁）
- v-model / @keydown.enter / @keyup.enter / type=number / type=date / id / data-fn
  / aria-label 全经 `$attrs` 落到真实 `<input>`
- 调用方 class（`max-w-sm` / `max-w-32` / `font-mono` / `w-full mt-1`）经
  tailwind-merge 与 CVA base 合成，无 tailwind 类覆盖冲突

**hotfix 摘要**：Input.vue `modelValue` 类型放宽 `string → string | number |
boolean`（commit c43ce0a），emit 仍写 string；`v-model.number` 路径上的
number 化由 Vue modifier 负责，TS2322 在 reactive
`Record<string, string | number | boolean>` form 上不再炸。

## [0.3.37] — 2026-09-05

shadcn-vue 迁移 **Phase 1.2c**（4 个 modal/dialog raw `<button>` → `<Button>` 原语，
共迁移 4 处；未迁移 6 处保留 raw）。

- **SampleExtFieldsModal**（data-entry）：取消 `outline` / 确认 `default bg-blue-600`。
  关闭 × icon-style raw（>3 override 阈值，与 react 仓同型）
- **ReportPreviewModal**（data-entry）：关闭 `outline` / 打印 `default bg-blue-600`。
  关闭 × icon-style raw（同上）
- **ReportNameLinkDialog**（report-names）：2 处 toggle 行内按钮 raw。
  `px-2 py-1 rounded text-xs` + 双态动态 class（`border text-slate-700` /
  `bg-slate-900 text-white`），迁移需 4-5 override，超阈值
- **ParameterStandardLinkDialog**（inspection-capability）：1 处 toggle 行内按钮 raw，
  同上双态模式

新增 `tests/features/data-entry/extFieldsPreviewModalsButtons.dom.test.ts`（2 case）
覆盖 2 个迁移文件的 CVA base / outline border / default bg-blue-600 覆盖
bg-primary。不挂功能 ID（regression-anchor 模式）。

**未迁移（有意保留 raw `<button>`，6 处）**：

- 2 个 modal 的关闭 × 按钮（icon-glyph，`text-gray-400 hover:text-gray-600 text-xl
  leading-none`，迁移需 `h-auto w-auto p-0` 三件套 + 视觉保留，触发 >3 阈值）
- 4 个 toggle 行内按钮（标准/参数 关联|解除 / 参数↔标准 关联|解除关联）。
  是双态视觉按钮（一态 outline 风、一态 filled dark），强行用 `<Button variant=outline|default>`
  配合 `:class` 叠加态会同时与 CVA 的 `border` / `bg-primary` / `hover:bg-accent` 打架，
  至少需 4 个 override 平衡，留给后续 Toggle 原语专项（与 SidebarNav 同型）

**L5 不动**：4 处 toggle 按钮的 `data-fn="M06.F07.I02"` / `data-fn="M06.F03.I02"`
原 selector 仍走 `find('button[data-fn=…]')`，`reportNameLink.dom.test.ts` +
`parameterStandardLink.dom.test.ts` 全绿。

全量回归 167 case（26 文件）全绿；gate -p lab-management-system-vue exit 0。

## [0.3.36] — 2026-09-05

Phase 1.2b hotfix — regression-anchor `it()` 标题去 fn ID 字面。
`tests/fnReporter.ts:35-37` 的 `extractFns(t.name)` 正则会把 `it()` 标题里
嵌入的 `Mxx.Fxx.Ixx` 字面吸进 `.state/trace.json`，gate 又漂移到
`alignment.json` 当成 functional coverage。regression-anchor 只验
CVA class 合成（红 → 迁移 → 绿），不验用户行为，不能挂 fn ID。

- `tests/features/data-entry/dataEntryPage.dom.test.ts:142` 去 `M03.F03.I02`
- `tests/features/inspection-capability/inspectionCapabilityPages.dom.test.ts:270` 去 `M06.F06.I02`
- `tests/features/inspection-capability/inspectionCapabilityPages.dom.test.ts:297` 去 `M06.F05.I01`
- `tests/features/report-names/reportNameList.dom.test.ts:138` 去 `M06.F07.I02`

regen `trace.json` 后 4 个目标 fn ID 只被真实 `fnTest` 块引用；
`alignment.json` 回归锚声明清零。`receiptDetail.dom.test.ts:138` 注释里
的 `M03.F09.I03` 不动 —— fnReporter 只扫 `it()` 标题不扫 source text。

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
