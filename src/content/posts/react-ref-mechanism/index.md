---
title: 深入理解 React Ref 机制：useRef 与 forwardRef 的协作原理
published: 2026-03-22
description: '在 React 16.8 中，useRef 是新增的特性，用于在函数组件中访问 DOM 元素或可变值。forwardRef 则用于将组件的引用传递给子组件。本文将详细介绍 useRef 和 forwardRef 的协作原理。'
tags: ['React','前端']
category: React
draft: false
---

### 1\. 历史背景：从命令式到声明式的演变

#### 1.1 Class 组件时代：命令式开发

在 React 早期，我们使用 Class 组件，开发模式本质上是命令式的。

什么是命令式？

命令式编程关注"怎么做"——你需要一步步告诉计算机执行什么操作

📝 代码示例（Class 组件 - 命令式）：

```
// 点击按钮，输入框背景变黄、聚焦、并选中所有文字
class OldForm extends React.Component {
  constructor(props) {
    super(props);
    // ═══════════════════════════════════════════════════════════════════
    // 【命令式特点 ①】：必须手动声明变量来“抓住”DOM 元素
    // 就像手里必须拿着一根绳子拴着这个元素，否则找不到它
    // ═══════════════════════════════════════════════════════════════════
    this.inputEl = null;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 【命令式特点 ②】：开发者必须像“指挥官”一样，一步步下达指令
  // 1. 找到元素 -> 2. 改颜色 -> 3. 聚焦 -> 4. 选中文本
  // 顺序不能乱，漏一步都不行
  // ═══════════════════════════════════════════════════════════════════
  handleHighlight = () => {
    // ⚠️ 第一步：手动修改样式属性
    this.inputEl.style.backgroundColor = 'yellow';

    // ⚠️ 第二步：手动调用聚焦方法
    this.inputEl.focus();

    // ⚠️ 第三步：手动调用选中方法
    this.inputEl.select();

    // 💡 痛点：如果 inputEl 为 null，这里直接报错崩溃
    // 开发者需要自己防御性编程 (if (!this.inputEl) return;)
  };

  render() {
    return (
      <div>
        <input
          // ═══════════════════════════════════════════════════════════════════
          // 【命令式特点 ③】：使用回调函数“捕获”DOM
          // 每次渲染都要执行这个函数，把 DOM 元素存到 this.inputEl 里
          // ═══════════════════════════════════════════════════════════════════
          ref={el => this.inputEl = el}
          defaultValue="请高亮我"
        />
        {/* ⚠️ 按钮绑定的不是状态变化，而是一个具体的“动作” */}
        <button onClick={this.handleHighlight}>
          高亮并选中 (命令式)
        </button>
      </div>
    );
  }
}

// ═══════════════════════════════════════════════════════════════════
// 【核心逻辑】：UI = 一系列指令的集合 (Do A, then Do B, then Do C)
// ═══════════════════════════════════════════════════════════════════
```

命令式的特点：

| 特点         | 说明                                                          |
| ------------ | ------------------------------------------------------------- |
| 手动管理 DOM | 开发者需要自己找到元素、修改属性、绑定事件                    |
| 状态同步复杂 | 数据变了要更新 DOM，DOM 变了要更新数据                        |
| 生命周期繁琐 | 需要在 `componentDidMount`、`componentDidUpdate` 中处理副作用 |
| 难以追踪     | 随着代码量增加，谁在什么时候修改了 DOM 很难追踪               |

---

#### 1.2 函数组件时代：声明式开发

随着 React Hooks 的推出，函数组件成为主流，开发模式转向声明式。

什么是声明式？

声明式编程关注"是什么"——你描述界面应该长什么样，React 负责帮你实现。

📝 代码示例（函数组件 - 声明式）：输入框自动聚焦

