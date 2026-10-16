# 配置说明

配置集中在本目录，`index.ts` 导出公共配置，类型位于 `src/types/config.ts`。页面特有配置可直接导入。

| 文件 | 用途 |
| --- | --- |
| `siteConfig.ts` | 站点、主题、布局、分页、分享与图片优化 |
| `backgroundWallpaper.ts` | 当前背景、轮播、横幅文字与波浪 |
| `sakuraConfig.ts` | 当前樱花效果，后续由季节场景接管 |
| `profileConfig.ts` | 姓名、头像、签名和 GitHub 链接 |
| `aboutConfig.ts` | 关于页简介、邮箱、GitHub 用户、展示数量和精选仓库／个人解读 |
| `navBarConfig.ts` | 首页、归档、关于、妙妙屋及 Pagefind 搜索 |
| `otherConfig.ts` | 妙妙屋与触笔电子琴开关；无启用工具时隐藏导航 |
| `sidebarConfig.ts` | 阅读相关侧栏配置，目前总开关关闭 |
| `announcementConfig.ts` | 站点公告 |
| `coverImageConfig.ts` | 文章封面 |
| `fontConfig.ts` | 字体 |
| `expressiveCodeConfig.ts` | 代码高亮和折叠 |
| `licenseConfig.ts` | 文章许可显示 |

音乐、友链、赞助、评论和广告配置已清理，不能继续导入旧配置。

修改部署时，同时检查 `astro.config.mjs` 的 base 与站点 URL。aboutConfig 的 GitHub 用户名与快照 username 必须一致；普通构建读取公开快照，不访问 GitHub API。配置中禁止存放 Token。

`featuredRepositories` 的 `name` 是仓库名，按列表顺序优先显示；可选 `note` 由作者填写，留空时只显示公开仓库简介。改名或删除后需更新配置；当前快照找不到的项目会提示并自动补位。语言分布使用完整快照，不受 `maxRepositories` 影响。

季节场景尚未实施；「妙妙屋」及触笔电子琴基础版已接入 `otherConfig.ts`，注册表位于 `src/features/other/registry.ts`。电子琴只提供自由演奏。详见 [三项执行计划](../../docs/plans/) 和 [触笔电子琴计划](../../docs/plans/03-other-stylophone.md)。
