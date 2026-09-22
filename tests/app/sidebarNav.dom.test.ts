// SidebarNav — 镜像 react 仓 sidebar-nav.tsx 深色分组侧栏（2026-09-23 重设计）。
//
// 用户验收结论：旧版平铺浅色侧栏「白凸凸」，与 react 镜像源（bg-slate-900
// 深色侧栏 + 分组树 + 收起/展开 + 渐变 Logo）视觉断裂。本测试锁镜像设计：
//   1. 深色骨架：bg-slate-900 text-white + w-60/w-14 + data-fn M01.F04.I01
//   2. 分组头渲染（group 节点：标题 + 子项计数 + 收/展 chevron）
//   3. 叶子 = router-link <a>（绝对 href，vue 仓惯例，非 react 的 button）
//   4. 选中态 bg-slate-700（按 pathname 前缀全树匹配）
//   5. 全局收起/展开 + localStorage 持久化（sidebar.collapsed.<appCode>）
//   6. menus=null 加载态「（菜单加载中）」
//   7. icon 查不到映射（saas 菜单 icon="file" 小写枚举 vs ICON_MAP PascalCase）
//      → 等宽占位 span（镜像 react Icon() fallback，非报错）
//   8. footer slots（footerExtras=BackendBadge）+ version 文案
// data-fn 锚点沿用 M01.F04.I01（侧栏容器原锚点，行为未变只换视觉）。
import { describe, it, expect, afterEach } from "vitest";
import { flushPromises } from "@vue/test-utils";
import type { VueWrapper } from "@vue/test-utils";
import { mountWithProviders } from "../helper";
import SidebarNav from "@/components/app/SidebarNav.vue";
import type { MenuNode } from "@/composables/use-backend-menus";

let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
  localStorage.clear();
});

const TREE: MenuNode[] = [
  {
    id: "dash",
    appId: "lab-management",
    code: "dash",
    name: "仪表盘",
    path: "/",
    icon: "file",
    type: "page",
    sortOrder: 1,
    children: [],
  },
  {
    id: "grp-biz",
    appId: "lab-management",
    code: "grp-biz",
    name: "实验过程管理",
    type: "group",
    sortOrder: 2,
    children: [
      {
        id: "m-receipts",
        appId: "lab-management",
        code: "m-receipts",
        name: "接样管理",
        path: "/receipts",
        icon: "file",
        type: "page",
        sortOrder: 1,
        children: [],
      },
      {
        id: "m-data",
        appId: "lab-management",
        code: "m-data",
        name: "数据录入",
        path: "/data-entry",
        icon: "file",
        type: "page",
        sortOrder: 2,
        children: [],
      },
    ],
  },
];

function mountNav(props: Record<string, unknown> = {}, initialRoute = "/") {
  lastWrapper = mountWithProviders(SidebarNav, {
    attachTo: document.body,
    router: { initialRoute },
    props: {
      menus: TREE,
      appCode: "lab-management",
      appName: "建筑工程实验室管理系统",
      version: "lab-management-system-vue · appCode=lab-management",
      ...props,
    },
  });
  return lastWrapper!;
}