```
//点击按钮，输入框背景变黄、聚焦、并选中所有文字
import { useRef, useEffect, useState } from 'react';

function ModernForm() {
  const inputRef = useRef(null);

  // ═══════════════════════════════════════════════════════════════════
  // 【声明式特点 ①】：只关心“状态是什么”，不关心“怎么变”
  // 我们定义一个状态 isActive，代表“是否处于高亮模式”
  // ═══════════════════════════════════════════════════════════════════
  const [isActive, setIsActive] = useState(false);

  // ═══════════════════════════════════════════════════════════════════
  // 【声明式特点 ②】：副作用是“响应”状态变化的
  // 逻辑：当 isActive 变为 true 时 -> 自动执行聚焦和选中
  // 开发者不需要告诉 React“什么时候”做，只需定义“什么条件下”做
  // ═══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (isActive) {
      // ✅ 只有当状态改变时，这些命令式操作才会被执行
      inputRef.current?.focus();
      inputRef.current?.select();

      // 可选：执行完后重置状态，或者保持高亮
      // 这里为了演示持续高亮，暂不重置
    }
  }, [isActive]); // ⚠️ 关键：依赖项驱动，状态变 -> 效应动

  const handleClick = () => {
    // ═══════════════════════════════════════════════════════════════════
    // 【声明式特点 ③】：只更新数据，不操作 DOM
    // 点击只是改变了“状态”，具体的变色、聚焦由 React 和 useEffect 协调完成
    // ═══════════════════════════════════════════════════════════════════
    setIsActive(true);
  };

  return (
    <div>
      <input
        ref={inputRef}
        defaultValue="请高亮我"
        // ═══════════════════════════════════════════════════════════════════
        // 【声明式特点 ④】：样式是状态的“映射”
        // 背景色 = isActive ? '黄色' : '默认'
        // 只要状态对了，样式自然就对，不需要手动 style.xxx
        // ═══════════════════════════════════════════════════════════════════
        style={{
          backgroundColor: isActive ? 'yellow' : 'transparent'
        }}
      />
      <button onClick={handleClick}>
        高亮并选中 (声明式)
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// 【核心逻辑】：UI = f(State) (界面是状态的函数)
// State 变了 -> UI 自动重新计算并渲染
// ═══════════════════════════════════════════════════════════════════
```

声明式的优势：

| 优势       | 说明                                  |
| ---------- | ------------------------------------- |
| 代码简洁   | 无需手动操作 DOM，React 自动处理      |
| 可预测性强 | UI 完全由 State 决定，易于调试        |
| 负担低     | 只需关注数据变化，不用想 DOM 更新细节 |
| 性能优化   | React 自动批量更新，减少不必要的重绘  |

---

#### 1.3 为什么要从命令式转变为声明式？

对比维度

| 对比维度 | 命令式 (Class)              | 声明式 (Hooks)     |
| -------- | --------------------------- | ------------------ |
| 代码量   | 多（需写生命周期）          | 少（只需写逻辑）   |
| 状态管理 | 分散（this.state + DOM）    | 集中（useState）   |
| 复用性   | 低（HOC/Render Props 复杂） | 高（Custom Hooks） |
| 学习曲线 | 陡峭（this 绑定、生命周期） | 平缓（函数思维）   |

转变的必要性：

1.  可维护性：大型项目中，命令式代码难以维护
2.  协作效率：声明式代码更易读，团队协作更顺畅
3.  生态发展：Hooks 生态更丰富，社区支持更好

---

### 2\. 声明式的边界：什么是浏览器行为

#### 2.1 声明式的局限性

虽然声明式很优雅，但它无法处理所有场景。

🤔 思考题：

```
// ❌ 这样写没用！
function Input() {
  const [isFocused, setIsFocused] = useState(false);

  // 设置 isFocused = true 并不会让输入框真正聚焦
  // 因为聚焦是浏览器的行为，不是 React 的状态
  return <input autoFocus={isFocused} />;
}
```

#### 2.2 什么是浏览器行为？

浏览器行为指的是那些瞬时的、副作用的、无法通过状态驱动的操作：

浏览器行为

| 浏览器行为           | 说明           | 为什么声明式无法处理   |
| -------------------- | -------------- | ---------------------- |
| `focus()` / `blur()` | 聚焦/失焦      | 这是瞬时动作，不是状态 |
| `scrollIntoView()`   | 滚动到指定位置 | 这是视口行为           |
| `select()`           | 选中文本       | 这是编辑器行为         |
| `play()` / `pause()` | 播放/暂停媒体  | 这是媒体控制行为       |
| Canvas 绘图          | 逐帧绘制       | 这是即时渲染行为       |
| 第三方库集成         | jQuery/D3 等   | 它们直接操作 DOM       |

