// M03.F05/F06/F07/F08 — 报告 4 阶段 smoke（镜像 react 仓 tests/features/reports/reportPhasePage.dom.test.tsx 8 个 fnTest）
import { describe, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const RECEIPTS_BY_PHASE: Record<string, unknown[]> = {
  review: [
    {
      id: "R-REVIEW-001",
      commissionCode: "WT-RV-001",
      projectName: "城东综合体报告",
      flowStatus: "review",
      result: "pass",
      tenantId: "TENANT-001",
    },
  ],
  approval: [
    {
      id: "R-APPROVE-001",
      commissionCode: "WT-AP-001",
      projectName: "城南高架报告",
      flowStatus: "approval",
      result: "pass",
      tenantId: "TENANT-001",
    },
  ],
  issuance: [
    {
      id: "R-ISSUE-001",
      commissionCode: "WT-IS-001",
      projectName: "城西商住报告",
      flowStatus: "issuance",
      result: "pass",
      tenantId: "TENANT-001",
    },
  ],
  archived: [
    {
      id: "R-ARCHIVE-001",
      commissionCode: "WT-AR-001",
      projectName: "城北工厂报告",
      flowStatus: "archived",
      result: "pass",
      tenantId: "TENANT-001",
    },
  ],
};

function wrapList(arr: unknown[]): { items: unknown[]; page: number; pageSize: number; total: number } {
  return { items: arr, page: 1, pageSize: arr.length, total: arr.length };
}

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import axios from "axios";

function installAdapters(phase: string): void {
  vi.mocked(axios.get).mockImplementation(async (url: string) => {
    const u = String(url);
    if (u.includes("/api/receipts")) {
      return { data: wrapList(RECEIPTS_BY_PHASE[phase] ?? []) } as never;
    }
    return { data: wrapList([]) } as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const MOUNT_GLOBAL = {
  stubs: {
    teleport: { template: "<div data-teleport-stub><slot /></div>" },
  },
};

describe("M03.F05 报告审核", () => {
  beforeEach(() => installAdapters("review"));
  fnTest(["M03.F05.I01"], "报告审核：渲染标题 + 列表行（review 阶段 fixture 穿透）", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    const wrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("报告审核");
    expect(wrapper.text()).toContain("WT-RV-001");
  });
  fnTest(["M03.F05.I02"], "报告审核：「审核通过」按钮 data-fn 可见", async () => {
    const { default: ReportReviewPage } = await import("@/pages/ReportReviewPage.vue");
    const wrapper = mountWithProviders(ReportReviewPage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const submitBtn = wrapper.findAll("button").find((b) => /审核通过/.test(b.text()));
    expect(submitBtn).toBeTruthy();
  });
});

describe("M03.F06 报告批准", () => {
  beforeEach(() => installAdapters("approval"));
  fnTest(["M03.F06.I01"], "报告批准：渲染标题 + 列表行（approval 阶段 fixture 穿透）", async () => {
    const { default: ReportApprovePage } = await import("@/pages/ReportApprovePage.vue");
    const wrapper = mountWithProviders(ReportApprovePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("报告批准");
    expect(wrapper.text()).toContain("WT-AP-001");
  });
  fnTest(["M03.F06.I02"], "报告批准：「批准」按钮 data-fn 可见", async () => {
    const { default: ReportApprovePage } = await import("@/pages/ReportApprovePage.vue");
    const wrapper = mountWithProviders(ReportApprovePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const submitBtn = wrapper.findAll("button").find((b) => /批准/.test(b.text()));
    expect(submitBtn).toBeTruthy();
  });
});

describe("M03.F07 报告发放", () => {
  beforeEach(() => installAdapters("issuance"));
  fnTest(["M03.F07.I01"], "报告发放：渲染标题 + 列表行（issuance 阶段 fixture 穿透）", async () => {
    const { default: ReportIssuePage } = await import("@/pages/ReportIssuePage.vue");
    const wrapper = mountWithProviders(ReportIssuePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("报告发放");
    expect(wrapper.text()).toContain("WT-IS-001");
  });
  fnTest(["M03.F07.I02"], "报告发放：「发放」按钮 data-fn 可见", async () => {
    const { default: ReportIssuePage } = await import("@/pages/ReportIssuePage.vue");
    const wrapper = mountWithProviders(ReportIssuePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const submitBtn = wrapper.findAll("button").find((b) => /发放/.test(b.text()));
    expect(submitBtn).toBeTruthy();
  });
});

describe("M03.F08 报告归档", () => {
  beforeEach(() => installAdapters("archived"));
  fnTest(["M03.F08.I01"], "报告归档：渲染标题 + 列表行（archived 阶段 fixture 穿透）", async () => {
    const { default: ReportArchivePage } = await import("@/pages/ReportArchivePage.vue");
    const wrapper = mountWithProviders(ReportArchivePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("报告归档");
    expect(wrapper.text()).toContain("WT-AR-001");
  });
  fnTest(["M03.F08.I02"], "报告归档：「归档完成」按钮 data-fn 可见", async () => {
    const { default: ReportArchivePage } = await import("@/pages/ReportArchivePage.vue");
    const wrapper = mountWithProviders(ReportArchivePage, { global: MOUNT_GLOBAL });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const submitBtn = wrapper.findAll("button").find((b) => /归档完成/.test(b.text()));
    expect(submitBtn).toBeTruthy();
  });
});