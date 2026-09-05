// Phase 2a-1 foundation smoke — shadcn-vue Table 底座契约测试。
// 不挂功能 ID（工程设施测试）。
//
// 锁六件事，后续 Phase 2a-2/3 扩 Table 时不许回归：
//   1. <Table> 渲染为 div[role="table"]
//   2. <TableHeader> 渲染为 div[role="rowgroup"]
//   3. <TableBody> 渲染为 div[role="rowgroup"]
//   4. <TableRow> 渲染为 div[role="row"]
//   5. <TableHead> 渲染为 div[role="columnheader"]
//   6. <TableCell> 渲染为 div[role="cell"]
//   7. data-fn 在 <TableRow> 上经 $attrs 落到真实 <div>
//   8. class prop 经 cn() 合并，调用方 bg-warning/10 压过默认
import { describe, it, expect, afterEach } from "vitest";
import type { VueWrapper } from "@vue/test-utils";
import { mountWithProviders } from "../helper";
import TableFixture from "./__fixtures__/TableFixture.vue";

let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 2a-1 foundation — shadcn-vue Table 底座", () => {
  it("<Table> 渲染为 div[role=table]，基础 class 存在", () => {
    lastWrapper = mountWithProviders(TableFixture);

    const root = lastWrapper.find('[data-testid="table-root"]');
    expect(root.exists()).toBe(true);
    expect(root.element.tagName).toBe("DIV");
    expect(root.attributes("role")).toBe("table");
    expect(root.classes()).toContain("w-full");
    expect(root.classes()).toContain("caption-bottom");
    expect(root.classes()).toContain("text-sm");
  });

  it("<TableHeader> 渲染为 div[role=rowgroup]", () => {
    lastWrapper = mountWithProviders(TableFixture);

    const header = lastWrapper.find('[data-testid="table-header"]');
    expect(header.exists()).toBe(true);
    expect(header.element.tagName).toBe("DIV");
    expect(header.attributes("role")).toBe("rowgroup");
  });

  it("<TableBody> 渲染为 div[role=rowgroup]", () => {
    lastWrapper = mountWithProviders(TableFixture);

    // TableBody 没有 data-testid —— 它的 role=rowgroup 第二个就是它
    const rowgroups = lastWrapper.findAll('[role="rowgroup"]');
    expect(rowgroups.length).toBe(2);
    // 第二个是 TableBody（template 顺序：header 在前）
  });

  it("<TableRow> 渲染为 div[role=row]，data-fn 落到真实 DOM", () => {
    lastWrapper = mountWithProviders(TableFixture);

    const row1 = lastWrapper.find('[data-testid="row-1"]');
    expect(row1.exists()).toBe(true);
    expect(row1.element.tagName).toBe("DIV");
    expect(row1.attributes("role")).toBe("row");
    // $attrs 转发：data-fn 必须落到真实 <div>
    expect(row1.attributes("data-fn")).toBe("M99.F99.I99");
  });

  it("<TableHead> 渲染为 div[role=columnheader]", () => {
    lastWrapper = mountWithProviders(TableFixture);

    const thName = lastWrapper.find('[data-testid="th-name"]');
    expect(thName.exists()).toBe(true);
    expect(thName.element.tagName).toBe("DIV");
    expect(thName.attributes("role")).toBe("columnheader");
    expect(thName.classes()).toContain("h-10");
    expect(thName.classes()).toContain("font-medium");
    expect(thName.text()).toBe("名称");
  });

  it("<TableCell> 渲染为 div[role=cell]", () => {
    lastWrapper = mountWithProviders(TableFixture);

    const cell = lastWrapper.find('[data-testid="cell-1-name"]');
    expect(cell.exists()).toBe(true);
    expect(cell.element.tagName).toBe("DIV");
    expect(cell.attributes("role")).toBe("cell");
    expect(cell.classes()).toContain("p-2");
    expect(cell.classes()).toContain("align-middle");
    expect(cell.text()).toBe("行 1");
  });

  it("<TableRow> class prop 经 cn() 合并，调用方 bg-warning/10 压过默认", () => {
    lastWrapper = mountWithProviders(TableFixture);

    const row1 = lastWrapper.find('[data-testid="row-1"]');
    // CVA/base 默认类：border-b / transition-colors / hover:bg-muted/50
    expect(row1.classes()).toContain("border-b");
    expect(row1.classes()).toContain("transition-colors");
    // 调用方传的 class 合并进来
    expect(row1.classes()).toContain("bg-warning/10");
  });

  it("完整表格渲染：2 行 + 表头 2 列", () => {
    lastWrapper = mountWithProviders(TableFixture);

    const rows = lastWrapper.findAll('[role="row"]');
    // 1 表头行 + 2 数据行 = 3
    expect(rows.length).toBe(3);

    const heads = lastWrapper.findAll('[role="columnheader"]');
    expect(heads.length).toBe(2);

    const cells = lastWrapper.findAll('[role="cell"]');
    // 2 行 × 2 列 = 4
    expect(cells.length).toBe(4);
  });
});