核心区别：

```
声明式：UI = f(State)  →  描述"界面应该长什么样"
命令式：DOM.action()   →  执行"现在立刻做什么"
```

---

### 3\. useRef：声明式世界里的命令式逃生舱

#### 3.1 useRef 的基本用法

为了解决声明式无法处理浏览器行为的问题，React 提供了 `useRef`。

📝 代码示例（基础用法）：

```
import { useRef, useEffect } from 'react';

function AutoFocusInput() {
  const inputRef = useRef(null);  // ① 创建 ref

  useEffect(() => {
    // ② 在副作用中操作 DOM
    inputRef.current.focus();
  }, []);

  return (
    // ③ 将 ref 绑定到 DOM 元素
    <input ref={inputRef} placeholder="我会自动聚焦" />
  );
}
```

#### 3.2 useRef 的核心特性

特性

| 特性                       | 说明                                     |
| -------------------------- | ---------------------------------------- |
| `ref.current` 指向真实 DOM | 可以调用所有原生 DOM API                 |
| 修改 ref 不触发重渲染      | 与 useState 的最大区别                   |
| 生命周期持久               | 组件重新渲染时，ref 保持引用不变         |
| 可存储任意值               | 不仅是 DOM，也可以是定时器、前一次的值等 |

📝 代码示例（对比 useState 和 useRef）：

```
function Compare() {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  const updateState = () => {
    setCount(count + 1);  // ✅ 触发重渲染
  };

  const updateRef = () => {
    countRef.current = countRef.current + 1;  // ❌ 不触发重渲染
    console.log(countRef.current);  // 但值确实变了
  };

  return (
    <div>
      <p>State: {count}</p>  {/* 会显示最新值 */}
      <p>Ref: {countRef.current}</p>  {/* 不会自动更新显示 */}
    </div>
  );
}
```

#### 3.3 useRef 解决了什么痛点？

痛点

| 痛点                   | 解决方案                        |
| ---------------------- | ------------------------------- |
| 无法操作瞬时浏览器行为 | 通过 `ref.current` 调用 DOM API |
| 需要在渲染间保持可变值 | ref 的值在渲染间持久保存        |
| 需要访问前一次的值     | 用 ref 存储上一轮的值           |
| 需要存储定时器/订阅    | 避免内存泄漏                    |

📝 代码示例（存储定时器）：

```
function TimerComponent() {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      console.log('tick');
    }, 1000);

    // 清理定时器
    return () => clearInterval(timerRef.current);
  }, []);

  return <div>计时中...</div>;
}
```

#### 3.4 useRef 的新痛点

虽然 `useRef` 很好用，但它有一个致命限制：

📝 代码示例（问题演示）：

```
// 子组件：自定义函数组件
function MyInput(props) {
  // ⚠️ 这里收不到 ref！
  return <input {...props} />;
}

// 父组件
function Parent() {
  const inputRef = useRef(null);

  useEffect(() => {
    console.log(inputRef.current);  // ❌ 输出：null
  }, []);

  return <MyInput ref={inputRef} />;  // ref 被"吃掉"了
}
```

为什么会被"吃掉"？

1.  React 设计时，`ref` 和 `key` 一样，是特殊属性
2.  它们不会被放入 `props` 对象中传递给函数组件
3.  这是为了保持函数组件的纯粹性（函数组件没有实例）

---

### 4\. 封装的代价：ref 在组件传递中的困境

#### 4.1 真实开发场景

在实际项目中，我们很少直接在父组件中写原生 `<input>`，而是会：

1.  封装成通用组件 `<MyInput />`
2.  使用 UI 库组件（如 AntD 的 `<Input />`）

📝 代码示例（封装场景）：

```
// --- 子组件：封装的输入框 ---
function MyInput(props) {
  return (
    <div className="input-wrapper">
      <label>用户名：</label>
      <input {...props} />
    </div>
  );
}

// --- 父组件：试图控制子组件 ---
function Form() {
  const inputRef = useRef(null);

  const handleSubmit = () => {
    // ❌ 失败：inputRef.current 是 null
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit}>
      <MyInput ref={inputRef} name="username" />
      <button type="submit">提交</button>
    </form>
  );
}
```

#### 4.2 问题根源分析

