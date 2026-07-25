---
title: Express + TypeScript 中“没有类型包”的解决方案
published: 2026-04-18
description: '在 Node.js 中，使用 TypeScript 开发时，可能会遇到无类型包报错的问题。本文将介绍 3 种终极解决方案，帮助你解决这个问题。'
tags: ['Node', 'Express', 'TypeScript','后端']
category: Node.js
draft: false
---

## 前言

在使用 Node.js + Express + TypeScript 开发后端项目时，很多人都会遇到一个经典问题：

```
❌ 无法找到模块的声明文件 / implicitly has an 'any' type
```

尤其是在引入一些老库（比如 mysql、express 某些插件）时，这个问题几乎必现。

这篇文章会从原理 → 解决方案 → 更优实践，帮你彻底搞懂这个问题，而不是只会“装个 @types 就完事”。

## 一、问题根源

首先，我们大家都知道TypeScript 所带来的收益是非常大的：

- ✅ 提前发现错误（编译期）
- ✅ 更好的代码提示（IDE 体验提升）
- ✅ 更清晰的代码结构
- ✅ 更适合大型项目维护

TypeScript 凭借静态类型校验补齐了原生 JavaScript 的短板，极大降低 Node 后端服务运行隐患，同时规范业务数据流转，成为后端工程化开发的必备技术。

也就是说，我们在用Node.js 开发时，不可避免的会使用TypeScript 类型系统，那我们也就不可避免的会遇到**无类型包报错的问题**。

那为什么会出现这个问题？

Node.js 诞生早于 TypeScript

Node.js 诞生于 2009 年，而 TypeScript 是 2012 年才推出的。

这意味着：

- Node 生态中的绝大多数库，最初都是用 JavaScript 写的
- 并没有类型系统的概念
- 更没有 .d.ts 类型声明文件

TS 想要识别 JS 代码的类型，必须依赖类型声明文件（.d.ts）—— 这个文件相当于 JS 库的「类型说明书」，告诉 TS 每个函数、参数、返回值是什么类型。

当你引入一个没有 .d.ts 文件的库 / 模块时，TS 无法识别其类型，就会抛出报错。

## 二、解决方案

### 方案一（强烈推荐）：安装官方类型包

```bash
npm i --save-dev @types/mysql

```

这是最标准、最优雅的方案。

最初，开发者在使用 Node.js + TypeScript 时频繁遇到“缺少类型声明”的问题，为了解决这些问题，社区开始为常用库补充类型定义。但随着需求扩大，这种行为

逐渐演变成一个系统性的工程 —— 为整个 JavaScript 生态构建一层类型描述体系（DefinitelyTyped），从而让 TypeScript 能够无缝兼容原有的 JS 世界。

所以，如果你使用的是热门一点的库，一般都有官方的类型包，你可以直接安装即可。

### 方案二：手动声明模块（临时方案）

如果确实找不到类型包：

```ts
// src/types/mysql.d.ts
declare module 'mysql';
```

作用：

告诉 TS：这个模块存在
但类型是 any

** 缺点：**

- ❌ 完全失去类型提示
- ❌ 不安全

** 适用场景：**

- 快速开发
- 临时过渡

### 方案三：自己写类型声明（进阶）

```ts
// src/types/mysql.d.ts
declare module 'mysql' {
  export function createConnection(config: any): any;
}
```

** 优点：**

- 可以逐步补全类型

** 缺点：**

- 成本较高
- 需要熟悉 TS 类型系统

** 适用场景：**

- 公司内部库
- 长期维护项目

### 方案四（不推荐）：关闭类型检查

```json
{
  "compilerOptions": {
    "skipLibCheck": true
  }
}
```

或者：

```ts
// @ts-ignore
```

** 优点：**

- 快速开发
- 临时过渡

** 缺点：**

- ❌ 掩盖错误
- ❌ 后期容易炸

这时候就会有人问了：为什么第三方库”有类型“还是会报类型错误呢？

库“有类型” ≠ 一定不会报类型错误，原因在于：

1. TypeScript 没找到类型文件（最常见）
   即使库里有：

```json
"types": "index.d.ts"
```

但如果你的项目配置有问题，比如：

```json
{
  "compilerOptions": {
    "moduleResolution": "node"
  }
}
```

或者路径解析异常，就可能导致：
👉 TS 根本没加载到这个类型文件

2. ESM / CJS 模块冲突
   现在 Node 生态很混乱：

CommonJS（require）
ES Module（import）

比如你这样写：

```ts
import dayjs from 'dayjs';
```

但库实际导出方式不匹配，就会报错：

👉 has no default export

解决通常是：

```json
{
  "compilerOptions": {
    "esModuleInterop": true
  }
}
```

3. 版本不匹配（很隐蔽）
   比如：

- 你装的是新版本库
- 但类型是旧版本（或缓存问题）

即使是内置类型，也可能：

👉 类型文件和实际代码不一致 4. 类型写得“不完整 / 有 bug”

4. 类型写得“不完整 / 有 bug”

很多库的类型其实是：

👉 “够用就行”，不是完全严谨

典型表现：

- 某些 API 没类型
- 泛型写错
- 推导失败

5. 你的用法超出了类型定义的范围

比如：

```ts
const res = axios.get('/api');
res.xxx; // ❌ 类型里没有这个字段
```

👉 TS 会认为你写错了，但可能你后端确实返回了

这其实是：

**类型定义 ≠ 实际运行结果**

## 三、市场中更好的 Node 开发方式

ok,既然我们已经开始学习Node.js + TypeScript 开发，那么我们就来学习一下更好的开发方式。

1. 使用类型友好的 ORM

不要再用 mysql 这种原始驱动，推荐：

- Prisma（强烈推荐）
- Drizzle ORM
- TypeORM（较老）

优势：

- 自动生成类型
- 数据库结构 = TS 类型
- 开发效率极高 2. 使用更现代的框架

Express 虽然经典，但类型体验一般

推荐：

- NestJS（企业级首选）
- Fastify（性能 + 类型更好）3. API 类型约束（进阶） 

可以进一步做到前后端类型共享

方案：

- tRPC
- OpenAPI + 自动生成类型 4. 更合理的项目结构

建议：

src/
controllers/
services/
models/
types/
utils/

尤其是：单独维护 types/ 目录

## 四、总结

这个问题本质上是：

JavaScript 世界（无类型） 与 TypeScript 世界（强类型） 的冲突

解决思路总结👇：

| 优先级     | 方案           | 推荐度 |
| ---------- | -------------- | ------ |
| ⭐⭐⭐⭐⭐ | 安装 @types    | 必选   |
| ⭐⭐⭐⭐   | 使用自带类型库 | 推荐   |
| ⭐⭐⭐     | 手动声明模块   | 临时   |
| ⭐⭐       | 自己写类型     | 进阶   |
| ⭐         | 忽略错误       | 不推荐 |
