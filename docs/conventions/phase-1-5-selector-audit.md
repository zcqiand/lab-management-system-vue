# Phase 1.5 — Test Selector Audit

> 2026-09-05 · v0.3.42-20260905
>
> Phase 1.0–1.4 把 36 个文件的 raw `<button>` / `<input>` / `<label>` 迁到 shadcn-vue 原语。
> 原计划担心迁移会破坏 `findAll("button")` / `find('input[…]')` 这类基于原生 HTML
> 标签名的 DOM selector（`<Button>` 内部套 div、`<Input>` 漏掉 `type` 转发、`<Label>`
> 配对断链），所以留 Phase 1.5 做 selector 审计。
>
> **结论：所有 26 个测试文件 / 215 个 case 仍然全绿。无需迁移 selector。**
>
> 实际：shadcn-vue 三个原语都直接渲染 native HTML element（`v-bind="$attrs"` 落到
> 真实 `<button>` / `<input>` / `<label>`），所以「按 tag 名查」和「按 `type` /
> `aria-label` / `placeholder` / `data-fn` 属性查」都保持有效。

## 1. 跑出来的基线

```
Test Files  26 passed (26)
     Tests  215 passed (215)
  Duration  7.24s
```

全绿意味着：**Phase 0 的 $attrs 转发契约 + Phase 1.0–1.4 的原语替换，没有让任何已
有 selector 失效**。

## 2. Selector 类型分布（26 个 *.dom.test.ts）

按 grep 出来的所有 `find` / `findAll` 调用分类：

| Selector 模式                                                    | 数量 | 风险评估                                                       |
| ----------------------------------------------------------------- | ---: | -------------------------------------------------------------- |
| `findAll("button")` + `(b) => b.text() === ...` 按内容过滤       |  28  | 安全 — `<Button>` 渲染 native `<button>`，text 落在 slot 内   |
| `findAll("h2")` 取弹窗标题                                       |   4  | 安全 — 弹窗标题在 source 仍是 raw `<h2>`（Dialog 不动）       |
| `findAll("label")` 数 / 配 input                                  |   7  | 安全 — `<Label>` 渲染 native `<label>`，且配对由 source 控    |
| `find('button[data-fn="Mxx.Fxx.Ixx"]')`                           |  19  | 安全 — data-fn 由 `v-bind="$attrs"` 落到真实 DOM 节点        |
| `find('input[placeholder=…]')` / `find('input[aria-label=…]')`   |  35  | 安全 — Input 原语 `v-bind="$attrs"` 全量转发                 |
| `find('input[type="number"]')` / `find('input[type="checkbox"]')` |   8  | 安全 — `type` prop 经 `:type="type"` 绑到 native `<input>`    |
| `findAll("aside button")` 结构化选择                              |   3  | 安全 — aside 是布局容器，原语替换不动                        |
| `find('[data-fn="dialog-…"]')`                                    |   4  | 安全 — dialog 原语直接把 data-fn 写到自己渲染的根节点        |
| `find("[data-teleport-stub] input:not([type=checkbox])")`         |   5  | 安全 — 这是测试 helper 提供的 portal stub，跟原语无关        |
| `find("#categoryCode")` / `find('label[for="categoryCode"]')`     |   3  | 安全 — `id` / `for` 配对由 `id` prop / Label 的 `for` prop 控制 |
| `find(".text-green-600")` **（唯一 class-attribute probe）**      |   1  | **脆弱但当前未坏** — 见 §4                                    |

合计 ~117 个 selector 调用，全部在测试跑通。

## 3. 排除的担心

| 担心                                                         | 实际                                                           |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `<Button>` 内部包 div，`findAll("button")` 落空              | `Button.vue` 模板就是 `<button v-bind="$attrs"><slot /></button>` |
| `<Input>` 漏 `type` 转发，`input[type="number"]` 找不到     | `Input.vue` 模板 `:type="type"`，`v-bind="$attrs"` 在前       |
| `<Label>` 破坏 `for` / `id` 配对，`label[for="…"]` 找不到  | `Label.vue` 模板 `:for="props.for"`，`v-bind="$attrs"` 在前   |
| `data-fn` 被原语吞                                           | `defineOptions({ inheritAttrs: false })` + `v-bind="$attrs"` 保证 |
| 弹窗 title 变成 Dialog 内部 element 不是 `<h2>`             | 弹窗 title 在 source 仍是 raw `<h2>`，且 dialog 自身在 Teleport 内被 `data-teleport-stub` 替换保留 |
| 测试用 `shallowMount` 蒙混过原语替换                          | grep 全仓无 `shallowMount`，全量 `mount` / `mountWithProviders` |