```
┌─────────────────────────────────────────────────────────┐
│                      父组件                              │
│   const inputRef = useRef(null)                         │
│   inputRef.current → ??? (null)                         │
│                        ↓                                │
│   <MyInput ref={inputRef} />                            │
│                        ↓                                │
│              ┌───────────────────┐                      │
│              │    子组件 MyInput │                      │
│              │                   │                      │
│              │  function(props)  │                      │
│              │  ⚠️ ref 不进入 props │                   │
│              │                   │                      │
│              │  <input {...props}│                      │
│              │   ref 丢失！       │                     │
│              └───────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

#### 4.3 错误尝试：手动传递 ref

有些人会尝试这样解决：

```
// ❌ 错误做法：把 ref 当作普通 prop 传递
function MyInput({ inputRef, ...props }) {
  return <input {...props} ref={inputRef} />;
}

function Parent() {
  const ref = useRef(null);
  return <MyInput inputRef={ref} />;  // 不推荐！
}
```

为什么不推荐？

1.  命名不统一，容易造成混淆
2.  不符合 React 的设计规范
3.  无法与 React 的 ref 系统正确集成

---

### 5\. forwardRef：打通组件边界的桥梁

#### 5.1 forwardRef 的引入

为了解决 ref 无法传递给函数组件的问题，React 提供了 `forwardRef`。

核心作用：

#### 5.2 基本用法

📝 代码示例（修复封装问题）：

```
import { forwardRef } from 'react';

// --- 子组件：使用 forwardRef ---
const MyInput = forwardRef((props, ref) => {  // ① 接收第二个参数 ref
  return (
    <div className="input-wrapper">
      <label>用户名：</label>
      {/* ② 将 ref 绑定到内部 DOM */}
      <input {...props} ref={ref} />
    </div>
  );
});

// --- 父组件：无需修改 ---
function Form() {
  const inputRef = useRef(null);

  const handleSubmit = () => {
    // ✅ 成功：inputRef.current 指向内部的 <input>
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={handleSubmit}>
      <MyInput ref={inputRef} name="username" />
      <button type="submit">提交</button>
    </form>
  );
}
```

#### 5.3 协作原理图解

```
┌─────────────────────────────────────────────────────────┐
│                      父组件                              │
│   const inputRef = useRef(null)                         │
│   inputRef.current → <input> DOM 节点 ✅                  │
│                        ↓                                │
│   <MyInput ref={inputRef} />                            │
│                        ↓                                │
│              ┌───────────────────┐                      │
│              │  forwardRef 包装   │                      │
│              │   (转发 ref)       │                      │
│              └───────────────────┘                      │
│                        ↓                                │
│              ┌───────────────────┐                      │
│              │    子组件 MyInput   │                      │
│              │                   │                      │
│              │  (props, ref)     │ ← ① ref 作为第二参数  │
│              │                   │                      │
│              │  <input ref={ref} │ ← ② 绑定到内部 DOM    │
│              └───────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

#### 5.4 完整协作流程

表格

| 步骤              | 代码                                | 说明                  |
| ----------------- | ----------------------------------- | --------------------- |
| 1. 父组件创建 ref | `const inputRef = useRef(null)`     | 创建引用容器          |
| 2. 父组件传递 ref | `<MyInput ref={inputRef} />`        | 将 ref 传给子组件     |
| 3. 子组件接收 ref | `forwardRef((props, ref) => {...})` | ref 作为第二参数      |
| 4. 子组件绑定 DOM | `<input ref={ref} />`               | 将 ref 绑定到内部元素 |
| 5. 父组件操作 DOM | `inputRef.current.focus()`          | 成功调用 DOM API      |

---

### 6\. useImperativeHandle：自定义暴露接口的进阶方案

#### 6.1 为什么需要 useImperativeHandle？

使用 `forwardRef` 后，父组件可以拿到子组件内部的 DOM 节点。但这带来了一个新问题：

📝 代码示例（暴露过多的问题）：

