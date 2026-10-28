---
title: Monorepo 有意思在哪里？从仓库设计到快速搭建
published: 2026-10-26
description: 从跨仓库改一个功能的麻烦说起，理解 Monorepo 的协作思路、依赖图与模块边界，对比多仓库的收益和代价，最后用 pnpm workspace 跑通最小示例，再按需接入 Turborepo。
tags: ['Monorepo', 'pnpm', 'Turborepo', '工程化', '架构设计']
category: 架构
draft: false
---

假设我们正在维护一个产品：有面向用户的官网，有运营后台，还有两边共用的工具库。

某天要改一个价格展示规则。工具库先改代码、发版本，官网升级依赖，后台再升级一次。三个仓库、几份 PR、几轮 CI，代码可能只改了十几行，协调过程却绕了一大圈。

这时就容易冒出一个想法：能不能把它们放进同一个仓库，让这次修改一起完成？

Monorepo 从这个想法出发，但它有意思的地方，还在于后面的问题：**放在一起以后，怎样既方便协作，又保留各自的边界？**

本文先聊设计，再动手搭建。示例是独立的新项目，不需要把现有单应用强行改成 Monorepo。工具资料核对于 2026 年 10 月 26 日；动手部分固定使用 pnpm 9.14.4，Turborepo 配置采用 2.x 的 `tasks` 格式。

## 1. 先分清：仓库、应用和部署是三件事

Monorepo 是一种代码仓库组织方式：在一个版本控制仓库中，管理多个有关联、具有明确边界的项目或包。

常见结构如下：

```text
product/
├── apps/
│   ├── web/          # 官网，可独立部署
│   └── admin/        # 后台，可独立部署
├── packages/
│   ├── ui/           # 共享组件
│   └── utils/        # 共享工具
└── 工程配置
```

这里的关键是“多个项目”和“明确边界”。一个普通应用有几十个业务目录，也不必因此称它为 Monorepo；反过来，只把几个项目复制到一起，任意跨目录引用，也没有建立起可靠的工程体系。

还有两个容易混淆的概念：

| 问题 | 它决定什么 | 与 Monorepo 的关系 |
| --- | --- | --- |
| 代码放在哪个仓库？ | 版本管理和协作范围 | Monorepo 直接回答的问题 |
| 程序怎样运行？ | 单体、微服务、前后端等运行架构 | 可以有多种选择 |
| 程序怎样发布？ | 独立部署还是联合发布 | 需要另外设计 |

因此，同一个仓库可以有多个微服务，也可以有多个静态站点。一次提交同时修改官网和后台，也不意味着生产环境会同时更新它们。

**代码提交可以原子化，跨服务部署不会因此自动原子化。** 如果线上新旧版本会共存，接口仍要考虑向后兼容、灰度和回滚。

## 2. 和传统多仓库相比，变化发生在哪里？

这里把“传统方式”具体限定为 Multi-repo，也叫 Polyrepo：官网、后台、工具库分别维护在独立仓库中。它是对照方案，并不意味着落后。

| 维度 | Multi-repo：多个仓库 | Monorepo：一个仓库、多个项目 |
| --- | --- | --- |
| 跨项目修改 | 分别提交，通过版本与发布顺序衔接 | 可以在一个 PR 中表达完整修改 |
| 共享代码 | 常通过包仓库发布，再由消费者升级 | 可直接使用本地 workspace 包 |
| 工程规范 | 各仓库维护，可通过模板或配置包统一 | 更容易集中维护和批量升级 |
| 依赖关系 | 常分散在不同仓库和版本中 | 更容易形成完整依赖图 |
| CI | 仓库级隔离自然，但跨仓库联调需额外安排 | 需要按依赖关系控制检查范围 |
| 权限 | 仓库级读写权限容易分开 | 目录审查规则不能替代读取权限隔离 |
| 发布 | 容易各自演进，也可能产生版本协调成本 | 同样可以独立发布，需要配置发布策略 |

两者都能共享代码、统一规范、自动化测试。差别主要是：**把多少协调工作留给仓库之间的版本协议，又把多少工作放到同一个仓库的工具和规则里。**

当团队频繁跨项目改动时，Monorepo 往往更顺手；当项目几乎没有关系、权限要求不同，独立仓库可能更简单。