describe("SidebarNav 深色分组侧栏（镜像 react sidebar-nav.tsx）", () => {
  it("深色骨架：bg-slate-900 text-white + data-fn M01.F04.I01 + 主导航 aria", () => {
    const w = mountNav();
    const aside = w.find('aside[data-testid="sidebar-nav"]');
    expect(aside.exists()).toBe(true);
    expect(aside.classes()).toContain("bg-slate-900");
    expect(aside.classes()).toContain("text-white");
    expect(aside.attributes("data-fn")).toBe("M01.F04.I01");
    expect(aside.attributes("aria-label")).toBe("主导航");
    expect(aside.classes()).toContain("w-60");
  });

  it("品牌头：渐变 Logo + appName + appCode 行", () => {
    const w = mountNav();
    expect(w.find('[data-testid="sidebar-app-name"]').text()).toBe("建筑工程实验室管理系统");
    expect(w.text()).toContain("appCode = lab-management");
  });

  it("分组头渲染：标题 + 子项计数 + 收/展按钮", () => {
    const w = mountNav();
    const group = w.find('[data-testid="sidebar-group-grp-biz"]');
    expect(group.exists()).toBe(true);
    expect(group.text()).toContain("实验过程管理");
    expect(group.text()).toContain("2");
    expect(w.find('[data-testid="sidebar-group-toggle-grp-biz"]').exists()).toBe(true);
  });

  it("叶子 = router-link <a>，绝对 href + data-testid sidebar-item-<code>", () => {
    const w = mountNav();
    const link = w.find('a[data-testid="sidebar-item-m-receipts"]');
    expect(link.exists()).toBe(true);
    expect(link.attributes("href")).toBe("/receipts");
    expect(link.text()).toContain("接样管理");
    // 顶层叶子（path="/"）→ href "/"
    expect(w.find('a[data-testid="sidebar-item-dash"]').attributes("href")).toBe("/");
  });

  it("选中态：导航到叶子路由后命中项带 bg-slate-700", async () => {
    const w = mountNav();
    // 真实导航驱动（initialRoute push 是异步的，点击后断言更贴近行为）
    await w.find('a[data-testid="sidebar-item-m-receipts"]').trigger("click");
    await flushPromises();
    const link = w.find('a[data-testid="sidebar-item-m-receipts"]');
    expect(link.classes()).toContain("bg-slate-700");
    // 未选中叶子不带
    expect(w.find('a[data-testid="sidebar-item-m-data"]').classes()).not.toContain("bg-slate-700");
  });

  it("全局收起：点击 toggle → w-14 + data-collapsed=true + localStorage 持久化", async () => {
    const w = mountNav();
    await w.find('[data-testid="sidebar-toggle"]').trigger("click");
    const aside = w.find('aside[data-testid="sidebar-nav"]');
    expect(aside.classes()).toContain("w-14");
    expect(aside.attributes("data-collapsed")).toBe("true");
    expect(localStorage.getItem("sidebar.collapsed.lab-management")).toBe("1");
    // 收起态品牌文案隐藏（icon-only）
    expect(w.find('[data-testid="sidebar-app-name"]').exists()).toBe(false);
  });

  it("刷新恢复：localStorage 有 1 → 挂载即收起", async () => {
    localStorage.setItem("sidebar.collapsed.lab-management", "1");
    const w = mountNav();
    await flushPromises();
    expect(w.find('aside[data-testid="sidebar-nav"]').classes()).toContain("w-14");
  });

  it("分组收起：点击分组头 → 子项隐藏 + localStorage 持久化", async () => {
    const w = mountNav();
    await w.find('[data-testid="sidebar-group-toggle-grp-biz"]').trigger("click");
    expect(w.text()).not.toContain("接样管理");
    expect(JSON.parse(localStorage.getItem("sidebar.groups.lab-management") ?? "")).toEqual([
      "grp-biz",
    ]);
  });

  it("menus=null → 加载态「（菜单加载中）」", () => {
    const w = mountNav({ menus: null });
    expect(w.find('[data-testid="sidebar-menus-loading"]').exists()).toBe(true);
    expect(w.text()).toContain("（菜单加载中）");
  });

  it("menus=[] → 空态「（无菜单）」", () => {
    const w = mountNav({ menus: [] });
    expect(w.text()).toContain("（无菜单）");
  });

  it("icon 查不到映射 → 等宽占位 span（镜像 react Icon fallback）", () => {
    const w = mountNav();
    // saas 菜单 icon="file"（小写枚举）不在 PascalCase ICON_MAP → 占位
    const link = w.find('a[data-testid="sidebar-item-m-receipts"]');
    const placeholder = link.find("span.size-4");
    expect(placeholder.exists()).toBe(true);
    expect(placeholder.attributes("aria-hidden")).toBe("true");
    expect(link.find("svg").exists()).toBe(false);
  });

  it("footer slots + version 文案", () => {
    lastWrapper = mountWithProviders(SidebarNav, {
      attachTo: document.body,
      router: { initialRoute: "/" },
      props: {
        menus: TREE,
        appCode: "lab-management",
        appName: "建筑工程实验室管理系统",
        version: "lab-management-system-vue · appCode=lab-management",
      },
      slots: {
        footerExtras: '<div data-testid="footer-extras">badge</div>',
      },
    });
    expect(lastWrapper.find('[data-testid="footer-extras"]').exists()).toBe(true);
    expect(lastWrapper.text()).toContain("lab-management-system-vue · appCode=lab-management");
  });
});