```
// 子组件
const MyInput = forwardRef((props, ref) => {
  return <input {...props} ref={ref} />;
});

// 父组件
function Parent() {
  const inputRef = useRef(null);

  const handleClick = () => {
    // ⚠️ 问题：父组件可以访问 input 的所有属性和方法
    inputRef.current.focus();           // 这是预期的
    inputRef.current.value = 'hacked';  // 这也可以！
    inputRef.current.style.color = 'red'; // 这也可以！
    inputRef.current.form.submit();     // 甚至可以访问表单！
  };

  return <MyInput ref={inputRef} />;
}
```

这违背了什么原则？

1.  封装原则：子组件的内部实现不应该完全暴露给父组件
2.  最小权限原则：父组件应该只拥有它需要的能力
3.  接口稳定性：如果子组件内部 DOM 结构变化，父组件代码可能崩溃

#### 6.2 useImperativeHandle 的作用

`useImperativeHandle` 允许子组件自定义暴露给父组件的 ref 值。

核心功能：

不是直接暴露 DOM 节点，而是暴露一个自定义对象，只包含你想要暴露的方法。

#### 6.3 基本用法

📝 代码示例（使用 useImperativeHandle）：

```
import { forwardRef, useImperativeHandle, useRef } from 'react';

// --- 子组件：自定义暴露接口 ---
const MyInput = forwardRef((props, ref) => {
  const inputRef = useRef(null);

  // 自定义暴露给父组件的方法
  useImperativeHandle(ref, () => ({
    // 只暴露 focus 方法
    focus: () => {
      inputRef.current?.focus();
    },
    // 只暴露 select 方法
    select: () => {
      inputRef.current?.select();
    },
    // 只暴露 getValue 方法
    getValue: () => {
      return inputRef.current?.value || '';
    },
    // 只暴露 setValue 方法
    setValue: (value) => {
      if (inputRef.current) {
        inputRef.current.value = value;
      }
    }
  }));

  return <input {...props} ref={inputRef} />;
});

// --- 父组件：只能调用暴露的方法 ---
function Parent() {
  const inputRef = useRef(null);

  const handleClick = () => {
    // ✅ 可以调用暴露的方法
    inputRef.current?.focus();
    inputRef.current?.select();
    const value = inputRef.current?.getValue();

    // ❌ 以下操作会报错（因为不是暴露的方法）
    // inputRef.current.value = 'hacked';  // undefined
    // inputRef.current.style.color = 'red'; // undefined
  };

  return <MyInput ref={inputRef} />;
}
```

#### 6.4 协作原理图解

```
┌─────────────────────────────────────────────────────────┐
│                      父组件                              │
│   const inputRef = useRef(null)                         │
│   inputRef.current → { focus, select, getValue } ✅       │
│                        ↓                                │
│   <MyInput ref={inputRef} />                            │
│                        ↓                                │
│              ┌───────────────────┐                      │
│              │  forwardRef 包装   │                      │
│              └───────────────────┘                      │
│                        ↓                                │
│              ┌───────────────────┐                      │
│              │    子组件 MyInput   │                      │
│              │                   │                      │
│              │  useImperative    │                      │
│              │  Handle(ref, ()=> │                      │
│              │   { focus, ... }) │ ← 自定义返回对象      │
│              │                   │                      │
│              │  const inputRef   │                      │
│              │  = useRef(null)   │ ← 内部真实 DOM 引用   │
│              │                   │                      │
│              │  <input ref={     │                      │
│              │   inputRef} />    │                      │
│              └───────────────────┘                      │
└─────────────────────────────────────────────────────────┘
```

#### 6.5 对比：直接暴露 DOM vs 自定义暴露

对比维度

| 对比维度        | 直接暴露 DOM                    | 自定义暴露 (useImperativeHandle) |
| --------------- | ------------------------------- | -------------------------------- |
| 封装性          | ❌ 差，内部结构完全暴露         | ✅ 好，只暴露必要接口            |
| 安全性          | ❌ 低，父组件可任意修改         | ✅ 高，父组件只能调用指定方法    |
| 灵活性          | ❌ 低，受限于 DOM API           | ✅ 高，可以组合多个操作          |
| 可维护性        | ❌ 低，DOM 结构变化会影响父组件 | ✅ 高，内部实现变化不影响父组件  |
| TypeScript 支持 | ✅ 自动推断 DOM 类型            | ✅ 可自定义接口类型              |

#### 6.6 进阶场景：组合多个内部 ref

