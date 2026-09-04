<script setup lang="ts">
// CheckboxTextareaFixture — Phase 2b/c foundation 底座冒烟测试挂载靶子。
// **只给 tests/ 用**，不被任何业务代码 import（不进 bundle）。
//
// 挂 2 个原语（<Checkbox> + <Textarea>），钉住契约：
//   1. Checkbox 渲染为 <button role="checkbox">（reka-ui CheckboxRoot as=button）
//   2. Checkbox v-model 双向写回（boolean）
//   3. Checkbox 点 click 切换选中态
//   4. Checkbox aria-checked 反映 state（true / false）
//   5. Checkbox $attrs（aria-label / data-fn）落到真实 <button>
//   6. Checkbox class prop 经 cn() 合并
//   7. Textarea 渲染为真实 <textarea>
//   8. Textarea v-model 双向写回（string）
//   9. Textarea $attrs（data-fn / aria-label）落到真实 <textarea>
//  10. Textarea disabled 落到真实 DOM
import { ref } from "vue";
import Checkbox from "@/components/ui/Checkbox.vue";
import Textarea from "@/components/ui/Textarea.vue";

const cbChecked = ref(false);
const taText = ref("init");
</script>

<template>
  <div>
    <Checkbox
      v-model="cbChecked"
      data-testid="cb"
      data-fn="M99.F99.I99"
      aria-label="测试 checkbox"
      class="extra-class"
    />
    <span data-testid="cb-state">{{ cbChecked ? "checked" : "unchecked" }}</span>

    <Textarea
      v-model="taText"
      data-testid="ta"
      data-fn="M99.F99.I99"
      :rows="4"
      placeholder="placeholder"
      class="extra-ta-class"
    />
    <span data-testid="ta-state">{{ taText }}</span>

    <Textarea
      data-testid="ta-disabled"
      :model-value="'locked'"
      disabled
    />
  </div>
</template>