---
title: Vue2 - Dep到底是什么？如何简单快速理解Dep组件
published: 2025-12-27
description: "在 Vue2 中，Dep 组件是响应式系统的核心组件之一，用于收集和通知依赖。本文将详细介绍 Dep 组件的原理和实现。"
tags: ["Vue2", "Dep"]
category: Vue2
draft: false
---

Dep到底是什么？如何简单快速理解Dep组件

一、概念
----

Dep（Dependency，依赖）本质是 \*\*「依赖收集器」\*\*，最常见于 Vue2 的响应式系统中，核心作用是：收集「用到某个数据的视图 / 函数」（即依赖），并在数据变化时通知这些依赖更新。

可以把 Dep 理解成一个「消息通知群」：

数据是「群主」，Dep 是这个群；

用到数据的视图 / 函数是「群成员」；

数据变化时，Dep 会 @全体成员：“数据变了，快更新！”。

二、为什么需要 Dep？
------------

没有 Dep 的话，响应式就会 “盲更新”—— 比如数据变了，不知道该更哪个视图，只能全量刷新，效率极低。Dep 解决的核心问题：精准记录 “谁用到了这个数据”，数据变化时只通知这些 “使用者” 更新。

三、Dep 的核心逻辑（极简版）
----------------

Dep 组件的代码逻辑极其简单，核心就 3 个部分：

```javascript
// 极简版 Dep 实现（Vue2 核心思路）
class Dep {
  constructor() {
    this.subs = []; // 存储所有依赖（订阅者），比如视图更新函数
  }

  // 1. 收集依赖：把用到数据的函数加入订阅列表
  depend() {
    if (Dep.target) { // Dep.target 是当前正在执行的依赖（比如渲染函数）
      this.subs.push(Dep.target);
    }
  }

  // 2. 通知依赖更新：数据变化时，触发所有订阅者执行
  notify() {
    this.subs.forEach(sub => sub.update()); // 逐个调用订阅者的更新方法
  }
}

// 全局变量：标记当前正在收集的依赖（比如 Vue 渲染时的 watcher）
Dep.target = null;
```

四、Dep 如何工作？（3 步极简流程）
--------------------

以 Vue 中 `{{ name }}` 渲染为例：

**收集依赖（depend）：**

渲染页面时，读取 `name` 数据 → 触发 `name` 的 getter → 调用 Dep 的 `depend()` → 把 “页面渲染函数” 加入 Dep 的 subs 列表。

**数据变化（setter）：**

当修改 `name = "新值"` → 触发 `name` 的 setter。

**通知更新（notify）：**

setter 调用 Dep 的 `notify()` → 遍历 subs 列表 → 执行 “页面渲染函数” → 页面更新。

五、关键补充（快速避坑）
------------

1\. Dep 和 Watcher 是一对 CP

渲染页面时，读取 name 数据 → 触发 name 的 getter → 调用 Dep 的 depend() → 把 “页面渲染函数” 加入 Dep 的 subs 列表。

Dep 是 “收集器”，Watcher 是 “订阅者”（比如渲染 watcher、用户自定义 watch）。Dep 收集的其实是 Watcher 实例，

2\. 核心价值是 “**精准**”：

一个数据对应一个 Dep，一个 Dep 可以收集多个 Watcher（比如同一个数据用在多个组件里），数据变化时只通知这些 Watcher，避免无效更新。

总结
--

那么也就是说，Dep是一个中间商，负责实现和Watcher的双向联系，构建data和watcher的桥梁。

之所以需要Dep，是因为，Data被多个watcher依赖；watcher又依赖多个Data。于是乎，为了方便管理这种多对多的复杂关系，就需要Dep将这些信息收集起来进行统一管理

* * *