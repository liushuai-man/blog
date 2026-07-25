---
title: Node.js 的高并发处理
published: 2026-07-12
description: 'Node.js 是单线程的，那么他是如何实现高并发异步处理？本文将介绍 Node.js 高并发处理的基本原理，以及如何在 Node.js 中使用高并发处理。'
tags: ['Node.js', '高并发']
category: 后端
draft: false
---

备注：最近在复习Node.js，里面的事件循环、非阻塞I/O等概念，还是非常重要的，我认为有必要写一篇关于高并发异步处理的文章。

# 前言
Node.js 是单线程的，这意味着它同一时间只能执行一段代码。但在 Web 应用中，服务器需要同时处理成千上万的用户请求。如果使用同步阻塞的方式，一个请求在等待数据库查询时，其他请求只能排队，服务器就会变得非常慢。

**Node.js 的解决方案是：通过异步非阻塞 I/O 来实现高并发**。当遇到 I/O 操作（读写文件、查询数据库、网络请求等）时，主线程不会傻等结果，而是继续处理下一个请求。等 I/O 完成后，再通过回调函数通知主线程。

这就是为什么 Node.js 虽然是单线程，却能轻松处理大量并发请求的原因。


## 同步 vs 异步对比

```javascript
// 同步方式：处理 3 个文件，串行执行
// 总耗时 = 文件1耗时 + 文件2耗时 + 文件3耗时
readFileSync('file1')  // 100ms
readFileSync('file2')  // 100ms
readFileSync('file3')  // 100ms
// 总耗时 ≈ 300ms

// 异步方式：处理 3 个文件，并行执行
// 总耗时 = max(文件1耗时, 文件2耗时, 文件3耗时)
readFile('file1', callback)  // 100ms ─┐
readFile('file2', callback)  // 100ms ─┼→ 并行执行
readFile('file3', callback)  // 100ms ─┘
// 总耗时 ≈ 100ms
```

**异步的优势：** 让 I/O 操作在后台进行，主线程继续处理其他请求，大大提高吞吐量。



# 核心概念

Node.js 能够实现高并发，主要依赖三个核心机制：**非阻塞 I/O**、**事件循环** 和 **线程池**。

## 非阻塞 I/O

### 什么是 I/O？

I/O（Input/Output）即输入/输出操作，是程序与外部世界交互的方式。常见的 I/O 操作包括：

- **文件 I/O**：读写文件
- **网络 I/O**：HTTP 请求、数据库查询
- **标准 I/O**：控制台输入输出

### 三种 I/O 模型详解

#### 1. 阻塞 I/O（Blocking I/O）

**工作原理：** 当线程发起 I/O 请求后，会**一直等待**直到操作完成，期间不能做任何其他事情。

```
请求发起 → 等待数据 → 数据就绪 → 复制数据 → 返回结果
             ↑
         线程被阻塞，什么都不能做
```

**特点：**
- 实现简单，代码直观
- 线程利用率低，等待时间浪费严重
- 适合并发量小的场景

**代表技术：** Java 传统 BIO、同步文件读写

#### 2. 非阻塞 I/O（Non-blocking I/O）

**工作原理：** 当线程发起 I/O 请求后，**立即返回**一个状态，需要**不断轮询**（反复检查）来确认数据是否就绪。

```
请求发起 → 立即返回（可能没有数据）→ 轮询检查 → 数据就绪 → 返回结果
             ↑                              ↑
         线程不阻塞                   不断检查浪费CPU
```

**特点：**
- 线程不会被阻塞，可以做其他事情
- 但需要不断轮询，会浪费 CPU 资源
- 实际中很少单独使用

#### 3. I/O 多路复用（I/O Multiplexing）—— Node.js 的选择

**工作原理：** 通过事件通知机制（epoll/kqueue/IOCP），**一次性监听多个 I/O**，当某个 I/O 就绪时，通过事件回调通知。

```
请求发起 → 注册到事件通知机制 → 等待通知 → 数据就绪时回调执行
                                     ↑
                            只在数据就绪时才处理
```

**特点：**
- 不阻塞、不轮询，效率最高
- 事件驱动，异步回调机制
- 适合高并发场景

**代表技术：** Node.js（libuv）、Nginx、Redis

### 三种模型对比表

