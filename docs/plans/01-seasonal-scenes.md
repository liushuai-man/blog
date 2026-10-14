# 执行计划一：四季微动画场景

更新：2026-10-14。状态：已完成项目梳理、旧模块清理和场景提示词规范；素材生成与场景实现待实施。

## 目标与项目接入

用同一处固定构图的四季场景替代随机摄影图片。季节控制植物、地表和色调，天气控制光照与粒子。继续保留博客阅读优先的布局，不将正文铺在复杂动画之上。

用户已确定场景与视角：**正对小省城居民区两层小卖部，一楼开放售货窗和门、二楼居住，相邻住宅、白墙内嵌黑铁栏与少量藤蔓，两侧直立茂盛树木、步道砖地，简约画风以形体和构图为重点**。镜头方向垂直于门面，不采用侧视、斜视、俯视或仰视。素材生成与验收统一遵循 [场景规范与提示词](../design/seasonal-scene-prompts.md)，不再使用庭院或窗边书桌方案。先锁定桌面与移动母版，再用参考图编辑派生四季、昼夜及薄霜层；雨雪与飘落效果由开源组件叠加。

现有接入点：

- `src/config/backgroundWallpaper.ts`：当前为 Picsum 随机图片、4 秒轮播、横幅与覆盖模式。
- `src/layouts/MainGridLayout.astro`：背景图片、横幅标题、波浪及内容布局。
- `src/layouts/Layout.astro`：背景相关设置与全局樱花实例。
- `src/components/features/SakuraEffect.astro`：当前独立 Canvas 粒子实现。
- `src/components/controls/DisplaySettings*.svelte`：现有背景和特效设置。
- `src/utils/layout-utils.ts`、`setting-utils.ts`：图片和持久化设置。

项目使用 Astro 6、Svelte 5、Tailwind CSS 4、Swup；部署 base 为 `/blog/`。不可另建 React 应用，也不引入必须常驻的后端。

## 开源组件选型

优先复用库的渲染、粒子、暂停和销毁能力，自定义代码只负责场景配置、状态适配和路由生命周期。

| 用途 | 首选 | 接入决策 |
| --- | --- | --- |
| 樱花、雨、雪、萤火虫、落叶 | [tsParticles](https://github.com/tsparticles/tsparticles) | 首先验证所选版本与 Svelte 5 的兼容性；按需加载 engine 与必要插件，避免 full bundle |
| Svelte 包装 | [官方 Svelte 集成](https://github.com/tsparticles/svelte) | 如包装版本不兼容，薄封装原版 engine，不自行写粒子引擎 |
| 场景内局部循环动画 | [lottie-web](https://github.com/airbnb/lottie-web) | 仅在找到合适的授权动画素材后接入；静态底图加 tsParticles 已满足时不额外安装 |
| 设置选择器 | 现有 DisplaySettings；需要复杂控件再评估 [Bits UI](https://github.com/huntabyte/bits-ui) | 避免为几个按钮引入一整套不同风格 UI |

选型资料核对于 2026-10-14。tsParticles、lottie-web 的代码许可不等于场景素材许可。每份素材记录作者、来源、许可及修改情况；固定构图需要额外准备四季版本，粒子库本身不提供完整小卖部场景。

不采用同时叠加视频、WebGL、Lottie 和多层粒子的大方案。第三方组件优先，但以实际包体、兼容性与效果作为保留依据。

## 交互与状态

```ts
type Season = 'spring' | 'summer' | 'autumn' | 'winter';
type Weather = 'clear' | 'rain' | 'frost' | 'snow';
type ScenePreferences = {
  season: Season | 'auto';
  weather: Weather;
  motion: 'auto' | 'off';
};
```

- 初次使用按 Asia/Shanghai 月份映射季节；这是主题规则，不宣称真实当地天气。
- 天气手动选择，默认晴；第一版不接地理位置或天气 API。
- 霜表现为静态枝叶／窗沿细节，雨雪为天气层；季节和天气组合允许访客自由体验。
- 首次自动季节采用渐进增强：服务端提供静态默认图，客户端依据当前月份更新，防止静态部署停留在构建月份。
- 本地偏好使用版本化 key，损坏或旧值回退默认值。夜间颜色跟随已有深浅主题。
- 动画暂停是独立于季节选择的设置；尊重 `prefers-reduced-motion`。

## 文件和职责

建议新增 `src/components/scenes/SeasonalScene.svelte`、`SceneControls.svelte`、`src/features/scenes/presets.ts`、`src/config/sceneConfig.ts`。底图和获授权动画放在 `public/scenes/`，内部路径通过 `url()` 处理。

单一 Scene 实例接管背景；tsParticles container 与 Lottie animation 按所有权销毁。Swup 的持久背景只初始化一次；替换容器里的控件必须重新绑定且清理旧监听。场景视觉层设为不可交互，控制层保持可聚焦。

## 执行顺序

1. **依赖验证**：锁定 tsParticles 版本，做单一粒子场景试接入，记录增加的 gzip JS 体积、兼容性和许可证。
2. **素材与静态层**：按场景规范生成并验收小卖部桌面／移动母版，参考母版编辑四季与昼夜变体，再准备对应薄霜层和必要粒子纹理。先替换随机图片，建立加载失败的本地静态兜底；不在母版验收前批量生成。
3. **最小版本**：接入春季樱花、冬季雪、晴雨切换和动画开关。首页完整横幅，文章页保持较矮横幅。
4. **补全变化**：夏季萤火虫、秋季落叶、霜细节；控制最大同时活动粒子系统为一个。
5. **迁移收尾**：删除旧随机轮播、旧 SakuraEffect 与被替换的设置／类型／样式；迁移旧偏好，更新 README 和组件说明。

当前旧背景与樱花仍在使用，应在第 5 步替换成功后删除，避免提前破坏现有页面。

## 验收

- [ ] 四季、四种天气均可选择，刷新后保持偏好；文章页文字清晰。
- [ ] 默认背景不请求随机图服务，素材失败仍可阅读。
- [ ] 375px、768px、1440px 与深浅主题无横向溢出。
- [ ] 减少动态效果和手动暂停均呈现静态场景。
- [ ] 页面隐藏或背景离屏后暂停；Swup 往返 10 次无重复 Canvas、实例或监听。
- [ ] 在同设备对比旧版，新增场景首屏 JS gzip 目标不超过 100 KB；达不到时减少插件／动画层并记录实际数值。
- [ ] 移动端降低粒子数量与像素比，操作设置无明显卡顿。
- [ ] `pnpm check`、`pnpm build` 通过；本地预览截图覆盖首页和文章页。

## 风险与回退

素材不足时先交付固定静态四季图加开源天气粒子，不用无关随机图片填充。性能不达标时默认静态图并保留手动启动动画。库升级与素材迭代独立提交，方便回退。