有时子组件内部有多个 DOM 节点，我们可以用 `useImperativeHandle` 组合它们：

📝 代码示例（组合多个 ref）：

```
const ComplexInput = forwardRef((props, ref) => {
  const inputRef = useRef(null);
  const labelRef = useRef(null);
  const errorRef = useRef(null);

  useImperativeHandle(ref, () => ({
    // 组合多个内部 ref 的操作
    focus: () => {
      inputRef.current?.focus();
      labelRef.current?.classList.add('focused');
    },
    blur: () => {
      inputRef.current?.blur();
      labelRef.current?.classList.remove('focused');
    },
    showError: (message) => {
      if (errorRef.current) {
        errorRef.current.textContent = message;
        errorRef.current.style.display = 'block';
      }
    },
    hideError: () => {
      if (errorRef.current) {
        errorRef.current.style.display = 'none';
      }
    },
    validate: () => {
      const value = inputRef.current?.value || '';
      if (value.length < 3) {
        this.showError('至少需要 3 个字符');
        return false;
      }
      this.hideError();
      return true;
    }
  }));

  return (
    <div className="complex-input">
      <label ref={labelRef}>{props.label}</label>
      <input {...props} ref={inputRef} />
      <div ref={errorRef} className="error" style={{ display: 'none' }} />
    </div>
  );
});
```

#### 6.7 进阶场景：依赖项优化

`useImperativeHandle` 接受第三个参数 `deps`，用于优化性能：

📝 代码示例（添加依赖项）：

```
const MyInput = forwardRef((props, ref) => {
  const inputRef = useRef(null);
  const [isValid, setIsValid] = useState(true);

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        inputRef.current?.focus();
      },
      // 方法内部可以使用组件的状态
      validate: () => {
        const value = inputRef.current?.value || '';
        const result = value.length >= 3;
        setIsValid(result);  // 可以触发状态更新
        return result;
      },
      // 可以访问 props
      getProps: () => {
        return {
          name: props.name,
          placeholder: props.placeholder
        };
      }
    }),
    [props.name, props.placeholder]  // 依赖项，变化时重新创建方法
  );

  return <input {...props} ref={inputRef} />;
});
```

依赖项的作用：

| 场景               | 是否需要 deps | 说明                       |
| ------------------ | ------------- | -------------------------- |
| 方法内部使用 props | ✅ 需要       | props 变化时需要更新方法   |
| 方法内部使用 state | ✅ 需要       | state 变化时需要更新方法   |
| 方法只操作 DOM     | ❌ 可选       | DOM 引用稳定，可不加       |
| 方法调用其他函数   | ✅ 需要       | 被调用的函数变化时需要更新 |

### 7\. 最佳实践与注意事项

#### 7.1 何时使用 useRef + forwardRef + useImperativeHandle？

场景

推荐方案

说明

自动聚焦输入框

✅ useRef + forwardRef

简单场景，直接暴露 DOM

表单组件库

✅ + useImperativeHandle

需要封装，限制外部访问

集成第三方库

✅ useRef

直接操作 DOM

滚动到指定位置

✅ useRef + forwardRef

需要跨组件控制

表单数据提交

❌ 优先使用受控组件

能用 State 解决的不用 ref

样式变化

❌ 优先使用 className/State

声明式更合适

条件渲染

❌ 优先使用 State

ref 不适合控制渲染逻辑

核心原则：

```
┌────────────────────────────────────────────────────────────┐
│                    Ref 使用决策树                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  需要操作 DOM 吗？                                          │
│       ↓ 是                                                  │
│  是原生 DOM 元素吗？                                        │
│       ↓ 是 → 直接用 useRef                                  │
│       ↓ 否                                                  │
│  是自定义函数组件吗？                                        │
│       ↓ 是 → 用 forwardRef                                  │
│       ↓                                                    │
│  需要限制父组件访问权限吗？                                   │
│       ↓ 是 → 加上 useImperativeHandle                       │
│       ↓ 否 → 直接转发 ref                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 7.2 注意事项

⚠️ 注意 1：forwardRef 会创建新组件

```
const MyComponent = forwardRef(...);
// 需要手动设置 displayName，方便调试
MyComponent.displayName = 'MyComponent';
```

⚠️ 注意 2：ref 不能用在条件渲染中

```
// ❌ 可能导致 ref.current 为 null
{condition && <MyInput ref={inputRef} />}

