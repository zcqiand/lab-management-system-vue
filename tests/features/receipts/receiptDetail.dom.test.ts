// M03.F09.I01 / I02 / I03 — 接样单详情 smoke
//
// 镜像 react 仓 tests/features/receipts/receiptDetail.dom.test.tsx 3 个 fnTest。
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const RECEIPT = {
  id: "RECEIPT-001",
  commissionCode: "WT-2026-001",
  commissionDate: "2026-07-01",
  projectName: "城东综合体主体检测",
  clientUnit: "市住建局",
  buildingUnit: "—",
  supervisorUnit: "—",
  constructionUnit: "中建八局",
  witnessUnit: "城东置业",
  witness: "王见证",
  witnessPhone: "13800000001",
  inspector: "李送检",
  inspectorPhone: "13800000002",
  samplingLocation: "工地现场",
  receivedBy: "current-user",
  sampleSource: "施工送检",
  testCategory: "委托检验",
  categoryCode: "cement",
  contractId: "CONTRACT-001",
  flowStatus: "task_assignment",
  flowHistory: [
    { action: "submit", from: "receiving", to: "task_assignment", operator: "seed", at: "2026-07-02T00:00:00Z" },
  ],
  testParameters: ["抗压强度", "抗折强度"],
  createdAt: "2026-07-01T00:00:00Z",
  updatedAt: "2026-07-02T00:00:00Z",
  tenantId: "TENANT-001",
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
    if (u.includes("/api/receipts/RECEIPT-001")) {
      return { data: RECEIPT } as never;
    }
    return { data: {} } as never;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  installAdapters();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const MOUNT_GLOBAL = {
  stubs: {
    teleport: { template: "<div data-teleport-stub><slot /></div>" },
  },
};

async function mountDetail() {
  const { default: ReceiptDetail } = await import("@/features/receipts/ReceiptDetail.vue");
  // 直接 mount（不带 initialRoute）+ 手动 push 到目标路由后再 mount
  // 避免 helper 里 push 异步未就绪导致 onMounted 时 route.params 为空
  const { mount } = await import("@vue/test-utils");
  const { createPinia, setActivePinia } = await import("pinia");
  const { createRouter, createMemoryHistory } = await import("vue-router");
  const { VueQueryPlugin, QueryClient } = await import("@tanstack/vue-query");
  setActivePinia(createPinia());
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div />" } },
      { path: "/receipts/:id", component: ReceiptDetail },
    ],
  });
  await router.push("/receipts/RECEIPT-001");
  await router.isReady();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = mount(ReceiptDetail, {
    global: {
      plugins: [router, [VueQueryPlugin, { queryClient }]],
      stubs: MOUNT_GLOBAL.stubs,
    },
  });
  return wrapper;
}

describe("M03.F09 接样单详情", () => {
  fnTest(["M03.F09.I01"], "接样单详情：渲染标题 + 字段区", async () => {
    const wrapper = await mountDetail();
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("接样单详情 — WT-2026-001");
  });

  fnTest(["M03.F09.I02"], "接样单详情：流程历史时间线可见（按 at 倒序）", async () => {
    const wrapper = await mountDetail();
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    expect(wrapper.text()).toContain("流程历史");
    // 时间线显示 flowHistory 条目
    expect(wrapper.text()).toContain("提交");
    expect(wrapper.text()).toContain("分配中");
  });

  fnTest(["M03.F09.I03"], "接样单详情：报告预览按钮开弹窗", async () => {
    const wrapper = await mountDetail();
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const previewBtn = wrapper.findAll("button").find((b) => b.text() === "报告预览");
    expect(previewBtn).toBeTruthy();
    await previewBtn!.trigger("click");
    await flushPromises();
    const h2 = wrapper.findAll("h2").find((h) => h.text().includes("报告预览 —"));
    expect(h2).toBeTruthy();
  });
});
// Phase 1.2b Button 迁移回归锚（不挂功能 ID，工程设施测试）。
// 锁：<Button> 底层仍是 <button>、data-fn=M03.F09.I03 经 $attrs 落到真实 DOM、
// CVA base inline-flex 活着、调用方 token class 经 tailwind-merge 合并进来。
let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

describe("Phase 1.2b — ReceiptDetail <Button> 原语回归", () => {
  it("报告预览按钮：<Button variant=outline size=sm> 渲染 <button>，data-fn 落到真实 DOM，点击开弹窗", async () => {
    lastWrapper = (await mountDetail()) as unknown as VueWrapper;
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const preview = lastWrapper.find('button[data-fn="M03.F09.I03"]');
    expect(preview.exists()).toBe(true);
    expect(preview.element.tagName).toBe("BUTTON");
    expect(preview.classes()).toContain("inline-flex");
    expect(preview.classes()).toContain("border");
    expect(preview.classes()).toContain("text-primary");

    await preview.trigger("click");
    await flushPromises();
    const h2 = lastWrapper.findAll("h2").find((h) => h.text().includes("报告预览 —"));
    expect(h2).toBeTruthy();
  });

  it("返回按钮：<Button variant=outline size=sm class=text-muted-foreground>", async () => {
    lastWrapper = (await mountDetail()) as unknown as VueWrapper;
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();

    const back = lastWrapper.findAll("button").find((b) => b.text() === "返回");
    expect(back).toBeTruthy();
    expect(back!.classes()).toContain("inline-flex");
    expect(back!.classes()).toContain("border");
    expect(back!.classes()).toContain("text-muted-foreground");
  });
});