## 4. 已知脆弱 selector（不修，留记录）

`tests/features/data-entry/cardsAll.dom.test.ts:188`：

```ts
expect(wrapper.find(".text-green-600")?.text()).toBe("合格");
```

- 测的是 `RebarWeldingBendCard` 整体评定的「合格 / 不合格」字样
- 颜色 class 来自 `RebarWeldingBendCard.vue:70-76`：
  ```ts
  const overallClass = computed(() =>
    overallComputed.value === "合格"
      ? "text-green-600"
      : overallComputed.value === "不合格"
        ? "text-red-600"
        : "text-gray-400",
  );
  ```
- **Phase 1.2 替换 `bg-red-600` → `bg-destructive` 只动了 `ReportPhasePage` 的删除按钮背景色**，
  **没动**「评定文字颜色」。所以 `.text-green-600` 现在仍然有效。
- 为什么标脆弱：判定 class 是样式细节，按 Tailwind 惯例 `text-green-600` 属于
  `tailwindcss-animate` 之外的硬编 literal，未来若改主题（green-500 / emerald-600 /
  text-success）这个 selector 会变 false negative。
- **不修原因**：CLAUDE.md §2 「最小改动 / 不改通过的东西」+ Phase 1.5 范围只覆盖
  shadcn-vue 迁移造成的破损，不覆盖「class 字面量 → semantic token」的样式主题化
  （那是 Phase 2f「Tailwind 主题收敛」的范围）。
- **如需后续收敛**：把 `text-green-600` / `text-red-600` / `text-gray-400` 换成
  semantic token（如 `text-success` / `text-destructive` / `text-muted-foreground`），
  并在仓内全 grep 把所有 `text-green-600` 用法都改完，再来改测试。**但本次不动。**

`RebarMechNumericCard` / `RebarWeldingTensileCard` / `StrengthCardBase` /
`ParticleGradationCard` / `SoilCompactionDegreeCard` / `CementCompressCard` 同样用
`text-green-600` / `text-red-600` 写判定字样，**但只有 BendCard 的文字被测试断言**。
其他 6 个组件的判定 class 同样属于「未测的脆弱 class」，不属 Phase 1.5 范围。

## 5. 门户 stub 的影响

`tests/helper.ts:39-55` 把 `<Teleport>` 和 reka-ui 的 `DialogPortal` 替换成
`<div data-teleport-stub><slot /></div>`。这是为了把 dialog / sheet 内容从
`document.body` 拉回 wrapper 子树，让 `wrapper.find('[data-testid="confirm-dialog"]')`
能拿到。

**不影响原语 selector**：stub 只把 portal 包一层 div，里面的 `<Button>` / `<Input>` /
`<Label>` 仍是真实组件渲染。`findAll("button")` 仍会递归遍历整棵子树。

12 处 per-test `MOUNT_GLOBAL` 显式 stub 同一个 `teleport`（`data-teleport-stub` 是
约定），同样不挡 selector。

## 6. 给 Phase 2 的提醒

- Phase 2b（Checkbox）落地时，新增 `<Checkbox>` 原语不要破坏 `input[type="checkbox"]`
  selector；要么渲染 native `<input type="checkbox">`，要么把 `ReportPhasePage` /
  `InspectionCapabilityList` / `ReceiptsList` 的测试 selector 改成
  `[role="checkbox"]` / `aria-checked` 同步迁移
- Phase 2c（Textarea）落地时，`<Textarea>` 也要保 `v-bind="$attrs"`，避免破坏
  `find("textarea")` 与 placeholder 选择器
- Phase 2d（Select）落地时：现有 `find("select")` 来自 `DataEntryPage` 弹窗和
  `ReceiptsList` 的「label 包 select」结构，Select 原语若改成 reka-ui 内部
  `<button role="combobox">`，要同步把测试 selector 改成 `find('[role="combobox"]')`，
  **这是 Phase 1.5 审计推断的潜在迁移点**，届时按需改

## 7. 结论

- 0 个 selector 实际坏掉
- 1 个 selector 已知脆弱但当前绿，**留 Phase 2f 处理**
- tag `v0.3.42-20260905` 仅为审计报告本身
- 全量 215 case 仍是绿，gate `python scripts/gate.py -p lab-management-system-vue`
  预期 exit 0
