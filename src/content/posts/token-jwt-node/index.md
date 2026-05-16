---
title: 从零理解 Token 与 JWT：Node.js + Express 登录认证原理详解
published: 2026-05-16
description: '在 Node.js 中使用 Express 框架实现登录认证，理解 Token 与 JWT 的原理。'
tags: ['Node.js', 'Express', 'JWT']
category: 后端
draft: false
---

## 引入

在前端项目开发中，登录认证是一个常见但重要的功能。很多项目都使用 Token 与 JWT 来实现登录认证，但很多开发者可能并没有深入理解其原理。

如今趁着我刚写完项目的 Token 认证功能，我想分享一下我的理解。

本文将详细介绍：

- 什么是 Token
- 为什么需要 Token
- JWT 是什么
- 前后端登录时 Token 是怎么产生的
- Token 在哪里保存
- Token 在后续请求中如何工作
- Node + Express 如何实现 JWT 登录认证
- 中间件为什么能获取用户信息
- 为什么前端不需要传 userId

---

## 一、什么是 Token

Token 是用于登录认证的凭证，我们可以把它当作互联网的"身份证"。

本质上，Token 只是一个字符串：

```
"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

它本身并不能直接用于认证，需要将 Token 与用户信息关联起来才能实现认证。Token 看起来像乱码，是因为它经过了加密处理，需要使用密钥才能解密。

---

## 二、为什么需要 Token

没有 Token 时会发生什么？

假设用户登录成功后：

- 用户名：admin
- 密码：123456

后端验证成功，但后端怎么知道后面每一次请求是谁发的？

例如：

```bash
GET /user/info
GET /courses
POST /comment
```

这些请求都没有"身份信息"，后端根本不知道"到底是谁在操作？"

---

## 三、Token 的核心作用

登录成功后，后端会生成一个 Token：

```
abc123xxxxxxx
```

然后返回给前端：

```json
{
  "token": "abc123xxxx"
}
```

以后，前端每次请求都带上它：

```
Authorization: Bearer abc123xxxx
```

这个通常会在前端封装的请求拦截器中自动添加。

这样，后端就知道："哦，这是张三发来的请求。"

---

## 四、Token 在前后端中的完整生命周期

这是最核心的一部分。

### 登录流程（完整过程）

**第一步：用户输入账号密码**

前端：

- 账号：admin
- 密码：123456

发送请求：

```bash
POST /login
```

**第二步：后端验证账号密码**

```typescript
const user = await prisma.user.findUnique({
  where: {
    email,
  },
});

if (password !== user.password) {
  return res.send('密码错误');
}
```

**第三步：生成 Token（JWT）**

验证成功后，服务器生成 JWT：

```typescript
const token = jwt.sign(
  {
    userId: user.id,
  },
  SECRET_KEY,
  {
    expiresIn: '7d',
  }
);
```

JWT 内部保存了：

```json
{
  "userId": "123"
}
```

**第四步：后端返回 Token**

```json
{
  "token": "xxxxx"
}
```

**第五步：前端保存 Token**

通常保存到：

- localStorage
- cookie
- Zustand
- Pinia
- Redux

例如：

```javascript
localStorage.setItem('token', token);
```

**第六步：以后每次请求都携带 Token**

```javascript
axios.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${localStorage.getItem('token')}`;
  return config;
});
```

请求会变成：

```
Authorization: Bearer xxxxx
```

---

## 五、后端如何解析 Token？

核心：`Authorization: Bearer xxxxx`

```typescript
const authHeader = req.headers.authorization;
// 得到：Bearer xxxxx

const token = authHeader.split(' ')[1];
// 得到：xxxxx
```

### 通过中间件解析 Token

```typescript
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.split(' ')[1];
  if (!token) {
    return res.status(401).send('未授权');
  }
  next();
});
```

---

## 六、中间件为什么这么重要？

因为很多接口都需要登录，例如：

- 获取个人信息
- 点赞
- 评论
- 收藏
- 学习进度

如果每个接口都写 `jwt.verify()` 会非常重复，所以 Express 使用中间件。

---

## 七、JWT 到底是什么？

JWT：全称 JSON Web Token

它是一种"可以在前后端安全传输信息的 Token 标准"。

---

## 八、JWT 的结构

JWT 分成三部分：

```
Header.Payload.Signature
```

例如：

```
xxxxx.yyyyy.zzzzz
```

### 第一部分：Header（头部）

保存：

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

意思：使用 HS256 加密，类型是 JWT

### 第二部分：Payload（载荷）

保存用户数据：

```json
{
  "userId": "123",
  "username": "Tom"
}
```

**注意：** JWT 的 Payload 只是 Base64 编码，不是加密。所以不要存密码！

