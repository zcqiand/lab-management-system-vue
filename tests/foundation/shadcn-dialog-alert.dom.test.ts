// Phase 2e-1 foundation smoke — shadcn-vue Dialog + AlertDialog 原语底座契约测试。
// 不挂功能 ID（工程设施测试）。
//
// 锁的是「换掉手写 <Teleport> 后必须白拿到的东西」，后续 2e-2/3/4 业务迁移不许回归：
//   1. DialogContent 渲染 div[role=dialog]；AlertDialogContent 渲染
//      div[role=alertdialog]（不是同一个 role —— 读屏行为不同）
//   2. Title / Description 经 reka-ui context 挂上 aria-labelledby /
//      aria-describedby（手写 <Teleport> 版本完全没有这个）
//   3. $attrs（data-testid / data-fn）落到真实 DOM；class prop 经 cn() 合并
//   4. Dialog 有关闭 X（带 aria-label）；AlertDialog **没有** —— alert 必须显式选择
//   5. ESC 关闭（reka-ui 自带，手写版本要自己加 keydown 监听）
//   6. AlertDialogCancel / Action 委托给 <Button>，CVA 基类仍在，
//      点击既触发业务回调又关闭弹窗
//   7. open=false 时内容不渲染
import { describe, it, expect, afterEach } from "vitest";
import { nextTick } from "vue";
import { flushPromises, type VueWrapper } from "@vue/test-utils";
import { mountWithProviders } from "../helper";
import DialogAlertFixture from "./__fixtures__/DialogAlertFixture.vue";

let lastWrapper: VueWrapper | null = null;
afterEach(() => {
  if (lastWrapper) {
    lastWrapper.unmount();
    lastWrapper = null;
  }
});

async function mountFixture() {
  const wrapper = mountWithProviders(DialogAlertFixture, { attachTo: document.body });
  lastWrapper = wrapper;
  await flushPromises();
  return wrapper;
}

describe("Phase 2e-1 foundation — shadcn-vue Dialog 底座", () => {
  it("DialogContent 渲染 div[role=dialog]，$attrs + class prop 都落到真实 DOM", async () => {
    const w = await mountFixture();

    const content = w.find('[data-testid="dlg-content"]');
    expect(content.exists()).toBe(true);
    expect(content.element.tagName).toBe("DIV");
    expect(content.attributes("role")).toBe("dialog");
    // class prop 经 cn() 合并：基类 + 调用方共存
    expect(content.classes()).toContain("fixed");
    expect(content.classes()).toContain("extra-dlg");
  });

  it("Title / Description 经 reka-ui context 挂上 aria-labelledby / aria-describedby", async () => {
    const w = await mountFixture();

    const content = w.find('[data-testid="dlg-content"]');
    const title = w.find('[data-testid="dlg-title"]');
    const desc = w.find('[data-testid="dlg-desc"]');
    expect(title.exists()).toBe(true);
    expect(desc.exists()).toBe(true);

    // 这是迁移最大的净收益：手写 <Teleport> + <h2> 版本没有任何 aria 关联
    expect(content.attributes("aria-labelledby")).toBe(title.attributes("id"));
    expect(content.attributes("aria-describedby")).toBe(desc.attributes("id"));
    expect(title.attributes("id")).toBeTruthy();
    expect(desc.attributes("id")).toBeTruthy();
  });

  it("Dialog 有关闭 X，aria-label 走 close-label prop", async () => {
    const w = await mountFixture();

    const close = w.find('[data-testid="dlg-content"] button[aria-label="关掉"]');
    expect(close.exists()).toBe(true);
  });

  it("点关闭 X → open 变 false，内容不再渲染", async () => {
    const w = await mountFixture();
    expect(w.find('[data-testid="dlg-state"]').text()).toBe("open");

    await w.find('button[aria-label="关掉"]').trigger("click");
    await flushPromises();

    expect(w.find('[data-testid="dlg-state"]').text()).toBe("closed");
    expect(w.find('[data-testid="dlg-body"]').exists()).toBe(false);
  });

  it("ESC 按层级从上往下关：先关最上面的 AlertDialog，再按一次才关 Dialog", async () => {
    const w = await mountFixture();

    // reka-ui 的 DismissableLayer 在挂载后再一拍才把 keydown 挂到 document，
    // mount 后立刻 dispatch 会打空。
    await nextTick();

    // fixture 里两个弹窗同时开着；AlertDialog 后挂载 → 在栈顶
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    await nextTick();
    await flushPromises();
    expect(w.find('[data-testid="alert-state"]').text()).toBe("closed");
    expect(w.find('[data-testid="dlg-state"]').text()).toBe("open");

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }),
    );
    await nextTick();
    await flushPromises();
    expect(w.find('[data-testid="dlg-state"]').text()).toBe("closed");
  });

  it("Dialog 默认是模态（modal prop 的 Boolean 转型陷阱回归锚）", async () => {
    const w = await mountFixture();
    await nextTick();

    // 先把栈顶的 AlertDialog 关掉，剩下的模态效果只可能来自 <Dialog>
    await w.find('button[data-fn="alert-cancel"]').trigger("click");
    await flushPromises();
    expect(w.find('[data-testid="dlg-state"]').text()).toBe("open");

    // reka-ui 不挂 aria-modal；模态的可观测信号是 body 被锁掉指针事件。
    //
    // Vue 对声明为 Boolean 的 prop 做转型：不传时是 false 不是 undefined。
    // 所以 Dialog.vue 里 modal 必须走 withDefaults({ modal: true })；
    // 写成 `props.modal ?? true` 会静默退化成非模态（不 trap focus、不锁滚动）。
    expect(document.body.style.pointerEvents).toBe("none");
  });

  it("DialogFooter 里的 <Button> data-fn 落到真实 <button> 且能关闭弹窗", async () => {
    const w = await mountFixture();

    const save = w.find('button[data-fn="dlg-save"]');
    expect(save.exists()).toBe(true);
    expect(save.classes()).toContain("inline-flex");

    await save.trigger("click");
    await flushPromises();
    expect(w.find('[data-testid="dlg-state"]').text()).toBe("closed");
  });
});

