// 内容区加载态（B6 批）—— 页面数据未到齐前整页 PageLoading，不渲染空壳。
//
// 工程设施测试：不挂 fn ID（fn.ts 纪律）。网络全 mock（vi.mock axios + 受控
// deferred），不连真后端：
//   - pending：断言 data-testid="page-loading" 在场、页面真实内容不可见
//   - resolve：内容可见、加载态消失
//   - SummaryList 聚合：两个数据源任一未到仍整页加载，全部到齐才显示
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { mountWithProviders } from "../../helper";

type Deferred = {
  promise: Promise<{ data: unknown }>;
  resolve: (v: { data: unknown }) => void;
};

function deferred(): Deferred {
  let resolve!: (v: { data: unknown }) => void;
  const promise = new Promise<{ data: unknown }>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const contractsGet = deferred();
const summaryGet = deferred();
const statsGet = deferred();

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import axios from "axios";

function installPendingAdapters(): void {
  vi.mocked(axios.get).mockImplementation((url: string) => {
    const u = String(url);
    if (u.includes("/api/summary/stats")) return statsGet.promise as never;
    if (u.includes("/api/summary")) return summaryGet.promise as never;
    if (u.includes("/api/contracts")) return contractsGet.promise as never;
    return Promise.resolve({ data: { items: [], total: 0 } }) as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  installPendingAdapters();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("页面级加载态（PageLoading 门控）", () => {
  it("PageLoading 组件渲染加载标记（testid + 文案）", async () => {
    const { default: PageLoading } = await import("@/components/app/PageLoading.vue");
    const wrapper = mountWithProviders(PageLoading);
    expect(wrapper.find('[data-testid="page-loading"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("加载中…");
  });

  it("ContractsList：fetch pending 时整页加载态，空表壳不先渲染；resolve 后内容可见", async () => {
    const { default: ContractsList } = await import("@/features/contracts/ContractsList.vue");
    const wrapper = mountWithProviders(ContractsList);
    await flushPromises();

    // RED（改前）：壳（标题/表头）先渲染，且没有整页加载标记
    expect(wrapper.find('[data-testid="page-loading"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("合同编号");
    expect(wrapper.text()).not.toContain("合同管理");

    contractsGet.resolve({
      data: {
        items: [
          {
            id: "T1",
            contractCode: "HT-TEST-001",
            clientUnit: "委托单位T",
            projectName: "工程T",
            constructionUnit: "施工T",
            witnessUnit: "见证T",
            witness: "张三",
            status: "active",
            tenantId: "TENANT-001",
          },
        ],
        page: 1,
        pageSize: 1,
        total: 1,
      },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 20));
    await flushPromises();
    expect(wrapper.find('[data-testid="page-loading"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("HT-TEST-001");
    expect(wrapper.text()).toContain("合同编号");
  });

  it("SummaryList：两个数据源任一未到即整页加载态，全部到齐才显示界面", async () => {
    const { default: SummaryList } = await import("@/features/summary/SummaryList.vue");
    const wrapper = mountWithProviders(SummaryList);
    await flushPromises();

    expect(wrapper.find('[data-testid="page-loading"]').exists()).toBe(true);
    expect(wrapper.text()).not.toContain("报告汇总");

    // 只到 stats（1/2 源）——仍整页加载
    // （stats 形状须含 reportCountByStatus：模板 stats?.reportCountByStatus.draft
    //   在字段缺失时渲染抛错，会让 v-else 分支挂不上——非门控本身的问题）
    statsGet.resolve({
      data: {
        contractCount: 1,
        receiptCount: 0,
        sampleCount: 0,
        reportCountByStatus: { draft: 0, reviewing: 0, issued: 0 },
        pendingTaskCount: 0,
      },
    });
    await flushPromises();
    expect(wrapper.find('[data-testid="page-loading"]').exists()).toBe(true);

    // 汇总表也到（2/2 源）——加载态消失，内容可见
    summaryGet.resolve({
      data: {
        summaryName: "汇总",
        columns: [{ key: "commissionCode", label: "委托书编号" }],
        rows: [{ commissionCode: "RC-001" }],
      },
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 20));
    await flushPromises();
    expect(wrapper.find('[data-testid="page-loading"]').exists()).toBe(false);
    expect(wrapper.text()).toContain("报告汇总");
    expect(wrapper.text()).toContain("RC-001");
  });
});
