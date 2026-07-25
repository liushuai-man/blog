---
title: 一分钟了解React中的hooks
published: 2026-03-02
description: "在 React 16.8 中，hooks 是新增的特性，用于在函数组件中使用类组件的状态（state）和生命周期能力。"
tags: ["React","前端"]
category: React
draft: false
---

### 一、React Hooks 核心概念

Hooks 是 React 16.8 新增的特性，本质是一系列函数，它的核心目标是：

让函数组件拥有类组件的状态（state）和生命周期能力，无需编写 class；

解决类组件的痛点（比如状态逻辑复用难、生命周期函数混杂多个逻辑、this 指向混乱等）；

让组件逻辑更碎片化、可复用，代码更简洁。

核心原则：Hooks 只能在 React 函数组件 / 自定义 Hooks 中使用，不能在普通 JS 函数、class 组件中使用。

### 二、常用核心 Hooks 详解

##### 1\. useState：管理组件状态

useState 是最基础的 Hooks，用于给函数组件添加可变状态，并提供更新状态的方法。

基本用法

```javascript
import { useState } from 'react';

function Counter() {
  // 语法：const [状态变量, 状态更新函数] = useState(初始值);
  // 初始值可以是任意类型（数字、对象、数组等），仅在组件首次渲染时生效
  const [count, setCount] = useState(0);
  const [user, setUser] = useState({ name: '张三', age: 20 });

  return (
    <div>
      <p>计数：{count}</p>
      {/* 方式1：直接传值更新 */}
      <button onClick={() => setCount(count + 1)}>加1</button>
      {/* 方式2：函数式更新（依赖前一个状态值时推荐） */}
      <button onClick={() => setCount(prevCount => prevCount - 1)}>减1</button>
      
      <p>用户名：{user.name}</p>
      {/* 更新对象/数组时，需返回新的引用（不可直接修改原状态） */}
      <button onClick={() => setUser({ ...user, age: user.age + 1 })}>
        年龄+1
      </button>
    </div>
  );
}
```

关键要点

状态更新是异步的（在合成事件 / 钩子函数中），不能在 setState 后立即获取最新值；

更新对象 / 数组时，必须返回新的引用（比如用扩展运算符 ...），否则 React 检测不到状态变化，不会重新渲染；

初始值可以是函数（惰性初始化），适合初始值计算成本高的场景：

```javascript
// 仅首次渲染时执行一次 expensiveCompute 函数
const [data, setData] = useState(() => expensiveCompute());
```

#####   
2\. useEffect：处理副作用

  
        useEffect 模拟类组件的生命周期（componentDidMount、componentDidUpdate、componentWillUnmount），用于处理副作用（比如请求数据、操作 DOM、订阅事件、修改外部变量等）。  
基本用法

```javascript

import { useState, useEffect } from 'react';

function UserInfo() {
  const [userId, setUserId] = useState(1);
  const [user, setUser] = useState(null);

  // 语法：useEffect(副作用函数, 依赖数组);
  useEffect(() => {
    // 1. 副作用逻辑（组件挂载/更新时执行）
    const fetchUser = async () => {
      const res = await fetch(`https://api.example.com/user/${userId}`);
      const data = await res.json();
      setUser(data);
    };
    fetchUser();

    // 2. 清理函数（组件卸载/下一次副作用执行前执行）
    return () => {
      console.log('清理：取消请求/解绑事件');
      // 比如取消网络请求、清除定时器、解绑事件监听
    };
  }, [userId]); // 依赖数组：仅当 userId 变化时，重新执行副作用

  return (
    <div>
      <input value={userId} onChange={(e) => setUserId(e.target.value)} />
      {user ? <p>姓名：{user.name}</p> : <p>加载中...</p>}
    </div>
  );
}
```

依赖数组的核心规则

| 依赖数组写法 | 执行时机 | 对应类组件生命周期 |
| ------------ | -------- | ------------------ |
| 无依赖数组 | 组件每次渲染后都执行 | componentDidUpdate |
| 空数组 [] | 仅组件挂载时执行一次，卸载时执行清理函数 | componentDidMount + componentWillUnmount |
| 有依赖 [a, b] | 组件挂载时执行，且 a/b 变化时重新执行 | 自定义更新逻辑 |

关键要点

**关键要点**

副作用函数可以是异步函数，但不能直接写 async（因为会返回 Promise，而 useEffect 期望清理函数是普通函数），需在内部定义 async 函数；

清理函数用于避免内存泄漏（比如组件卸载前解绑事件、清除定时器）；

依赖数组必须包含所有在副作用中使用的组件内变量 / 函数（否则会捕获旧值，导致逻辑错误），可通过 ESLint 规则 react-hooks/exhaustive-deps 检查；

不要在 useEffect 中修改状态后，又把该状态加入依赖数组，否则会导致无限循环（除非有条件判断）。

##### 3\. useContext：跨组件共享状态

useContext 用于快速获取 React Context 中的值，替代 Context.Consumer，简化跨组件（多层级）状态共享。

基本用法

```javascript
import { createContext, useContext } from 'react';

// 1. 创建 Context（可设置默认值）
const ThemeContext = createContext({ theme: 'light' });

