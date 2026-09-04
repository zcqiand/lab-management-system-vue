import tseslint from "typescript-eslint";
import js from "@eslint/js";
import globals from "globals";
import vueParser from "vue-eslint-parser";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      "../lab-management-system-shared/generated/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: [
      "src/**/*.{ts,vue}",
      "tests/**/*.ts",
      "tests/**/*.vue",
      "scripts/**/*.ts",
    ],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parser: vueParser,
      parserOptions: {
        parser: "@typescript-eslint/parser",
        extraFileExtensions: [".vue"],
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-empty-function": "off",
      "no-unused-vars": "off",
      "no-undef": "off",
      "no-empty": "off",
      "no-useless-escape": "off",
      // reportTemplateData.ts 含 CJK 全角空格（regex 字面量里用于中文字符宽度计算）。
      // react 仓镜像配置下不报，本仓 vue-eslint-parser 默认开启，放行。
      "no-irregular-whitespace": "off",
    },
  },
);
