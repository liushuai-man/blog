# 执行计划三：可扩展游乐角与口琴玩具

更新：2026-10-14。状态：待实施；旧音乐播放模块已清理。

## 目标与边界

新增独立游乐角，第一件玩具是七声音阶口琴。后续加入节奏、打字或其他小游戏时，通过注册组件接入，不修改全局 Layout，也不把所有玩具打包进首页。

旧 MidiVisualizer 将播放器频谱、钢琴、口琴与全局音乐单例混在同一组件。本次移除该废弃组件；后续若参考其音色参数，从 Git 历史查阅，不恢复全局音乐管理器。

## 第三方组件策略

| 能力 | 优先选型 | 自定义代码边界 |
| --- | --- | --- |
| 合成器、包络、节拍调度 | [Tone.js](https://github.com/Tonejs/Tone.js)（MIT） | 封装 noteOn／noteOff、音量、静音和 dispose，不原生重写音频调度器 |
| 音量／速度滑块、选择器、对话框 | [Bits UI](https://github.com/huntabyte/bits-ui) | 按需导入，皮肤沿用站点变量，验证所选版本支持 Svelte 5 |
| 简谱校验 | [Zod](https://github.com/colinhacks/zod) | 数据 schema 与现有 TS 类型保持一致；按需安装匹配版本 |
| 图标 | 现有 Astro Icon／Iconify | 复用已有依赖，不再安装另一套图标系统 |

简谱第一版采用数字音符列表和现成 UI 容器。只有需要五线谱时才评估专业记谱库，不把 ABC／五线谱引擎误当成数字简谱引擎。口琴外观可采用授权素材，音孔状态和输入映射属于必要的产品适配。

第三方优先不代表叠加多个音频库：统一 Tone.js；采样音色后续可更换 adapter，当前用合成音色，无歌曲音频下载接口。

## 文件组织与组件契约

```text
src/pages/playground/index.astro
src/pages/playground/harmonica.astro
src/components/playground/ToyShell.svelte
src/components/playground/ToyCard.astro
src/features/playground/registry.ts
src/features/playground/types.ts
src/features/playground/harmonica/HarmonicaToy.svelte
src/features/playground/harmonica/audio.ts
src/features/playground/harmonica/input.ts
src/features/playground/harmonica/score.ts
src/features/playground/harmonica/scores.ts
src/config/playgroundConfig.ts
```

Astro 页面只负责布局与元信息；ToyShell 负责加载、帮助、错误、声音控制；玩具内部管理自身资源。注册表仅包含元数据与懒加载函数，不静态导入全部玩具实现。

```ts
interface ToyDefinition {
  id: string;
  title: string;
  description: string;
  route: string;
  enabled: boolean;
  capabilities: Array<'audio' | 'keyboard' | 'pointer'>;
  // 实际实现时用 Svelte Component 类型约束返回模块。
  load: () => Promise<unknown>;
}

interface ToyController {
  activate(): Promise<void>;
  pause(): void;
  reset(): void;
  dispose(): void;
}
```

每个玩具独立配置和存储 key；接口方法可重复调用且安全。共享 Shell 不理解“音符”，音频 adapter 不操作 DOM，输入 adapter 不依赖 Tone.js，简谱数据不含 UI 标记。第一版不做微前端或插件沙箱。

## 口琴交互

- 默认 C 大调，`1–7` 与 `A S D F G H J` 演奏七个自然音。
- 鼠标只在演奏区域内上下移动，选择低／中／高三个八度；区间明确展示，键盘快捷键和按钮提供替代操作。
- 按下开始，松开收音；第一版单音模式。切换八度只影响下一次按下，松开按输入开始时保存的 note id 停音，避免卡音。
- 触屏按音孔演奏，用明确的八度按钮；处理 pointercancel 与 pointer capture。
- 点击“开始演奏”后调用 Tone.start，再允许发声。启动失败显示重试提示，默认不自动播放。
- 正在输入搜索框、textarea、contenteditable、输入法组合输入或按修饰键时不拦截键盘。
- 忽略重复 keydown，失焦、隐藏标签页、切页、取消指针、切换玩具时释放所有声音。
- 简谱跟练有试听、暂停、重来、速度、当前音高亮；试听与自由演奏互斥，暂停同时停止声音和高亮。

## 简谱模型

数据使用结构化 note／rest／duration，而不是解析任意简谱文本起步。

```ts
type ScoreEvent = {
  degree: 1 | 2 | 3 | 4 | 5 | 6 | 7 | null; // null 为休止
  octave: -1 | 0 | 1;
  beats: number;
};
type Score = {
  id: string;
  title: string;
  bpm: number;
  events: ScoreEvent[];
  source: string;
  license: string;
};
```

数据校验限定 beats 为正数、bpm 在合理区间；演奏时间基于 Tone 的时钟，UI 通过其绘制调度同步。第一版准备 3 段原创练习，每段明确长度与节奏；不接未授权流行曲或旧音乐 API。

## 执行阶段

1. **Shell 与注册**：创建目录和两条路由，复用站点导航；实现可配置启停、懒加载和失败提示。
2. **音频 adapter**：验证 Tone.js 启动、口琴音色、释放与销毁，先通过单音试听验证资源边界。
3. **输入 adapter**：接入键盘、鼠标八度、触屏；处理输入框排除、失焦和 Swup 清理。
4. **简谱模式**：Zod 校验数据，加入原创练习、试听与高亮；使用 Bits UI 的基础控件。
5. **扩展验证**：用不含音频的最小演示玩具检验注册与 Shell 接口，不为了验证接口强行发布第二个功能。
6. **发布前检查**：视觉、音频、无障碍与资源检查完成后，再考虑部署。

## 验收

- [ ] 注册一个新玩具只需新增独立目录、元信息和 route，核心布局无修改。
- [ ] 首页和文章页不加载 Tone.js、简谱或玩具组件，不创建 AudioContext。
- [ ] 七音及三个八度映射准确，按住持续，松开收音；切八度无卡音。
- [ ] 搜索／输入法不被抢键盘，滚动页面不改变八度。
- [ ] 鼠标、键盘、触屏均可完成核心演奏；静音与音量控件可聚焦并有标签。
- [ ] 简谱节奏与高亮一致，暂停／重来清除全部调度任务。
- [ ] 往返切页 10 次无残留声音、监听、定时器或累积音频节点。
- [ ] 无音频支持或启动失败时保留简谱阅读和错误提示。
- [ ] `pnpm check`、`pnpm build` 通过；音符映射和 score 校验有针对性的测试。

## 回退

关闭 playgroundConfig 中的玩具入口并保留博客正常访问。音频实现替换只影响 adapter；后续采样素材必须记录来源与许可。避免把错误状态简化成永久“加载中”。