| 模型 | 线程状态 | CPU 利用率 | 编程复杂度 | 适用场景 |
|------|----------|------------|------------|----------|
| 阻塞 I/O | 等待中 | 低 | 简单 | 并发量小 |
| 非阻塞 I/O | 轮询中 | 中（轮询浪费） | 较复杂 | 很少单独使用 |
| I/O 多路复用 | 事件驱动 | 高 | 中等 | 高并发服务 |

### Node.js 的 I/O 架构

Node.js 结合了**单线程**和 **I/O 多路复用**：

```
┌─────────────────────────────────────────┐
│              Node.js 应用               │
│         (JavaScript 单线程)              │
├─────────────────────────────────────────┤
│              事件循环 (libuv)            │
├──────┬──────┬──────┬──────┬─────────────┤
│ 线程1│ 线程2│ 线程3│ 线程4│   ...       │  ← libuv 线程池
│ 文件IO│ DNS │ 文件IO│ 加密 │             │
└──────┴──────┴──────┴──────┴─────────────┘
```

- **JavaScript 单线程**：执行用户代码，避免锁竞争
- **事件循环（libuv）**：调度回调，协调 I/O
- **系统内核**：使用 epoll（Linux）/ kqueue（macOS）/ IOCP（Windows）实现 I/O 多路复用

### 阻塞 vs 非阻塞代码示例

```javascript
// 阻塞 I/O（同步读取文件）
const fs = require('fs');

console.log('开始读取文件...');
const data = fs.readFileSync('./large-file.txt', 'utf-8');  // 阻塞！
console.log('文件读取完成');
console.log('继续执行其他任务');  // 必须等文件读完才能执行
```

```javascript
// 非阻塞 I/O（异步读取文件）
const fs = require('fs');

console.log('开始读取文件...');
fs.readFile('./large-file.txt', 'utf-8', (err, data) => {
  // 文件读取完成后才执行这个回调
  console.log('文件读取完成');
});
console.log('继续执行其他任务');  // 不用等待文件读取，立即执行
```

**执行流程对比：**

```
同步（阻塞）：
  读取文件 ──────等待──────→ 完成 → 继续执行
                ↑
           线程被阻塞

异步（非阻塞）：
  读取文件 → 注册回调 → 继续执行其他任务
                ↓
           I/O 完成后执行回调
```

## 事件循环

### 什么是事件循环？

事件循环是 Node.js 处理异步操作的核心机制。

用一句话解释：**Node.js 用一个"while 循环"不断地去各个队列里取回调来执行**。这个循环不会停，直到没有任何待处理的事情了，程序才会退出。

### 先理解两个关键概念

1. **同步代码**：写在函数体里的普通代码，从上到下依次执行，遇到就执行
2. **异步回调**：写在回调函数里的代码（如 `setTimeout` 的回调、`fs.readFile` 的回调），它们**不是立刻执行的**，而是被放到了一个"待办队列"中，等事件循环轮到它时才执行

```javascript
// 同步代码：立刻执行
console.log('A');

// 异步回调：不会立刻执行，而是被注册（放到队列中），等事件循环来执行
setTimeout(() => {
  console.log('B');
}, 0);

// 又是同步代码：立刻执行
console.log('C');

// 输出顺序：A → C → B
// 为什么 B 在 C 之后？因为 B 的回调要等事件循环轮到 timers 阶段才会执行
```

### "循环"到底在哪里？

Node.js 启动后，底层会执行一个类似这样的伪代码：

```
while (还有待处理的事情) {
    // 第1轮循环：依次检查6个阶段
    ① timers阶段      → 有没有到期的定时器回调？有就执行
    ② pending阶段     → 有没有系统级回调？有就执行
    ③ idle/prepare阶段 → Node.js内部用，跳过
    ④ poll阶段        → 有没有IO完成的回调？有就执行
    ⑤ check阶段       → 有没有setImmediate回调？有就执行
    ⑥ close阶段       → 有没有关闭事件回调？有就执行

    // 第2轮循环：再来一遍
    ① timers → ② pending → ③ idle → ④ poll → ⑤ check → ⑥ close

    // ...... 不断循环，直到没有待处理的事情

    // 如果第4轮循环发现：没有定时器、没有IO、没有任何回调
    // → 程序退出
}
```

### 6 个阶段详解

