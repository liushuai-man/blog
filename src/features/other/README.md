# 喵喵屋模块

每个模块独立占一个目录。公共组件负责外观和加载状态，模块只管理自己的交互与资源。

第二项 `pixel-canvas/` 为像素画布：无限坐标网格、缩放与拖动视野、点击／拖动填色、右键擦除、自动缓存、按笔撤回与透明 PNG 导出。`model.ts` 管理笔画与缓存格式，组件持有输入和保存定时器。`pnpm test:pixel-canvas` 验证核心逻辑，范围见 [像素画布计划](../../../docs/plans/04-pixel-canvas.md)。

```text
stylophone/
  definition.ts          静态信息、入口开关、路由、说明和封面
  cover.png              为此模块单独生成的图片，不使用页面截图
  index.ts               按需加载的组件入口
  StylophoneTool.svelte   模块 UI 与生命周期
  input.ts / audio.ts    模块私有输入与音频
```

新增模块时提供符合 `types.ts` 的定义，将定义加入 `registry.ts`，再创建一个路由，使用 `ToolPage` 并传入定义。`load-tool.ts` 自动发现各目录的 `index.ts`，不在图库导入运行时，也不在模块间导入私有实现。封面统一通过 Astro 优化，由 `ToolCard` 展示，需提供可读替代文本。

`ToolPage` 复用返回入口、标题、说明与 `ToolShell`。Shell 各自管理加载、错误边界、重试和过期请求；模块导入失败、组件渲染或 effect 报错时，只替换当前 Shell，其他实例和导航继续工作。导入失败不会缓存拒绝的 Promise，重试会重新调用加载器。

模块暴露 `activate`、`pause`、`reset`、`dispose`，释放方法应可重复调用。所有监听、音频、定时任务和 observer 必须由模块持有并释放。事件处理函数、异步回调中的异常不由 Svelte 错误边界捕获，模块必须自行处理；语法和构建错误仍应在检查阶段修正。本结构不提供 iframe 级隔离。

验证命令：`pnpm test:other` 覆盖独立加载、失败后重试与无效模块；`pnpm test:stylophone` 覆盖乐器输入。浏览器故障验证需同时放置正常和故障实例，检查重试及导航；不要把故障示例加入生产注册表。
