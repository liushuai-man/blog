# 音乐「本地库 + 在线 API 并存」方案

版本：v0.0.1（待评审）
范围：`/music/` 页面的音乐数据源扩展。不改动现有本地文件库的任何行为。

---

## 1. 背景

当前音乐库已改造为**纯本地文件库**（`musicConfig.mode: "local"`，构建期扫描 `public/music/`，管理能力包括列表/网格、拖拽排序、隐藏、编辑标题与封面，状态存 localStorage）。

需求：在保留本地库的前提下，**额外支持在线第三方 API 数据源**，两者并存、可切换。

## 2. 结论：咪咕不可用，改用 GD Studio

### 2.1 为什么咪咕不行

| 检查项 | 实测结果 |
| --- | --- |
| 元数据网关 `app.c.nf.migu.cn` | 无 `Access-Control-Allow-Origin` → 浏览器 fetch 被 CORS 拦截 |
| 音频 CDN `freetyst.nf.migu.cn` | 同样无 ACAO → `AnalyserNode` 会输出全 0 静音 |
| 取直链接口 | 旧 `listen-url` 已失效（返回「路由请求不支持」），现行需 `signVersion:V005` 签名 |
| 播放链接 | 有地区限制，多为 VIP |
| 聚合层 | GD Studio 已移除 migu；Meting 不支持 migu；`migu-api-enhanced` 需自托管且播放链接被地区拒绝 |

**要用咪咕必须自建服务端代理并部署在中国大陆出口**（服务端取直链后补 ACAO 回源）。本站是纯静态构建、无服务端运行时，因此不可行。

### 2.2 改用 GD Studio 聚合 API（实测证据，2026-10-12）

`https://music-api.gdstudio.xyz/api.php`

| 接口 | 调用 | 结果 | CORS |
| --- | --- | --- | --- |
| 搜索 | `?types=search&source=netease&name=jay&count=2&pages=1` | 200，返回归一化数组 | `access-control-allow-origin: *` |
| 直链 | `?types=url&source=netease&id=509781655&br=320` | 200，返回 320kbps 直链 | `*` |
| 封面 | `?types=pic&source=netease&id=109951163038292176&size=300` | 200 | `*` |
| 歌词 | `?types=lyric&source=netease&id=509781655` | 200，返回完整 LRC | `*` |
| 歌单 | `?types=playlist&source=netease&id=2619371131` | 200，151 首 | `*` |
| 音频 CDN | `m701/m801.music.126.net/....mp3`（HEAD） | 200，`Content-Type: audio/mpeg` | `Access-Control-Allow-Origin: *` |

**关键点**：元数据与音频两跳都带 ACAO，所以可以保留 `audio.crossOrigin='anonymous'`，频谱分析正常工作（这正是我们之前踩过的坑）。

**已确认的坑**：

1. `source=tencent` 实测 **503**；`joox`、`bilibili` 可用。**默认用 `netease`**。
2. `types=playlist` 返回的是**网易云原始结构**（`playlist.tracks[]`，字段为 `name` / `ar[].name` / `al.picUrl` / `id`），与 `types=search` 的归一化结构不同，需要各自解析。
3. 封面 URL 是 `http://p1.music.126.net/...`，**https 站点必须升级为 https**，否则混合内容被拦。
4. bilibili 的 `pic_id` 是协议相对路径（`//i0.hdslb.com/...`），需补 scheme。
5. 第三方免费服务不稳定（tencent 已挂），必须有失败降级。

## 3. 方案设计

### 3.1 数据源模式

`MusicPlayerConfig.mode` 由 `"local"`（单值）扩展为三值：

| 值 | 行为 |
| --- | --- |
| `"local"` | 只用本地文件库（现状，默认） |
| `"online"` | 只用在线 API 歌单 |
| `"hybrid"` | 音乐页顶部出现「本地 / 在线」数据源切换，默认本地 |

### 3.2 配置结构

```ts
online?: {
  enable: boolean;          // 默认 false，关闭时不发任何网络请求
  provider: "gdstudio";
  endpoint: string;         // 便于 API 失效时整体替换
  source: "netease" | "joox" | "bilibili";
  playlistId?: string;      // 与 keyword 二选一
  keyword?: string;
  count?: number;           // 搜索条数，默认 50
  br?: 128 | 192 | 320;     // 默认 320
};
```