// 父组件：提供 Context 值
function App() {
  return (
    <ThemeContext.Provider value={{ theme: 'dark', toggle: () => console.log('切换主题') }}>
      <Child />
    </ThemeContext.Provider>
  );
}

// 子组件：消费 Context 值
function Child() {
  // 2. 使用 useContext 获取 Context 值
  const themeCtx = useContext(ThemeContext);
  
  return (
    <div style={{ background: themeCtx.theme === 'dark' ? '#333' : '#fff' }}>
      <button onClick={themeCtx.toggle}>切换主题</button>
    </div>
  );
}
```

关键要点

当 Context.Provider 的 value 变化时，所有使用 useContext 的组件都会重新渲染；

useContext 的参数是 Context 对象本身（不是 Provider/Consumer）；

适合共享 “全局” 状态（如主题、语言、用户信息），但不适合频繁更新的状态（可结合 useReducer 优化）。

##### 4\. useReducer：复杂状态管理

useReducer 是 useState 的替代方案，适合状态逻辑复杂、多个状态关联、状态更新依赖前一个状态的场景，核心思想是 “状态更新逻辑与组件分离”。

基本用法

```javascript
import { useReducer } from 'react';

// 1. 定义 reducer 函数：(旧状态, 动作) => 新状态
function countReducer(state, action) {
  switch (action.type) {
    case 'INCREMENT':
      return { ...state, count: state.count + 1 };
    case 'DECREMENT':
      return { ...state, count: state.count - 1 };
    case 'RESET':
      return { ...state, count: action.payload };
    default:
      return state;
  }
}

function Counter() {
  // 2. 使用 useReducer：const [状态, 分发动作的函数] = useReducer(reducer, 初始状态);
  const [state, dispatch] = useReducer(countReducer, { count: 0 });

  return (
    <div>
      <p>计数：{state.count}</p>
      {/* 3. 分发动作（通过 dispatch 触发状态更新） */}
      <button onClick={() => dispatch({ type: 'INCREMENT' })}>加1</button>
      <button onClick={() => dispatch({ type: 'DECREMENT' })}>减1</button>
      <button onClick={() => dispatch({ type: 'RESET', payload: 0 })}>重置</button>
    </div>
  );
}
```

**关键要点**

reducer 函数是纯函数（无副作用、相同输入必返回相同输出）；

适合状态逻辑复用（可把 reducer 抽离到组件外）；

结合 useContext 可实现 “全局状态管理”（替代 Redux 轻量级方案）。

##### 5\. 其他常用 Hooks

Hook 名称

核心用途

简单示例

`useRef`

1\. 获取 DOM 元素；2. 保存跨渲染周期的可变值（不会触发重新渲染）

`const inputRef = useRef(null);`

`useMemo`

缓存计算结果（避免每次渲染重复计算）

`const total = useMemo(() => a + b, [a, b]);`

`useCallback`

缓存函数引用（避免子组件不必要的重新渲染）

`const handleClick = useCallback(() => {}, [依赖]);`

`useLayoutEffect`

同步执行副作用（在 DOM 更新后、浏览器绘制前执行），适合操作 DOM 布局

用法同 `useEffect`，优先级更高

三、Hooks 使用规则（必须遵守）
------------------

只能在顶层调用：Hooks 不能在循环、条件判断、嵌套函数中调用（React 依赖调用顺序识别 Hooks）；

只能在 React 函数中调用：仅能在函数组件、自定义 Hooks 中使用，不能在普通 JS 函数、class 组件中使用；

自定义 Hooks 必须以 use 开头：比如 useFetch、useTheme，React 靠命名识别 Hooks，确保规则校验生效。

四、自定义 Hooks：复用状态逻辑
------------------

自定义 Hooks 是封装可复用逻辑的函数，本质是多个内置 Hooks 的组合，命名必须以 use 开头。

示例：封装请求数据的自定义 Hook

```javascript
import { useState, useEffect } from 'react';

// 自定义 Hook：复用请求数据的逻辑
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 取消请求的控制器
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(url, { signal });
        if (!res.ok) throw new Error('请求失败');
        const result = await res.json();
        setData(result);
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') { // 排除取消请求的错误
          setError(err.message);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // 清理函数：组件卸载时取消请求
    return () => controller.abort();
  }, [url]);

  // 返回状态和数据，供组件使用
  return { data, loading, error };
}

// 使用自定义 Hook
function UserList() {
  const { data: users, loading, error } = useFetch('https://api.example.com/users');

  if (loading) return <p>加载中...</p>;
  if (error) return <p>错误：{error}</p>;

  return (
    <ul>
      {users.map(user => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

总结
--

**核心 Hooks**：useState 管理基础状态，useEffect 处理副作用，useContext 跨组件共享状态，useReducer 处理复杂状态逻辑；

**使用规则**：Hooks 只能在函数组件 / 自定义 Hooks 的顶层调用，自定义 Hooks 必须以 use 开头；

**核心价值**：Hooks 让函数组件拥有状态和生命周期能力，解决类组件逻辑复用难的问题，让代码更简洁、可维护；

**性能优化**：useMemo/useCallback 缓存计算结果 / 函数引用，useRef 保存跨渲染周期的变量且不触发重渲染。