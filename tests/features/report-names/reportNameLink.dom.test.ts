// M06.F07.I02 — 报告名称↔标准/参数关联弹窗 smoke（镜像 react 仓 reportNameLink.dom.test.tsx）
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { nextTick } from "vue";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const STANDARDS = [
  { id: "GB 175-2023", code: "GB 175-2023", name: "通用硅酸盐水泥", status: "active", tenantId: "TENANT-001" },
];
const PARAMETERS = [
  { id: "IP-0001", code: "IP-0001", name: "抗压强度", unit: "MPa", tenantId: "TENANT-001" },
];
// RN-001 已关联标准 GB 175-2023（TESTING）；参数无关联
const STD_LINKS = [
  { reportNameCode: "RN-001", inspectionStandardCode: "GB 175-2023", role: "TESTING" },
];

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
    if (u.includes("/api/inspection/standards")) {
      return { data: { items: STANDARDS, total: STANDARDS.length } } as never;
    }
    if (u.includes("/api/inspection/parameters")) {
      return { data: { items: PARAMETERS, total: PARAMETERS.length } } as never;
    }
    if (u.includes("/api/report-names/links/standard")) {
      return { data: STD_LINKS } as never;
    }
    if (u.includes("/api/report-names/links/parameter")) {
      return { data: [] } as never;
    }
    return { data: { items: [] } } as never;
  });
  vi.mocked(axios.post).mockImplementation(async () => ({ status: 204, data: null }) as never);
  vi.mocked(axios.delete).mockImplementation(async () => ({ status: 204, data: null }) as never);
}

beforeEach(() => {
  installAdapters();
});
afterEach(() => {
  vi.restoreAllMocks();
});

const MOUNT_GLOBAL = {
  stubs: {
    teleport: { template: '<div data-teleport-stub><slot /></div>' },
  },
};

function makeProps(rnCode: string) {
  return {
    open: true,
    reportNameCode: rnCode,
    reportNameLabel: "检测报告",
  };
}

describe("M06.F07.I02 报告名称↔标准/参数关联", () => {
  fnTest(["M06.F07.I02"], "关联弹窗：两段列表渲染（标准已关联 + 参数未关联）", async () => {
    const { default: Dialog } = await import("@/features/report-names/ReportNameLinkDialog.vue");
    const wrapper = mountWithProviders(Dialog, {
      props: makeProps("RN-001"),
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain("关联维护 — 检测报告");
    expect(text).toContain("检测标准（role=检测）");
    expect(text).toContain("检测参数");
    // 标准段已关联 → 「解除」；参数段未关联 → 「关联」
    expect(wrapper.findAll("button").some((b) => b.text() === "解除")).toBe(true);
    expect(wrapper.findAll("button").some((b) => b.text() === "关联")).toBe(true);
  });

  fnTest(["M06.F07.I02"], "toggle 参数：POST 后按钮翻「解除」", async () => {
    const { default: Dialog } = await import("@/features/report-names/ReportNameLinkDialog.vue");
    const wrapper = mountWithProviders(Dialog, {
      props: makeProps("RN-NO-LINK"),
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    // 参数段「关联」按钮（RN-NO-LINK 无既有链接）
    const paramLinkBtn = wrapper
      .findAll("button")
      .find((b) => b.attributes("aria-label")?.startsWith("关联参数"));
    expect(paramLinkBtn).toBeTruthy();
    await paramLinkBtn!.trigger("click");
    await flushPromises();
    expect(axios.post).toHaveBeenCalled();
    const unlinkBtn = wrapper
      .findAll("button")
      .find((b) => b.attributes("aria-label")?.startsWith("解除参数"));
    expect(unlinkBtn).toBeTruthy();
  });
});

// Phase 2e-3 —— ReportNameLinkDialog 关联型弹窗从手写 <Teleport>+遮罩 div 换成 <Dialog> 家族。
// 与样板不同：data-fn='M06.F07.I02' 挂在每行 button 上（标准段 1 个 + 参数段 1 个），
// 不是挂在遮罩 div。锚测要锁：行内 button data-fn 仍落真实 button，且所有
// data-fn 都在弹窗子树内（弹窗结构没把行抽走）。
describe("Phase 2e-3 — ReportNameLinkDialog 关联弹窗走 Dialog 底座", () => {
  async function mountDialog(props?: Record<string, unknown>): Promise<VueWrapper> {
    const { default: Dialog } = await import("@/features/report-names/ReportNameLinkDialog.vue");
    const wrapper = mountWithProviders(Dialog, {
      props: {
        open: true,
        reportNameCode: "RN-001",
        reportNameLabel: "检测报告",
        ...props,
      },
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    return wrapper;
  }

  it("弹窗渲染 div[role=dialog]，标题经 reka context 连上 aria-labelledby='关联维护 — 检测报告'", async () => {
    const w = await mountDialog();

    const dialog = w.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);

    const titleId = dialog.attributes("aria-labelledby");
    expect(titleId).toBeTruthy();
    expect(w.find(`#${titleId}`).text()).toContain("关联维护 — 检测报告");

    const descId = dialog.attributes("aria-describedby");
    expect(descId).toBeTruthy();
    expect(w.find(`#${descId}`).text()).toContain("报告名称 RN-001");
  });

  it("行内关联键的 data-fn 仍落真实 <button>，标准段 + 参数段各 1 个", async () => {
    const w = await mountDialog();
    const dialog = w.find('[role="dialog"]');
    expect(dialog.exists()).toBe(true);

    const buttons = dialog.findAll('button[data-fn="M06.F07.I02"]');
    // fixture 标准 1 行 + 参数 1 行 → 2 个行内按钮
    expect(buttons.length).toBe(2);
    for (const btn of buttons) {
      expect(btn.element.tagName).toBe("BUTTON");
    }
    // 标准段按钮 aria-label 走「解除标准/关联标准」，参数段走「解除参数/关联参数」
    const stdBtn = buttons.find((b) => b.attributes("aria-label")?.includes("标准"));
    const paramBtn = buttons.find((b) => b.attributes("aria-label")?.includes("参数"));
    expect(stdBtn).toBeTruthy();
    expect(paramBtn).toBeTruthy();
  });

  it("ESC 走 @update:open → emit('update:open', false)（update:open 事件被触发）", async () => {
    const w = await mountDialog();
    expect(w.find('[role="dialog"]').exists()).toBe(true);

    await nextTick();
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    await nextTick();
    await flushPromises();

    expect(w.emitted("update:open")).toBeTruthy();
    expect(w.emitted("update:open")!.some((args) => args[0] === false)).toBe(true);
  });
});