### 3.3 数据流

1. 构建期：`scanMusicLibrary()` 照旧产出本地曲目（不变）。
2. 运行时：切到「在线」时才请求 —— 先 `types=playlist`（或 `types=search`）拿列表并立即渲染，再并发 4~6 逐首 `types=url` 补直链、`types=lyric` 补歌词。列表先出、直链后补，避免白屏等 150 次请求。
3. 归一化为与本地一致的 track 形状（`id / name / artist / url / pic / lrc`），`id` 加前缀 `online:<source>:<id>` 避免与本地文件名冲突。
4. 提交给已有的播放内核：`window.__fireflyMusic.setPlaylist(tracks)`，走现成的 `fm:playlist` 广播同步侧栏/导航栏播放器。**播放内核无需改动。**

### 3.4 UI

- 音乐页顶部（音乐库卡片内）新增数据源切换，仅在 `hybrid` 下显示。
- 在线列表：列表/网格视图复用现有样式；**只读** —— 不提供拖拽排序/隐藏/编辑（排序与隐藏是本地库的 localStorage 语义，套到在线歌单上没有意义）。
- 状态：加载中 / 加载失败（含「重试」）/ 空歌单。

### 3.5 降级

在线请求失败 → 卡片内显示错误与重试按钮，并**自动切回本地数据源**，不白屏、不阻塞本地库。

## 4. 待确认的决策

| # | 决策 | 我的建议 |
| --- | --- | --- |
| 1 | 在线歌单来源：固定**歌单 ID** 还是**在线搜索** | 先做歌单 ID（一个配置项即可长期使用），搜索留二期 |
| 2 | 是否要「把在线歌曲加入我的歌单」 | 二期做；一期在线列表只读 |
| 3 | `mode` 默认值 | 保持 `"local"`，`online.enable: false`，你确认可用后再打开 |

## 5. 影响文件

| 文件 | 变更 |
| --- | --- |
| `src/types/config.ts` | `MusicPlayerConfig.mode` 扩为三值；新增 `online` 块 |
| `src/config/musicConfig.ts` | 新增 `online` 默认配置 |
| `src/utils/music-online.ts`（新） | 客户端 fetch 封装：search / playlist / url / pic / lyric + 归一化 + url 修正 |
| `src/utils/music-library.ts` | 复用同一 track 类型；导出给在线模块使用 |
| `src/components/features/MusicLibrary.svelte` | 数据源切换、在线只读列表、加载/失败态 |
| `src/pages/music.astro` | 把可序列化的 online 配置传给组件 |
| `src/i18n/i18nKey.ts` + 5 个语言文件 | 新增约 8 个 key（在线、加载中、加载失败、重试、空歌单等） |

不改动：`MusicManager.astro`、`MusicPlayer.astro`、`global.d.ts`（`setPlaylist` 已具备）。

## 6. 分阶段与产出物

| 阶段 | 产出物 |
| --- | --- |
| P1 | `mode: "hybrid"` 数据源切换 + 在线歌单（固定 ID）只读列表 + 播放 + 加载/失败/重试态 |
| P2 | 在线搜索（关键词 → 结果 → 试听） |
| P3 | 在线曲目「加入我的歌单」（建议存 localStorage 收藏层，不写仓库） |

## 7. 验收标准

- 切到「在线」后能列出歌单曲目，封面与歌词正确，点击能出声。
- **频谱分析非 0**（`ensureAnalyser()` 取 analyser，`getByteFrequencyData` 的 sum/max 不为 0）。
- API 挂掉时显示错误并可重试，且自动退回本地库，页面不白屏。
- 本地库现有功能（拖拽排序、隐藏/恢复、编辑标题与封面、localStorage 持久化）回归无影响。
- `astro check` 0 errors。

## 8. 风险

| 风险 | 应对 |
| --- | --- |
| 第三方 API 随时失效或加签名 | `endpoint` 与 `source` 配置化，替换成本 = 改一行配置 |
| 网易云 VIP 曲目直链可能为空 | 归一化时跳过并在列表标注不可播放 |
| 请求量（每首一次 url 请求） | 列表先渲染、直链并发限流后补 |
| 版权/合规 | 仅供个人站点自用，不对外提供下载 |