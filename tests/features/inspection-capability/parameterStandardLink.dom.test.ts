// M06.F03.I02 — 参数↔标准关联弹窗 smoke（镜像 react 仓 parameterStandardLink.dom.test.tsx）
import { describe, expect, beforeEach, vi, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { fnTest } from "../../fn";
import { mountWithProviders } from "../../helper";

const STANDARDS = [
  { id: "GB 175-2023", code: "GB 175-2023", name: "通用硅酸盐水泥", version: "2023", status: "active", tenantId: "TENANT-001" },
  { id: "GB/T 50081-2019", code: "GB/T 50081-2019", name: "混凝土物理力学性能试验方法标准", version: "2019", status: "active", tenantId: "TENANT-001" },
];

// IP-0001 已关联 GB 175-2023（镜像 msw fixtures 语义）
const LINKS = [
  { inspectionStandardCode: "GB 175-2023", inspectionParameterCode: "IP-0001", createdAt: "", updatedAt: "" },
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
    if (u.includes("/api/inspection/links/standard-parameter")) {
      return { data: LINKS } as never;
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

function makeProps(paramCode: string) {
  return {
    open: true,
    parameterCode: paramCode,
    parameterName: "抗压强度",
  };
}

describe("M06.F03.I02 参数↔标准关联", () => {
  fnTest(["M06.F03.I02"], "关联弹窗：列出标准 + 已关联态（IP-0001 已关联 GB 175-2023）", async () => {
    const { default: Dialog } = await import(
      "@/features/inspection-capability/ParameterStandardLinkDialog.vue"
    );
    const wrapper = mountWithProviders(Dialog, {
      props: makeProps("IP-0001"),
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    const text = wrapper.text();
    expect(text).toContain("关联标准 — 抗压强度");
    expect(text).toContain("GB 175-2023");
    // 已关联按钮为「解除关联」
    const unlinkBtn = wrapper.findAll("button").find((b) => b.text() === "解除关联");
    expect(unlinkBtn).toBeTruthy();
  });

  fnTest(["M06.F03.I02"], "toggle：未关联标准 → POST 后按钮翻「解除关联」", async () => {
    const { default: Dialog } = await import(
      "@/features/inspection-capability/ParameterStandardLinkDialog.vue"
    );
    const wrapper = mountWithProviders(Dialog, {
      props: makeProps("IP-0999"),
      global: MOUNT_GLOBAL,
    });
    await flushPromises();
    await new Promise((r) => setTimeout(r, 50));
    await flushPromises();
    // IP-0999 无既有链接 → 全部「关联」
    const linkBtn = wrapper.findAll("button").find((b) => b.text() === "关联");
    expect(linkBtn).toBeTruthy();
    await linkBtn!.trigger("click");
    await flushPromises();
    expect(axios.post).toHaveBeenCalled();
    const unlinkBtn = wrapper.findAll("button").find((b) => b.text() === "解除关联");
    expect(unlinkBtn).toBeTruthy();
  });
});
