# 配置说明

配置集中在本目录，`index.ts` 导出公共配置，类型位于 `src/types/config.ts`。页面特有配置可直接导入。

| 文件 | 用途 |
| --- | --- |
| `siteConfig.ts` | 站点、主题、布局、分页、分享与图片优化 |
| `backgroundWallpaper.ts` | 当前背景、轮播、横幅文字与波浪 |
| `sakuraConfig.ts` | 当前樱花效果，后续由季节场景接管 |
| `profileConfig.ts` | 姓名、头像、签名和 GitHub 链接 |
| `aboutConfig.ts` | 关于页简介、邮箱、GitHub 用户和展示数量 |
| `navBarConfig.ts` | 首页、归档、关于及 Pagefind 搜索 |
| `sidebarConfig.ts` | 阅读相关侧栏配置，目前总开关关闭 |
| `announcementConfig.ts` | 站点公告 |
| `coverImageConfig.ts` | 文章封面 |
| `fontConfig.ts` | 字体 |
| `expressiveCodeConfig.ts` | 代码高亮和折叠 |
| `licenseConfig.ts` | 文章许可显示 |

音乐、友链、赞助、评论和广告配置已清理，不能继续导入旧配置。

修改部署时，同时检查 `astro.config.mjs` 的 base 与站点 URL。aboutConfig 的 GitHub 用户名与快照 username 必须一致；普通构建读取公开快照，不访问 GitHub API。配置中禁止存放 Token。

季节场景和游乐角尚未实施，对应配置在实施阶段添加。详见 [三项执行计划](../../docs/plans/)。