```
   ┌───────────────────────────┐
┌─>│  ① timers（定时器）         │  执行 setTimeout、setInterval 的回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │  ② pending callbacks      │  执行系统级回调（如 TCP 错误）
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │  ③ idle, prepare          │  Node.js 内部使用，开发者跳过
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │  ④ poll（轮询）★核心       │  执行所有 IO 回调（文件、网络、数据库...）
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │  ⑤ check（检查）           │  执行 setImmediate 的回调
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │  ⑥ close callbacks        │  执行关闭事件（如 socket.on('close')）
│  └─────────────┬─────────────┘
│                │
└────────────────┘  → 回到 ① timers，开始下一轮循环
```

| 阶段 | 功能 | 说明 |
|------|------|------|
| ① timers | 定时器 | 执行 `setTimeout`、`setInterval` 的回调 |
| ② pending | 待定回调 | 执行被推迟的系统级回调（如 TCP 错误） |
| ③ idle/prepare | 内部使用 | 开发者可以忽略 |
| ④ poll | 轮询 | **最核心阶段**，执行所有 I/O 回调 |
| ⑤ check | 检查 | 执行 `setImmediate` 的回调 |
| ⑥ close | 关闭回调 | 执行 `socket.on('close')` 等 |

### 微任务队列：优先级最高的"插队者"

除了 6 个阶段，还有两种回调可以**插队**：

```
阶段①执行完毕
  → 立刻检查：有没有 process.nextTick 回调？有就全部执行完
  → 立刻检查：有没有 Promise 回调？有就全部执行完
  → 进入阶段②
```

优先级排序：`process.nextTick` > `Promise.then` > 6 个阶段中所有回调

### 一个具体例子走一遍完整流程

```javascript
const fs = require('fs');

console.log('1. 同步代码');

setTimeout(() => {
  console.log('2. setTimeout 回调');
}, 0);

fs.readFile(__filename, () => {
  console.log('3. readFile 回调');
});

setImmediate(() => {
  console.log('4. setImmediate 回调');
});

Promise.resolve().then(() => {
  console.log('5. Promise 回调');
});

process.nextTick(() => {
  console.log('6. nextTick 回调');
});

console.log('7. 同步代码');
```

**执行顺序：**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 【第0步】执行所有同步代码（不属于事件循环）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  console.log('1. 同步代码')     → 输出：1. 同步代码
  setTimeout(...)               → 把回调注册到 timers 队列
  fs.readFile(...)              → 把任务交给线程池去读文件
  setImmediate(...)             → 把回调注册到 check 队列
  Promise.resolve().then(...)   → 把回调放到 Promise 微任务队列
  process.nextTick(...)         → 把回调放到 nextTick 微任务队列
  console.log('7. 同步代码')     → 输出：7. 同步代码

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 【第1步】执行微任务（在进入事件循环第1轮之前）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ① 执行 nextTick 队列 → 输出：6. nextTick 回调
  ② 执行 Promise 队列  → 输出：5. Promise 回调

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 【第2步】事件循环 第1轮 —— 阶段① timers
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  执行 setTimeout 回调 → 输出：2. setTimeout 回调

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 【后续阶段】...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  阶段④ poll：执行 readFile 回调 → 输出：3. readFile 回调
  阶段⑤ check：执行 setImmediate 回调 → 输出：4. setImmediate 回调
```

最终输出：
```
1. 同步代码
7. 同步代码
6. nextTick 回调
5. Promise 回调
2. setTimeout 回调
3. readFile 回调
4. setImmediate 回调
```

## 线程池

### 为什么需要线程池？

Node.js 的 JavaScript 执行是单线程的，但有些操作**不适合用事件循环来处理**，比如：

- **文件 I/O**：操作系统没有完善的异步文件读写机制
- **DNS 查询**：需要阻塞等待域名解析
- **加密操作**：如 `crypto.pbkdf2()` 需要大量计算
- **压缩操作**：如 `zlib.gzip()` 需要 CPU 计算

这些操作如果放在主线程执行，会阻塞整个应用。所以 Node.js 用 **libuv 线程池**来处理它们。

### 线程池工作原理

```
JavaScript 主线程
      │
      ↓ 发起文件读取
事件循环 (libuv)
      │
      ↓ 将任务分配给线程池
