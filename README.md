# 刘帅的个人博客

记录技术学习、项目实践与 AI Agent 探索的个人网站，基于开源主题 Firefly／Fuwari 定制。

[访问博客](https://liushuai-man.github.io/blog/) · [GitHub](https://github.com/liushuai-man) · [Agent 协作约束](AGENTS.md)

## 技术与部署

| 项目 | 当前实现 |
| --- | --- |
| 页面与内容 | Astro 6.0.8、Markdown／MDX、TypeScript |
| 交互 | Svelte 5、Swup 页面切换 |
| 样式 | Tailwind CSS 4、主题 CSS 变量 |
| 搜索 | Pagefind 构建期索引与站内搜索 |
| 文章增强 | Expressive Code、KaTeX、Mermaid、图片查看与分享海报 |
| 关于页 | GitHub 公开数据快照、d3-cloud 标签词云 |
| 托管 | GitHub Pages，静态输出 `dist/`，base 为 `/blog/` |

网站没有常驻服务端。GitHub 关于页的数据显式同步到本地快照，普通构建与访客浏览不请求 GitHub API。

## 本地开发

需要 Node.js **22.12 或以上**，使用 `package.json` 声明的 **pnpm 9.14.4**；建议通过已有 Node／pnpm 管理工具安装匹配版本。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

开发页通常为 `http://localhost:4321/blog/`，以终端实际端口为准。站内路径通过 `src/utils/url-utils.ts` 处理，修改部署目录时同步检查 `astro.config.mjs` 的 `base` 和 `src/config/siteConfig.ts` 的站点 URL。

```sh
pnpm check
pnpm build
pnpm preview
```

构建依次生成图标、构建 Astro 静态页、生成 Pagefind 索引。开发模式下没有完整生产搜索索引，搜索验收请使用构建后的预览。

| 命令 | 用途 |
| --- | --- |
| `pnpm dev` | 启动开发服务 |
| `pnpm check` | Astro／Svelte／TypeScript 诊断 |
| `pnpm build` | 图标 + 静态页面 + 搜索索引 |
| `pnpm preview` | 预览生产输出 |
| `pnpm new-post my-post` | 创建文章 Markdown 文件 |
| `pnpm sync-github` | 更新关于页 GitHub 公开数据快照 |
| `pnpm test:sync-github` | 验证 GitHub 同步失败保护与分页统计 |
| `pnpm icons` | 重新生成图标数据 |
| `pnpm format` / `pnpm lint` | 会写入 `src/`，使用前检查修改范围 |

## 内容与配置

文章位于 `src/content/posts/`，支持独立 Markdown 文件及 `文章目录/index.md`。新文章示例：

```yaml
---
title: 一次技术探索
published: 2026-10-14
description: 记录实现过程与思考
tags: [Astro, TypeScript]
category: 前端
draft: false
---
```

字段定义见 `src/content.config.ts`。生产文章列表排除草稿；关于页始终只统计公开文章。

主要配置：

- `src/config/siteConfig.ts`：站点信息、主题、布局、分页、图片优化。
- `src/config/backgroundWallpaper.ts` / `sakuraConfig.ts`：当前背景与樱花；季节场景接入前继续使用。
- `src/config/profileConfig.ts` / `aboutConfig.ts`：姓名、头像、介绍、联系入口和展示数量。
- `src/config/navBarConfig.ts`：首页、归档、关于导航。
- `src/config/sidebarConfig.ts`：阅读相关布局组件，当前关闭侧栏。

[配置说明](src/config/README.md) · [组件说明](src/components/README.md)

## GitHub 关于页

运行 `pnpm sync-github` 后，脚本分页读取公开用户资料与仓库，保存到 `src/data/github-profile.json`。快照可以提交，刷新失败保留旧数据。

默认展示非 Fork、未归档的项目，按 Star 和推送时间排序；公开仓库总数包含 Fork，所以与卡片数量不同。页面显示快照日期，不宣称实时更新。

如果需要认证额度，仅给同步脚本设置环境变量 `GITHUB_TOKEN`。不要将 Token 写入配置、添加 PUBLIC 前缀、上传快照或提交 `.env`。修改 GitHub 用户时同时更新 `aboutConfig.ts` 和快照中的 username，再运行同步。

词云采用 [d3-cloud](https://github.com/jasondavies/d3-cloud)（BSD-3-Clause），按公开文章的标签频次排布，提供可点击的归档入口与无 JavaScript 的文本列表。

## 项目目录

```text
src/pages/                 页面与静态输出接口
src/layouts/               全站布局与 Swup 接入
src/components/            通用、阅读、关于页和设置组件
src/config/                模块化配置
src/content/posts/         博客文章与配图
src/data/                  可提交的公开数据快照
src/styles/                主题与内容样式
src/utils/                 内容、路径、布局工具
src/plugins/               Markdown 渲染插件
scripts/                   文章、图标与 GitHub 数据脚本
public/                    静态素材
docs/plans/                三项优化执行计划
guide/                     上游文章写作语法参考（非生产内容）
```

## 优化路线

1. [四季微动画场景](docs/plans/01-seasonal-scenes.md)：优先 tsParticles，合适素材可采用 Lottie；待实施。
2. [GitHub 与博客关于页](docs/plans/02-about-github.md)：基础版已重写；精选配置和更多数据展示可继续迭代。
3. [可扩展游乐角与口琴](docs/plans/03-playground-harmonica.md)：优先 Tone.js 与 Svelte 组件库，注册、输入、音频、简谱分层；待实施。

计划中的库不等于已安装依赖。当前新接入的是 d3-cloud；场景、口琴及其依赖将在对应实施阶段接入。

场景固定为小省城居民区两层小卖部、一楼开放售货窗口与门、二楼住宅、高白墙黑铁栏和藤蔓、两侧古树与步道砖地，素材生成统一使用 [场景规范与提示词](docs/design/seasonal-scene-prompts.md)。母版、季节与昼夜变体、透明霜层和粒子纹理都有生成顺序、命名与验收约束；已有预览候选图，尚未锁定母版或接入运行时。

## 清理与维护

已移除不再沿用的音乐播放器／音乐库／频谱组件、友链、赞助、留言板、广告、日历、评论服务、访客分析和自定义页脚 HTML 注入，以及旧音乐 API 方案和过时的模板多语言 README。相关入口、类型、翻译与引用同步清理；已被集成设置面板替代的旧控件和未使用的直接依赖也已删除。

博客阅读、搜索、归档、RSS、图片、目录和分享保留。正在使用的背景、樱花与显示设置在新场景替换成功后再迁移。写作语法参考保留在 `guide/`；根 README 是本项目实际功能的说明入口。

现有 GitHub Actions 在 `main` 分支推送时构建并发布 `dist/` 到 `gh-pages`。本地提交不会自动发布，只有推送触发工作流；检查仓库 Pages 设置使用正确发布分支。

## 来源与许可证

上游：[Firefly](https://github.com/CuteLeaf/Firefly)、[Fuwari](https://github.com/saicaca/fuwari)。保留 [MIT LICENSE](LICENSE) 中的上游版权声明。

第三方组件、字体、素材和文章的授权分别遵循各自许可；新素材需记录来源。禁止把代码库的开源许可当作音乐／图片素材的授权。