### 第三部分：Signature（签名）

这是最关键部分。服务器会用 SECRET_KEY 对前两部分签名：

```javascript
jwt.sign(payload, SECRET_KEY);
```

这样别人就无法伪造 Token。

---

## 九、JWT 为什么安全？

因为用户虽然能看到 Payload：

```json
{
  "userId": "123"
}
```

但他无法重新生成合法签名，因为他不知道 SECRET_KEY。

所以即使修改：

```json
{
  "userId": "999"
}
```

签名也会失效，后端会发现：`token invalid`

---

## 十、Express 中 JWT 是怎么工作的？

### 安装依赖

```bash
pnpm add jsonwebtoken
```

TypeScript：

```bash
pnpm add -D @types/jsonwebtoken
```

### 登录接口

```typescript
import jwt from 'jsonwebtoken';

app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return res.send('用户不存在');
  }

  if (password !== user.password) {
    return res.send('密码错误');
  }

  const token = jwt.sign(
    {
      userId: user.id,
    },
    'code-story-secret',
    {
      expiresIn: '7d',
    }
  );

  res.send({
    token,
  });
});
```

---

## 十一、JWT 验证

```typescript
const decoded = jwt.verify(token, 'code-story-secret');
```

`verify` 会：

1. 验证签名
2. 验证是否过期
3. 返回 Payload

例如：

```json
{
  "userId": "123"
}
```

---

## 十二、为什么后端能直接拿到 userId？

因为 JWT Payload 中本来就存着：

```json
{
  "userId": "123"
}
```

`verify` 后：

```typescript
const decoded = jwt.verify(...)
```

就能得到：

```json
{
  "userId": "123"
}
```

于是：

```typescript
req.user = decoded;
```

后续接口可以直接拿到用户 ID：

```typescript
req.user.userId;
```

---

## 十三、为什么前端不需要传 userId？

因为 userId 已经在 Token 里面。

如果前端再传：

```json
{
  "userId": "999"
}
```

会出现安全问题，用户可以伪造别人 ID。

所以真正安全的做法是：永远以后端解析出的 userId 为准，而不是相信前端传的数据。

---

## 十四、完整请求链路（最重要）

这是整个 JWT 登录体系的核心：

```
用户登录
    ↓
后端验证账号密码
    ↓
生成 JWT
    ↓
返回给前端
    ↓
前端保存 Token
    ↓
后续请求携带 Token
    ↓
Express 中间件解析 Token
    ↓
拿到 userId
    ↓
接口知道当前用户是谁
```

---

## 十五、JWT 的优点

### 1. 前后端分离友好

非常适合：

- React
- Vue
- Next.js
- UniApp
- 小程序

### 2. 无状态

服务器不需要存 Session，扩展性强。

### 3. 微服务友好

多个服务都能解析 JWT。

---

## 十六、JWT 的缺点

### 1. 无法主动失效

JWT 一旦签发，在过期前都有效。所以很多项目会结合 Redis，例如：token blacklist

### 2. Token 泄露风险

如果 localStorage 被 XSS 攻击，Token 会被盗。所以生产环境很多会使用 HttpOnly Cookie。

---

## 十七、JWT + Redis 为什么经常一起出现？

因为 JWT 默认"签发后无法撤销"。

例如用户退出登录，理论上 Token 仍然有效。

所以很多项目会：

- Redis 存储登录状态

**验证流程：**

```
JWT 验签
    ↓
检查 Redis 是否存在
    ↓
存在 = 登录有效
不存在 = 已退出
```

---

## 十八、Node + Express 推荐项目结构

```
src
├── middleware
│   └── auth.middleware.ts
├── routes
│   └── auth.route.ts
├── services
│   └── auth.service.ts
├── utils
│   └── jwt.ts
```

---

## 十九、JWT 工具函数封装

**jwt.ts**

```typescript
import jwt from 'jsonwebtoken';

const SECRET = 'code-story-secret';

export const createToken = (userId: string) => {
  return jwt.sign(
    {
      userId,
    },
    SECRET,
    {
      expiresIn: '7d',
    }
  );
};

export const verifyToken = (token: string) => {
  return jwt.verify(token, SECRET);
};
```

---

## 二十、总结

**一句话理解：**

Token 是登录后的身份凭证，JWT 则是一种"可验证、防篡改的 Token 方案"。

它的完整流程：

```
登录 → 生成 JWT → 前端保存 → 请求携带 → 后端解析 → 获取 userId → 完成鉴权
```

而 Express 中间件本质上就是"在接口执行前，提前验证用户身份"。

所以你现在看到的 `req.user.userId`，背后其实是整个 JWT 登录体系在工作。
