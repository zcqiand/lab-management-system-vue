// 应用元信息（版本号单一来源 = package.json，vite resolveJsonModule 直读）。
// 消费方：SidebarNav 品牌头版本行、AppShell footer 版本文案。

import pkg from "../../package.json";

export const APP_VERSION: string = pkg.version;
