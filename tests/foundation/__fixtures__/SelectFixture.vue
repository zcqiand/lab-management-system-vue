<script setup lang="ts">
// SelectFixture — Phase 2d-1 foundation 底座冒烟测试挂载靶子。
// **只给 tests/ 用**，不被任何业务代码 import（不进 bundle）。
//
// 挂 5 个原语（<Select> / <SelectTrigger> / <SelectContent> / <SelectItem> /
// <SelectValue>），钉住契约：
//   1. <SelectTrigger> 渲染为 `<button type="button" role="combobox">`
//      （reka-ui SelectTrigger as=button）
//   2. <SelectValue> placeholder 显示 fallback（modelValue 为空时）
//   3. 点 <SelectTrigger> 打开 portal，<SelectContent> 渲染为 div[role=listbox]
//   4. <SelectItem> 渲染为 div[role=option]，选中态 data-state=checked
//   5. 点 <SelectItem> → v-model 双向写回；trigger 显示新值
//   6. $attrs（aria-label / data-fn）落到真实 <button>
//   7. disabled 落到真实 DOM（button disabled 属性）
//   8. class prop 经 cn() 合并（基类 h-9 + 调用方 extra-class）
import { ref } from "vue";
import Select from "@/components/ui/Select.vue";
import SelectTrigger from "@/components/ui/SelectTrigger.vue";
import SelectContent from "@/components/ui/SelectContent.vue";
import SelectItem from "@/components/ui/SelectItem.vue";
import SelectValue from "@/components/ui/SelectValue.vue";

const value = ref<string>("");
const disabledValue = ref<string>("B");
</script>

<template>
  <div>
    <Select v-model="value" data-testid="sel">
      <SelectTrigger
        data-testid="sel-trigger"
        data-fn="M99.F99.I99"
        aria-label="测试 select"
        class="extra-class"
      >
        <SelectValue placeholder="请选择" />
      </SelectTrigger>
      <SelectContent data-testid="sel-content">
        <SelectItem value="A" data-testid="sel-opt-A">选项 A</SelectItem>
        <SelectItem value="B" data-testid="sel-opt-B">选项 B</SelectItem>
        <SelectItem value="C" data-testid="sel-opt-C">选项 C</SelectItem>
      </SelectContent>
    </Select>
    <span data-testid="sel-state">{{ value }}</span>

    <Select v-model="disabledValue" disabled>
      <SelectTrigger data-testid="sel-disabled-trigger">
        <SelectValue placeholder="禁用占位" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="X">X</SelectItem>
        <SelectItem value="B">B</SelectItem>
      </SelectContent>
    </Select>
  </div>
</template>
