---
title: Vue2-虚拟DOM树和虚拟节点
published: 2025-12-20
description: "在 Vue2 中，虚拟 DOM 树（Virtual DOM）是一种用于优化页面渲染的机制。它通过用真实 DOM 结构真实 DOM 结构，来减少真实 DOM 操作的次数，提升页面渲染性能。"
tags: ["Vue2", "Virtual DOM", "VNode"]
category: Vue2
draft: false
---

虚拟DOM树和虚拟节点

#### 虚拟 DOM 树与虚拟节点（VNode）：核心概念与解析

虚拟 DOM（Virtual DOM）是前端框架（如 Vue、React）的核心机制，本质是用 JavaScript 对象模拟真实 DOM 结构，通过对比虚拟 DOM 的差异（Diff 算法）来最小化真实 DOM 操作，提升页面更新性能。其中，虚拟节点（VNode） 是构成虚拟 DOM 树的基本单元，虚拟 DOM 树则是由多个 VNode 嵌套组成的树形结构。

* * *

### 一、虚拟节点（VNode）：DOM 节点的 “JS 替身”

#### 1\. 定义

虚拟节点是一个普通 JavaScript 对象，包含描述真实 DOM 节点的所有关键信息（标签名、属性、子节点、内容等），是对真实 DOM 的抽象描述。

#### 2\. 核心结构（以 Vue 为例）

一个典型的 VNode 结构如下（简化版）：

```
const vnode = {
  // 核心属性
  tag: 'div',        // 标签名（如div、span，组件则为组件对象）
  props: {           // 节点属性（如class、style、onClick）
    class: 'container',
    style: { color: 'red' }
  },
  children: [        // 子虚拟节点（数组，嵌套VNode）
    { tag: 'p', children: ['Hello Virtual DOM'] }
  ],
  text: null,        // 文本节点内容（与children互斥）
  el: null,          // 对应的真实DOM节点（渲染后赋值）
  key: 'unique-key', // 用于Diff算法的唯一标识
  shapeFlag: 1,      // Vue优化标识（标记节点类型：元素/文本/组件等）
};
```

#### 3. VNode 的类型

| 类型 | 说明 | 示例 |
|------|------|------|
| 元素 VNode | 对应普通 DOM 元素（div/span 等） | `{ tag: 'div', ... }` |
| 文本 VNode | 对应纯文本节点 | `{ text: 'Hello', tag: null }` |
| 组件 VNode | 对应组件实例 | `{ tag: MyComponent, ... }` |
| 注释 VNode | 对应注释节点 | `{ comment: true, text: '注释' }` |
| 空 VNode | 空节点（用于占位 / 删除） | `createEmptyVNode()` |

### 二、虚拟 DOM 树：VNode 的嵌套组合

#### 1\. 定义

虚拟 DOM 树是以根 VNode 为起点，所有子 VNode 嵌套组成的树形结构，完全映射真实 DOM 的层级关系。

#### 2\. 示例：真实 DOM vs 虚拟 DOM 树

##### 真实 DOM 结构

```
<div class="app">
  <h1>虚拟DOM示例</h1>
  <ul>
    <li>节点1</li>
    <li>节点2</li>
  </ul>
</div>
```

##### 对应的虚拟 DOM 树（简化版）

```
const vdomTree = {
  tag: 'div',
  props: { class: 'app' },
  children: [
    { tag: 'h1', children: [{ text: '虚拟DOM示例' }] },
    { 
      tag: 'ul',
      children: [
        { tag: 'li', children: [{ text: '节点1' }] },
        { tag: 'li', children: [{ text: '节点2' }] }
      ]
    }
  ]
};
```

#### 3\. 虚拟 DOM 树的核心特性

轻量：仅保留 DOM 的关键信息，比真实 DOM（包含大量浏览器内置属性）更简洁；

易操作：JS 层面修改虚拟 DOM 树无 DOM 重排 / 重绘，性能开销极低；

跨平台：可将虚拟 DOM 树渲染到不同平台（如浏览器 DOM、小程序、Canvas）。

* * *

### 三、虚拟 DOM 树的核心工作流程

框架中虚拟 DOM 的完整生命周期：

生成：首次渲染时，将模板 / JSX 转换为虚拟 DOM 树；

渲染：将虚拟 DOM 树转换为真实 DOM，挂载到页面；

更新：数据变化时，生成新的虚拟 DOM 树；

对比（Diff）：对比新旧虚拟 DOM 树的差异（只对比同层级节点，降低复杂度）；

打补丁（Patch）：只将差异部分更新到真实 DOM，而非重绘整个页面。

* * *

### 四、关键优势与注意事项

#### 优势

性能优化：减少真实 DOM 操作（DOM 操作是前端性能瓶颈）；

跨平台：虚拟 DOM 与平台无关，可适配浏览器、移动端、SSR 等；

抽象化：开发者无需直接操作 DOM，专注业务逻辑。

#### 注意事项

虚拟 DOM 本身有开销（JS 对象创建、Diff 对比），简单场景下（如静态页面）可能不如直接操作 DOM；

Diff 算法的效率决定虚拟 DOM 的性能（如 Vue/React 的 Diff 都做了分层、key 优化）。

总结
--

简单来说，无论是虚拟DOM树或者虚拟节点，都是前端框架为了模拟真实DOM框架的手段。核心目的都是为了利用JS对象来代替真实的DOM操作

虚拟节点（VNode）：包含了一个DOM节点的一切关键信息，并通过一种特定的结构罗列出来

虚拟树：多个VNode通过嵌套叠加起来的集合