## 3. 它最有意思的三个地方

### 一次修改，可以表达完整意图

回到价格展示规则的例子。在多仓库中，审查工具库 PR 的人，可能还看不到官网将怎样使用新接口；审查官网时，又要确认对应工具库版本是否已经发布。

在 Monorepo 里，同一份 PR 可以包含：共享函数的新签名、两个应用的调用修改，以及相关测试。审查者看到的是一次完整变化，合并后仓库中的代码也能处于一致状态。

这尤其适合接口重命名、组件 API 调整、类型迁移等工作。但它的前提是检查覆盖消费者。只测试工具库而不检查官网和后台，仍然可能把错误一起合进去。

### 共享代码从“搬运文件”变成“声明依赖”

复制一份 `formatPrice()` 很容易，难的是以后修复问题时，记住还有多少份副本。

Monorepo 可以把它做成真正的包，让应用通过包名使用：

```js
import { formatPrice } from '@demo/utils';
```

应用在自己的 `package.json` 中声明依赖：

```json
{
  "dependencies": {
    "@demo/utils": "workspace:*"
  }
}
```

`workspace:*` 表示必须解析到本地 workspace 包；如果不存在，就应该安装失败，避免意外从远端拿到同名包。具体行为见 [pnpm workspace 文档](https://pnpm.io/workspaces)。

注意，收益来自“包的接口清楚且消费者显式声明依赖”。如果改成 `../../../packages/utils/src/internal.js`，虽然路径能走通，却绕过了公开接口，后面很难安全重构。

### 仓库可以被理解为一张依赖图

假设官网和后台都依赖 `utils`：修改官网，通常不需要重建后台；修改 `utils`，两个消费者就都需要纳入验证。

于是工程工具可以回答两类不同的问题：

- **影响分析**：这次变化可能影响哪些项目？
- **任务缓存**：某个任务的输入没有变化，能否复用以前的结果？

这两件事经常一起出现，但不能混为一谈。选中了某个项目，不代表一定要重新计算；任务命中缓存，也不代表影响分析可以省略。

依赖图还决定构建顺序。如果应用消费的是工具库的 `dist`，必须先生成工具库产物，再构建应用。工具可以并行执行互不依赖的任务，而不是把所有命令无脑同时启动。

这也是 Monorepo 从“文件摆放方式”变成工程设计的地方：**依赖关系既约束代码，也驱动自动化。**

## 4. 优势背后，需要付出什么？

### 共享越容易，越需要控制耦合

看到两个应用都有相似代码，就立刻抽一个共享包，可能会把原本独立的业务绑在一起。几周后它们需求分叉，共享包里开始出现 `isAdmin`、`isWeb` 等条件分支。

更稳妥的做法是：先确认两边共享的是稳定规则，而不只是暂时相似的实现。通用格式化函数通常容易复用，业务流程则应谨慎。

可以先约定几条边界：

- 应用使用共享包，共享包不反向依赖应用。
- 应用之间不直接导入彼此的内部文件。
- 包通过 `exports` 暴露入口，避免深层路径成为隐形 API。
- 禁止循环依赖，并为公共包指定维护者。

`exports` 能限制正常包导入入口，但不能阻止所有相对路径绕行；还需要审查或静态规则。项目较大时，可以参考 [Nx 的模块边界机制](https://nx.dev/docs/features/enforce-module-boundaries)，把约定变成可检查的规则。

### CI 速度需要设计，缓存正确性更需要设计

每次改一行都构建整个仓库，项目越多，等待越长。按依赖图筛选任务、缓存构建结果可以缓解，但不会免费生效。

缓存成立的前提是：工具知道的输入足以决定输出。构建依赖环境变量、根配置或外部内容时，需要把这些输入纳入规则；否则可能复用过时产物。部署、数据库迁移等带外部副作用的任务，也不适合当成普通构建结果来复用。[Turborepo 缓存说明](https://turborepo.dev/docs/crafting-your-repository/caching)

增量 CI 还必须能拿到正确的比较基准与 Git 历史。初次迁移时，先跑完整检查建立可信基线，比一开始就追求最小执行范围更稳妥。

### 统一版本、独立发布，都不是自动得到的

一个锁文件可以记录整个 workspace 的依赖解析，但不意味着所有项目只能使用同一个第三方库版本。版本能否统一，要靠依赖约束和升级策略。

同样，一个仓库也不要求所有包共用版本号。可以统一发版，也可以独立发版。需要对外发布 npm 包时，再引入 Changesets 等版本管理方案；纯内部包先解决本地消费即可。

权限也是实际边界：`CODEOWNERS` 适合要求相关维护者审查，却不是目录保密机制。有严格源码隔离要求时，独立仓库往往更符合需求。

## 5. 什么情况下值得用？

我会优先看“协作是否频繁跨项目”，而不是先数团队有多少人。

| 当前情况 | 更合适的起点 |
| --- | --- |
| 单个博客、单个应用，没有独立共享包 | 保持单包，减少配置 |
| 官网、后台、组件库频繁一起改动 | 可以从 workspace 开始 |
| 多个项目互不相关，只是归同一个人维护 | 不必为了集中存放而合仓 |
| 团队、权限、发布节奏高度独立 | 优先评估多仓库 |
| 项目多、依赖复杂、构建耗时明显 | 在 workspace 之上评估任务图和缓存 |

比如，这个博客当前就是单包项目。仅为了写这篇文章，没有必要把它拆成 `apps/blog` 和一堆只被使用一次的包。架构应当解决已经出现的摩擦。

## 6. 快速搭建：先跑通一个最小 Monorepo

下面在**一个新的空目录**中创建示例，用两个 Node.js 程序模拟官网和后台，共用一个工具包。它们只输出消息，刻意省去框架配置，让本地依赖、构建顺序和运行结果更容易观察。

准备 Node.js 22.12+ 和 pnpm 9.14.4；安装方式见 [pnpm 官方说明](https://pnpm.io/installation)。这里固定版本用于复现，不表示它是最新版本。先确认 `node --version` 和 `pnpm --version`。

### 第一步：建立工作区

```sh
mkdir monorepo-demo
cd monorepo-demo
git init
```

按下面的路径创建目录和文件，Bash、PowerShell 都可以通过编辑器完成：

```text
monorepo-demo/
├── package.json
├── pnpm-workspace.yaml
├── .gitignore
├── scripts/
│   └── build.mjs
├── apps/
│   ├── web/
│   │   ├── package.json
│   │   └── src/index.js
│   └── admin/
│       ├── package.json
│       └── src/index.js
└── packages/
    └── utils/
        ├── package.json
        └── src/index.js
```

根目录的 `package.json`：

```json
{
  "name": "monorepo-demo",
  "private": true,
  "packageManager": "pnpm@9.14.4",
  "scripts": {
    "build": "pnpm -r run build",
    "start:web": "pnpm --filter @demo/web run start",
    "start:admin": "pnpm --filter @demo/admin run start"
  }
}
```

`private: true` 防止误发布根包；`packageManager` 记录团队使用的版本，但仍要让本地和 CI 实际安装或由管理工具选择该版本。

根目录的 `pnpm-workspace.yaml` 声明哪些目录属于工作区：

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

根目录的 `.gitignore`：

```text
node_modules/
dist/
.turbo/
```

### 第二步：创建共享包

`packages/utils/package.json`：

```json
{
  "name": "@demo/utils",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./dist/index.js"
  },
  "scripts": {
    "build": "node ../../scripts/build.mjs"
  }
}
```

`packages/utils/src/index.js`：

```js
export function greeting(name) {
  return `Hello, ${name}!`;
}
```

本例所有包共用 `scripts/build.mjs`，把各自的源码复制到各自的 `dist`：

```js
import { cp, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await cp('src', 'dist', { recursive: true });
```

包脚本在对应包目录执行，因此这里的相对路径以各包为起点。这个脚本只是让示例产生可观察的构建产物，不负责转译、打包或清理已删除源码对应的旧文件。真实项目应替换成框架或库的正式构建命令。

### 第三步：让两个应用声明并消费依赖

`apps/web/package.json`：

```json
{
  "name": "@demo/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node ../../scripts/build.mjs",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@demo/utils": "workspace:*"
  }
}
```

`apps/web/src/index.js`：

```js
import { greeting } from '@demo/utils';

console.log(greeting('web'));
```

`apps/admin/package.json` 使用与 web 相同的配置，只把 `name` 改成 `@demo/admin`。`apps/admin/src/index.js`：

```js
import { greeting } from '@demo/utils';

console.log(greeting('admin'));
```

### 第四步：安装、构建、运行

在示例根目录执行：

```sh
pnpm install
pnpm build
pnpm start:web
pnpm start:admin
```

预期两个应用分别输出 `Hello, web!` 和 `Hello, admin!`。

第一次安装生成的 `pnpm-lock.yaml` 应纳入版本控制；其他人和 CI 在已有锁文件的前提下使用 `pnpm install --frozen-lockfile`。

这里 `pnpm -r run build` 默认按包依赖的拓扑顺序运行，所以 `utils` 先构建，两个应用随后构建。此时不需要发布工具包，也没有额外安装任务编排工具。

可以修改 `greeting()` 后重新构建，再运行两个应用，观察共享规则怎样同时生效。因为本例导出的是 `dist`，只改 `src` 而不重新构建，不会更新运行结果。

## 7. 按需加上 Turborepo

到上一步，一个最小的 Monorepo 已经成立。包和任务变多后，如果需要更细的任务编排与缓存，可以继续接入 Turborepo。

在**示例项目**根目录安装 2.x，并保存实际解析的精确版本；锁文件一起提交，后续按需升级：

```sh
pnpm add -Dw --save-exact turbo@2
```

新增根目录 `turbo.json`：

```json
{
  "$schema": "https://turborepo.com/schema.json",
  "globalDependencies": ["scripts/build.mjs"],
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

然后把根 `package.json` 中的 `build` 改为 `"turbo run build"`，其他脚本保留。

`^build` 让依赖包先完成构建；`outputs` 声明各包需要保存和恢复的产物；`globalDependencies` 把本例共用的根构建脚本纳入输入，脚本改变时使缓存失效。真实项目还需要根据构建方式声明相关配置和环境变量。[任务配置文档](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks)

连续执行两次 `pnpm build`，在输入不变时检查第二次是否命中缓存。然后修改 `utils` 源码，再构建，确认消费者相关任务重新执行。缓存是否正确，要靠这样的验证，不能只看命令变快了。

本例没有持续运行的开发服务器。以后增加 `dev` 任务时，应使用 `cache: false`、`persistent: true`；每个应用仍要提供自己的 `dev` 脚本。需要 watch 的预构建共享包，还要单独安排它们的监听流程。

如果更想直接使用完整框架模板，也可以在另一个新目录中执行官方脚手架命令 `pnpm dlx create-turbo@latest`，按提示选择 pnpm。模板和依赖会随版本变化，生成后先阅读脚本与目录说明。[官方安装入口](https://turborepo.dev/docs/getting-started/installation)

## 8. 从“能跑”到“团队能长期用”

接入真实应用时，建议按下面的顺序补齐能力：

1. **先划边界**：哪些是部署单元，哪些是可复用包，谁维护，各包允许依赖谁。
2. **再补检查**：各包声明自己的类型检查、测试和构建，CI 先执行完整验证。
3. **最后优化**：根据实测等待时间，引入缓存、影响分析和独立部署流水线。

pnpm 本身也能按依赖关系筛选。例如在这个示例中：

```sh
# 选择 web 以及它依赖的包
pnpm --filter "@demo/web..." run build

# 选择 utils 以及依赖它的包
pnpm --filter "...@demo/utils" run build
```

后缀省略号沿依赖方向寻找，前缀省略号寻找消费者；过滤并不是只按目录匹配。[筛选语法文档](https://pnpm.io/filtering)

共享 TypeScript 配置不会自动生成声明文件，也不会让 Node 直接理解所有源码路径；共享组件还需要明确 CSS、框架运行时和 `peerDependencies` 的处理方式。把真正需要共享的东西做成包，把各应用的构建产物、密钥和部署入口分开管理，才能保留独立演进的空间。

我觉得 Monorepo 最吸引人的地方，是让一次跨项目修改变得可见、可检查：你能在一个地方看到规则、消费者和变化的影响。但这个便利能否持续，取决于团队有没有认真维护依赖关系。

如果你已经开始为几个相关项目反复复制代码、同步配置、协调升级，可以先试一个小 workspace。等它解决了真实问题，再逐步增加工具，比一开始就搭一整套复杂平台更容易看清收益。
