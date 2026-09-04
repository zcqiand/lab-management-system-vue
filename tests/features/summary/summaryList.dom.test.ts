// Sprint 2 Batch 2B-5：M05 报告汇总 + 仪表盘统计 DOM 测试（vue 仓）。
//
// 镜像 react 仓 tests/features/summary/summaryList.dom.test.tsx。
// vue 仓走 vi.mock('axios') + 内联 fixture（与 react 仓 msw 端 handlers-extra 同构）。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";
import SummaryList from "@/features/summary/SummaryList.vue";

const SUMMARY_DATA = {
  summaryName: "报告汇总（ALL）",
  columns: [
    { key: "commissionCode", label: "委托编号" },
    { key: "categoryCode", label: "报告类别" },
    { key: "projectName", label: "工程名称" },
    { key: "flowStatus", label: "流程状态" },
    { key: "result", label: "结论" },
    { key: "reportCode", label: "报告编号" },
  ],
  rows: [
    { commissionCode: "C-001", categoryCode: "RC", projectName: "工程 A", flowStatus: "review", result: "qualified", reportCode: "R-2026-001" },
    { commissionCode: "C-002", categoryCode: "ST", projectName: "工程 B", flowStatus: "data_entry", result: "", reportCode: "" },
  ],
};

const STATS_DATA = {
  contractCount: 10,
  receiptCount: 25,
  sampleCount: 80,
  reportCountByStatus: {
    draft: 5,
    reviewing: 3,
    issued: 17,
  },
  pendingTaskCount: 8,
};

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import axios from "axios";

function installAdapters(): void {
  vi.mocked(axios.get).mockImplementation(async (url: string) => {
    const u = String(url);
    if (u.includes("/api/summary/stats")) {
      return { data: STATS_DATA } as never;
    }
    if (u.includes("/api/summary")) {
      return { data: SUMMARY_DATA } as never;
    }
    return { data: null } as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  installAdapters();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("M05.F01 报告汇总", () => {
  fnTest(["M05.F01.I01"], "F01 渲染标题 + 汇总表表头", async () => {
    const wrapper = mountWithProviders(SummaryList);
    await flushPromises();
    expect(wrapper.text()).toContain("报告汇总");
    // Phase 2a-1 迁移：<th> → <TableHead> 渲染为 div[role=columnheader]
    const headers = wrapper.findAll('[role="columnheader"]');
    const labels = headers.map((h) => h.text());
    expect(labels).toContain("委托编号");
    expect(labels).toContain("工程名称");
    expect(labels).toContain("流程状态");
    expect(labels).toContain("结论");
    expect(labels).toContain("报告编号");
  });

  fnTest(["M05.F01.I01"], "F01 列表行渲染（rows 数据穿透）", async () => {
    const wrapper = mountWithProviders(SummaryList);
    await flushPromises();
    // Phase 2a-1 迁移：<tbody><tr> → <TableBody> 内 <TableRow> 渲染为 div[role=row]
    // 数据行在第二个 rowgroup（TableBody），不在第一个（TableHeader）
    const rowgroups = wrapper.findAll('[role="rowgroup"]');
    expect(rowgroups.length).toBe(2);
    const bodyRows = rowgroups[1]!.findAll('[role="row"]');
    expect(bodyRows.length).toBeGreaterThan(0);
    expect(wrapper.text()).toContain("C-001");
    expect(wrapper.text()).toContain("工程 A");
  });

  fnTest(["M05.F01.I02"], "F02 仪表盘统计卡片（合同/接样/样品/待办/按状态）", async () => {
    const wrapper = mountWithProviders(SummaryList);
    await flushPromises();
    expect(wrapper.text()).toContain("合同数");
    expect(wrapper.text()).toContain("接样数");
    expect(wrapper.text()).toContain("样品数");
    expect(wrapper.text()).toContain("待办任务");
    expect(wrapper.text()).toContain("按状态分布");
    // 统计数字穿透
    expect(wrapper.text()).toContain("10");
    expect(wrapper.text()).toContain("25");
  });

  fnTest(["M05.F01.I01", "M05.F01.I02"], "F01+F02 报告类别下拉存在", async () => {
    const wrapper = mountWithProviders(SummaryList);
    await flushPromises();
    const select = wrapper.find("#categoryCode");
    expect(select.exists()).toBe(true);
    expect(select.text()).toContain("全部");
  });
});

// Phase 1.4 Label 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：显式 for/id 配对经 Label 的 props.for 转发到真实 <label for>，
// 与 raw <select id=categoryCode> 的配对不断（select 留 Phase 2d）。
describe("Phase 1.4 — SummaryList 筛选 <Label> 原语回归", () => {
  it("<Label for=categoryCode>：for 落到真实 <label>，仍指向 raw <select id>", async () => {
    const wrapper = mountWithProviders(SummaryList);
    await flushPromises();

    const label = wrapper.find('label[for="categoryCode"]');
    expect(label.exists()).toBe(true);
    expect(label.element.tagName).toBe("LABEL");
    expect(label.text()).toBe("报告类别");
    expect(label.classes()).toContain("text-sm");
    expect(label.classes()).toContain("font-medium");
    expect(label.classes()).toContain("peer-disabled:opacity-70");
    // for 指向的 id 真实存在
    expect(wrapper.find("#categoryCode").exists()).toBe(true);
    wrapper.unmount();
  });
});
