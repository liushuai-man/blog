# 执行计划二：重写关于页，联动 GitHub 与博客内容

更新：2026-10-14。状态：基础版已实施；后续阶段见下方未完成项。

## 目标与现状

关于页介绍作者的技术实践，不再堆叠侧栏资料、公告和站点统计。使用真实公开数据说明在构建什么、在写什么，并在网络不可用时保持可阅读。

旧页面位于 `src/pages/about.astro`，原正文为 `src/content/spec/about.md`。基础版已改为直接由 aboutConfig、公开文章集合、GitHub 快照驱动；旧关于正文与不再使用的 spec 内容集合已删除。

## 基础版已交付

- 个人介绍、GitHub 与邮件入口；复用现有头像和站点设计变量。
- 公开文章数量、标签数量、分类数量、最新发布时间。
- GitHub 非 Fork、未归档仓库卡片：简介、主语言、Star、Fork；按 Star 降序、推送时间次序排列，默认展示 6 个。
- 基于公开文章标签的词云：同篇重复标签只计算一次，去空值，展示前 32 个主题；点击进入归档标签过滤。
- 最近 4 篇公开文章；按发布时间排列，不让置顶影响“最近”的含义。
- 无 JavaScript 时保留标签链接与文章；词云增强组件进入视口后加载。

## 第三方复用

词云采用 [d3-cloud](https://github.com/jasondavies/d3-cloud)（BSD-3-Clause），已安装 `d3-cloud`、`@types/d3-cloud`。Svelte 组件只是生命周期和链接适配器，不自行实现词云碰撞算法。

页面卡片、头像与布局沿用当前项目组件和 Tailwind 样式。后续图表优先评估 [LayerChart](https://github.com/techniq/layerchart) 的 Svelte 兼容性；确有语言分布、年份趋势等需求才安装。不为当前静态卡片额外引入 React 或完整仪表盘框架。

## 数据管线

文件职责：

| 文件 | 职责 |
| --- | --- |
| `src/config/aboutConfig.ts` | 简介、邮箱、GitHub 用户名、展示数量 |
| `src/data/github-profile.json` | 允许提交的公开字段快照及更新时间 |
| `scripts/sync-github.mjs` | 显式刷新 GitHub 公开数据、分页、超时与失败保护 |
| `src/components/about/TopicCloud.svelte` | d3-cloud 适配、响应式布局、资源释放 |
| `src/pages/about.astro` | 页面组合与文章／标签聚合 |

刷新命令为 `pnpm sync-github`。普通构建读取提交的快照，不请求 GitHub；刷新失败返回非零退出码，旧快照不变。初始空快照显示 GitHub 入口与明确空状态，不显示虚构的 0 Star 数据。

脚本采用 REST `/users/{username}` 和 `/users/{username}/repos`，每页 100 个，最多 10 页；超出上限报错而不是默默显示截断统计。只保存必要公开字段，不保存 Token 或用户隐私信息。

依据 [GitHub 仓库 API](https://docs.github.com/en/rest/repos/repos#list-repositories-for-a-user) 和 [限流说明](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)，未认证请求额度有限；因此不按访客请求，不让构建强制依赖 API。可选 `GITHUB_TOKEN` 仅在脚本环境读取，禁止 PUBLIC 前缀、内联进页面或写入快照。

注意：`publicRepos` 是 GitHub 用户公开仓库总数；卡片集合只含非 Fork、未归档仓库，二者不应混淆。Star、Fork 是仓库计数；不得用它们推算作者影响力或全站访问量。

## 后续执行阶段

1. **基础版验证**：检查快照真值、页面链接、草稿排除和空状态；在 `/blog/` base 下查看深浅主题与移动端。
2. **精选配置**：增加显式精选仓库列表和个人解读；精选优先，自动排序补位，仓库改名／删除时显示可理解的回退。
3. **数据增强**：按仓库主语言聚合，展示“项目主语言分布”；如果采用 languages API，明确按代码字节统计，避免把两种口径混为一谈。
4. **贡献活动（可选）**：贡献热力图需要单独确认数据来源与权限，可评估 GitHub GraphQL 或维护中的开源组件。REST Events 不是完整年度贡献历史，不拿它伪装年热力图。
5. **同步维护（后续）**：可在明确需要后增加 Actions 定期刷新公开快照；设置最小权限、失败不覆盖、无变化不提交。当前未新增计划任务。

不默认加入生日、生活爱好、编造经历、刷屏徽章或来源不明的统计图片。

## 词云后续边界

基础版是“标签主题词云”，不是全文高频词分析。后续如需要全文词云，应先提供单独的数据预处理：中文分词、停用词、去 Markdown／代码／链接、排除草稿和加密文章正文，然后用同一 d3-cloud 组件渲染。

不在浏览器下载全部文章做分词。所有主题都提供文本链接列表；算法放不下的标签仍能在列表中访问。字号限制在可读范围，减少不必要旋转。

## 验收

- [ ] GitHub 项目计数与快照一致；显示数据更新时间、统计口径。
- [ ] API 403、429、超时或断网不会覆盖已有快照，也不阻断普通构建。
- [ ] 空快照、空标签、空文章均有可理解的降级。
- [ ] 草稿不参与公开统计；词云权重可由文章标签复算。
- [ ] 标签链接进入 `/blog/archive/?tag=...`；项目链接直接到真实仓库。
- [ ] 375px、768px、1440px 与深浅主题截图检查通过。
- [ ] 关闭 JS 仍能阅读；键盘可遍历所有主题链接。
- [ ] Swup 进入／退出关于页不遗留 ResizeObserver、d3-cloud 定时任务。
- [ ] `pnpm check`、`pnpm build` 通过；新增依赖及许可记录在 README。

## 基础版验证记录（2026-10-14）

- Astro check：0 errors、0 warnings；原有 SakuraEffect 内联变量产生 1 条 hint，随场景迁移处理。
- 生产构建生成 43 页，Pagefind 索引 34 篇文章。
- GitHub 同步的 2 项测试通过：故障保留旧快照，分页／过滤／排序及空推送日期处理。
- 浏览器检查 375px、768px、1440px 无横向溢出，深浅主题文字可读。
- 桌面词云实际排布 32 个标签；小屏容纳部分标签，全部 32 个主题仍保留在文本列表。
- 点击 JavaScript 标签实际进入 `/blog/archive/?tag=JavaScript` 并展示 5 篇文章。
- 关于页与归档往返 10 次，每次仅 1 个词云 SVG，浏览器无 error／warn。observer 和库布局在组件退出时释放；未进行长期内存性能分析。