// ✅ 正确做法
<MyInput ref={inputRef} style={{ display: condition ? 'block' : 'none' }} />
```

⚠️ 注意 3：避免过度使用

```
// ❌ 能用 State 解决的，不要用 ref
function BadExample() {
  const countRef = useRef(0);  // 应该用 useState

  const increment = () => {
    countRef.current++;  // 不会触发重渲染
  };
}

// ✅ 正确做法
function GoodExample() {
  const [count, setCount] = useState(0);

  const increment = () => {
    setCount(count + 1);  // 会触发重渲染
  };
}
```

⚠️ 注意 4：useImperativeHandle 的依赖项

```
// ❌ 忘记加依赖项，方法内部使用过时的 props/state
useImperativeHandle(ref, () => ({
  getValue: () => props.defaultValue  // 可能不是最新值
}));

// ✅ 加上依赖项
useImperativeHandle(ref, () => ({
  getValue: () => props.defaultValue
}), [props.defaultValue]);
```

⚠️ 注意 5：避免循环引用

```
// ❌ 不要在 useImperativeHandle 中调用父组件传入的函数
// 这可能导致循环依赖
useImperativeHandle(ref, () => ({
  submit: () => {
    props.onSubmit();  // 如果 onSubmit 又调用了 ref 的方法，会循环
  }
}));
```

#### 7.3 性能考量

优化点

说明

建议

依赖项精简

只添加真正需要的依赖

避免不必要的重新创建

方法缓存

复杂方法可以用 useCallback 包裹

减少内存分配

避免大对象

不要暴露整个 DOM 对象

只暴露必要方法

懒加载 ref

不常用的 ref 可以延迟创建

减少初始渲染负担

---

### 8\. 总结

#### 8.1 知识回顾

```
┌────────────────────────────────────────────────────────────┐
│                    React Ref 机制演进                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Class 组件 (命令式)                                        │
│       ↓ 转变原因：可维护性、可预测性、性能                    │
│  函数组件 (声明式)                                          │
│       ↓ 局限性：无法处理浏览器行为                           │
│  useRef (命令式逃生舱)                                      │
│       ↓ 困境：ref 无法传递给函数组件                         │
│  forwardRef (组件边界桥梁)                                   │
│       ↓ 问题：暴露过多，破坏封装                             │
│  useImperativeHandle (自定义接口)                            │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 8.2 核心要点

概念

核心作用

使用场景

关键代码

声明式

描述 UI 应该长什么样

90% 的常规渲染场景

`useState`, `useEffect`

命令式

执行瞬时操作

聚焦、滚动、第三方库

`ref.current.action()`

useRef

获取 DOM 引用

需要操作原生 DOM 时

`const ref = useRef(null)`

forwardRef

转发 ref 给子组件

封装组件需要被外部控制时

`forwardRef((props, ref) => {})`

useImperativeHandle

自定义暴露方法

需要限制外部访问权限时

`useImperativeHandle(ref, () => ({...}))`

#### 8.3 三者协作关系

```
┌────────────────────────────────────────────────────────────┐
│                    三者协作关系图                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│   父组件                    子组件                          │
│   ┌──────────┐            ┌──────────────┐                │
│   │ useRef   │ ────────→  │ forwardRef   │                │
│   │ (创建)   │   ref      │ (接收并转发)  │                │
│   └──────────┘            └──────┬───────┘                │
│                                  │                         │
│                                  ↓                         │
│                          ┌──────────────┐                │
│                          │useImperative │                │
│                          │Handle        │                │
│                          │(自定义暴露)   │                │
│                          └──────┬───────┘                │
│                                  │                         │
│                                  ↓                         │
│                          ┌──────────────┐                │
│                          │ 内部 useRef   │                │
│                          │ (真实 DOM)    │                │
│                          └──────────────┘                │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### 8.4 一句话总结

`useRef` 是声明式世界里的命令式逃生舱，`forwardRef` 是打通组件边界的桥梁，`useImperativeHandle` 是保护封装性的守门人。三者协作让我们既能享受声明式的优雅，又能保留对浏览器行为的终极控制权，同时不破坏组件的封装原则。