┌─────────────────────────────────────┐
│           线程池（默认4个线程）        │
├─────────┬─────────┬─────────┬───────┤
│  线程1  │  线程2  │  线程3  │ 线程4 │
│ 文件读取 │ DNS查询 │  加密   │ 压缩  │
└─────────┴─────────┴─────────┴───────┘
      │
      ↓ I/O 完成
事件循环收到通知
      │
      ↓ 执行回调函数
JavaScript 主线程执行回调
```

**工作流程：**
1. JavaScript 主线程发起 I/O 请求
2. libuv 将任务分配给线程池中的空闲线程
3. 线程在后台执行实际的 I/O 操作
4. 操作完成后，通知事件循环
5. 事件循环将回调放入队列，等待主线程执行

### 线程池大小配置

默认线程池大小为 **4 个线程**，可以通过环境变量调整：

```javascript
// 方式1：通过环境变量设置
process.env.UV_THREADPOOL_SIZE = 8; // 最大 1024

// 方式2：启动时设置
// UV_THREADPOOL_SIZE=8 node app.js
```

**线程池大小的影响：**

| 场景 | 建议大小 | 原因 |
|------|----------|------|
| 默认应用 | 4 | 足够处理大部分 I/O |
| 文件密集型 | 8-16 | 文件 I/O 主要由线程池处理 |
| 网络密集型 | 4 | 网络 I/O 由系统内核处理，不依赖线程池 |

### 哪些操作使用线程池？

```javascript
const crypto = require('crypto');
const fs = require('fs');

// 文件 I/O → 使用线程池
fs.readFile('./file.txt', callback);

// DNS 查询 → 使用线程池
dns.lookup('example.com', callback);

// 加密 → 使用线程池
crypto.pbkdf2('password', 'salt', 100000, 64, 'sha512', callback);

// 压缩 → 使用线程池
zlib.gzip(data, callback);
```

**注意：** 网络 I/O（如 `http.get()`）不使用线程池，而是由系统内核直接处理。

# 高并发处理的流程

## 三个层次的关系

```
┌─────────────────────────────────────────────────────────┐
│                    JavaScript 单线程                      │
│                   (执行用户代码)                          │
├─────────────────────────────────────────────────────────┤
│                    事件循环 (libuv)                       │
│               (调度回调，协调 I/O)                        │
├─────────────────────────────────────────────────────────┤
│        系统内核 / 线程池 (libuv worker threads)           │
│              (执行实际 I/O 操作)                          │
└─────────────────────────────────────────────────────────┘
```

## 一个请求的完整生命周期

以 HTTP 请求为例：

```
1. 客户端发起请求
      ↓
2. Node.js 接收请求（事件循环的 poll 阶段）
      ↓
3. 执行路由处理函数（JavaScript 单线程）
      ↓
4. 发起数据库查询（非阻塞，交给线程池）
      ↓
5. 主线程继续处理其他请求（不阻塞）
      ↓
6. 数据库返回结果（线程池完成，事件循环收到通知）
      ↓
7. 回调函数被放入 poll 队列
      ↓
8. 事件循环执行回调，返回响应给客户端
```

## 并发请求的处理过程

```
        客户端请求
       ┌──┬──┬──┐
       │  │  │  │
       ▼  ▼  ▼  ▼
   ┌──────────────┐
   │  事件循环     │  ← 单线程依次处理
   │              │
   │  请求1 → 注册回调 → 等待I/O ──┐
   │  请求2 → 注册回调 → 等待I/O ──┤  I/O 操作由
   │  请求3 → 注册回调 → 等待I/O ──┤  系统/线程池处理
   │              │                │
   │  I/O完成 ← ─ ─ ─ ─ ─ ─ ─ ─ ┘
   │  执行回调                     │
   └──────────────┘
```

## 代码走读

```javascript
const http = require('http');
const fs = require('fs');

const server = http.createServer((req, res) => {
  // 1. 每个请求都会执行这个回调
  //    注意：此时主线程是"占用"的

  // 2. 发起异步文件读取
  fs.readFile('./data.json', (err, data) => {
    // 5. 文件读取完成后，这个回调才会被执行
    //    此时主线程再次"占用"
    res.end(data);
  });

  // 3. 文件读取是异步的，主线程不会等待
  //    而是继续处理下一个请求
});

