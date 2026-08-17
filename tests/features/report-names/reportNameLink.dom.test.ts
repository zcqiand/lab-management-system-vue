// M06.F07.I02 — 报告名称↔标准/参数关联弹窗 smoke（镜像 react 仓 reportNameLink.dom.test.tsx）
import { describe, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
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