describe("Phase 2e-1 foundation — shadcn-vue AlertDialog 底座", () => {
  it("AlertDialogContent 渲染 div[role=alertdialog]（不是 dialog）", async () => {
    const w = await mountFixture();

    const content = w.find('[data-testid="alert-content"]');
    expect(content.exists()).toBe(true);
    expect(content.attributes("role")).toBe("alertdialog");
    expect(content.classes()).toContain("extra-alert");
  });

  it("AlertDialog 的 Title / Description 同样挂 aria-labelledby / aria-describedby", async () => {
    const w = await mountFixture();

    const content = w.find('[data-testid="alert-content"]');
    const title = w.find('[data-testid="alert-title"]');
    const desc = w.find('[data-testid="alert-desc"]');
    expect(content.attributes("aria-labelledby")).toBe(title.attributes("id"));
    expect(content.attributes("aria-describedby")).toBe(desc.attributes("id"));
  });

  it("AlertDialog 没有关闭 X —— 必须显式选取消或确认", async () => {
    const w = await mountFixture();

    const content = w.find('[data-testid="alert-content"]');
    const buttons = content.findAll("button");
    // 只有取消 + 确认两个按钮，没有第三个逃生门
    expect(buttons.length).toBe(2);
    expect(buttons.map((b) => b.text())).toEqual(["取消", "删除"]);
  });

  it("Cancel / Action 委托给 <Button>：CVA 基类在，data-fn 落到真实 <button>", async () => {
    const w = await mountFixture();

    const cancel = w.find('button[data-fn="alert-cancel"]');
    const confirm = w.find('button[data-fn="alert-confirm"]');
    expect(cancel.exists()).toBe(true);
    expect(confirm.exists()).toBe(true);
    // as-child 委托：渲染出来的是 <Button> 的 CVA 类，不是 reka 裸 button
    expect(cancel.classes()).toContain("inline-flex");
    expect(cancel.classes()).toContain("border");
    // danger 默认 true → destructive 配色。这条同时是 Boolean 转型陷阱的回归锚：
    // 调用方没传 danger 时 props.danger 是 `false` 不是 `undefined`，所以
    // AlertDialogAction 必须走 withDefaults({ danger: true })，
    // 写成 `props.danger !== false` / `props.danger ?? true` 都会静默丢掉红色。
    expect(confirm.classes()).toContain("bg-destructive");
    // tailwind-merge 应当把 variant=default 的 bg-primary 顶掉
    expect(confirm.classes()).not.toContain("bg-primary");
  });

  it("点 Cancel → 业务回调触发且弹窗关闭", async () => {
    const w = await mountFixture();
    expect(w.find('[data-testid="cancelled"]').text()).toBe("0");

    await w.find('button[data-fn="alert-cancel"]').trigger("click");
    await flushPromises();

    expect(w.find('[data-testid="cancelled"]').text()).toBe("1");
    expect(w.find('[data-testid="alert-state"]').text()).toBe("closed");
  });

  it("点 Action → 业务回调触发且弹窗关闭", async () => {
    const w = await mountFixture();

    await w.find('button[data-fn="alert-confirm"]').trigger("click");
    await flushPromises();

    expect(w.find('[data-testid="confirmed"]').text()).toBe("1");
    expect(w.find('[data-testid="alert-state"]').text()).toBe("closed");
  });
});