server.listen(3000);
// 4. 服务器继续监听，可以同时处理其他请求
```

# Node.js 高并发的局限

## CPU 密集型的瓶颈

Node.js 的单线程模型在遇到 CPU 密集型任务时会成为瓶颈：

```javascript
// CPU 密集型任务会阻塞事件循环
const http = require('http');

const server = http.createServer((req, res) => {
  if (req.url === '/heavy') {
    // 这个计算会占用主线程，导致其他请求无法处理
    let result = 0;
    for (let i = 0; i < 1000000000; i++) {
      result += i;
    }
    res.end(`Result: ${result}`);
  } else {
    res.end('Hello World');
  }
});
```

## 什么时候不适合使用 Node.js

| 场景 | 原因 | 替代方案 |
|------|------|----------|
| 复杂数学计算 | 单线程 CPU 密集型瓶颈 | Python（NumPy）、Go |
| 实时音视频处理 | CPU 密集 + 内存压力 | C++、Rust |
| 大数据处理 | 单线程处理能力有限 | Java、Spark |
| 金融交易系统 | 需要严格的时间确定性 | C++、Java |

# Node.js 对高并发的优化

## Cluster（多进程）

利用多核 CPU，创建多个工作进程：

```javascript
const cluster = require('cluster');
const http = require('http');
const numCPUs = require('os').cpus().length;

if (cluster.isMaster) {
  // 主进程：fork 工作进程
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // 自动重启
  });
} else {
  // 工作进程：创建 HTTP 服务器
  http.createServer((req, res) => {
    res.end(`Hello from worker ${process.pid}`);
  }).listen(3000);
}
```

## Worker Threads（多线程）

处理 CPU 密集型任务，避免阻塞主线程：

```javascript
const { Worker } = require('worker_threads');

// 创建 Worker 线程执行 CPU 密集型任务
const worker = new Worker('./heavy-computation.js');

worker.on('message', (result) => {
  console.log('计算结果:', result);
});

worker.postMessage({ data: [1, 2, 3, 4, 5] });
```

```javascript
// heavy-computation.js
const { parentPort } = require('worker_threads');

parentPort.on('message', (msg) => {
  const result = msg.data.reduce((sum, n) => sum + n * n, 0);
  parentPort.postMessage(result);
});
```

## Worker Threads vs Cluster

| 特性 | Worker Threads | Cluster |
|------|---------------|---------|
| 共享内存 | 支持（SharedArrayBuffer） | 不支持 |
| 隔离性 | 共享进程 | 独立进程 |
| 适用场景 | CPU 密集型计算 | 网络服务负载均衡 |
| 通信方式 | postMessage / SharedArrayBuffer | IPC（进程间通信） |
| 资源开销 | 较小 | 较大 |

## 缓存优化

减少重复的 I/O 操作：

```javascript
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 分钟过期

async function getUserFromDB(userId) {
  // 先查缓存
  let user = cache.get(`user:${userId}`);
  if (user) return user;
  
  // 缓存没有，查数据库
  user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  
  // 写入缓存
  cache.set(`user:${userId}`, user);
  return user;
}
```

## 连接池

复用数据库连接，减少连接建立和销毁的开销：

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'mydb',
  waitForConnections: true,
  connectionLimit: 10,    // 最大连接数
  queueLimit: 0           // 队列限制，0 表示不限制
});

async function query(sql, values) {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.execute(sql, values);
    return rows;
  } finally {
    connection.release(); // 归还连接到池中
  }
}
```

# 总结

## 核心机制

| 机制 | 作用 | 位置 |
|------|------|------|
| **非阻塞 I/O** | 让 I/O 操作不阻塞主线程 | libuv + 系统内核 |
| **事件循环** | 调度异步回调执行 | libuv |
| **线程池** | 执行文件 I/O、DNS 等 | libuv（默认 4 线程） |

## 一句话总结

> Node.js 通过**单线程**执行 JavaScript 代码，利用**非阻塞 I/O** 和**事件循环**来处理高并发，将实际的 I/O 操作交给**操作系统**或**线程池**来完成，从而实现了用一个线程就能高效处理大量并发连接的能力。

## 适用场景

- ✅ I/O 密集型应用（Web 服务器、API 服务）
- ✅ 实时应用（聊天、推送）
- ✅ 流式处理（音视频流、日志处理）
- ❌ CPU 密集型应用（复杂计算、图像处理）
