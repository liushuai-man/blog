---
title: 网页换件衣服，怎么就成了 App？
published: 2026-10-22
description: 从 Electron、Tauri 到 Capacitor，聊聊网页如何住进客户端，以及“一套代码，多端运行”到底省了什么。
image: './images/cover.png'
tags: ['跨平台', 'Electron', 'Tauri', 'Capacitor']
category: 前端
draft: false
---

写好一个网站，给它套个壳，就能出现在桌面和手机上。听起来像给网页办了张新身份证：昨天还住在浏览器标签页，今天已经有了桌面图标。

这件事能成立，是因为**网页本来就是一套成熟的界面技术**。HTML 管结构，CSS 管样式，JavaScript 管交互。只要有地方把它们运行起来，界面就能搬家。

真正有意思的，是外面那层“壳”到底提供了什么。

## 壳子里，藏着一位系统管家

想象做了一个待办工具。列表、勾选和搜索，在浏览器里已经能用了。现在希望它能打开本地文件、待在系统托盘，或者调用手机相机。

浏览器也能提供部分设备能力，但有权限和兼容性边界。壳子的作用，就是提供运行网页的容器，再通过受控接口连接系统。

比如点击“保存”，可以走这样一条路：

**网页按钮 → 桥接接口 → 系统文件对话框 → 返回保存结果。**

前端仍负责“用户看见什么”，系统侧负责“机器实际做什么”。这条桥，才是套壳从换图标变成应用开发的关键。

## Electron：搬家时，把厨房也带上

[Electron](https://www.electronjs.org/docs/latest/) 的组合很直白：**Chromium 渲染网页，Node.js 和 Electron API 处理桌面能力**。它面向 Windows、macOS 和 Linux。

自带浏览器引擎，好处是各端有相对一致的渲染基础；代价是安装包需要携带这套运行环境，内存开销也需要认真管理。像搬家时连厨房一起带走，到哪儿都熟悉，行李自然也多。

代码通常分成两边：渲染进程显示界面，主进程管理窗口、菜单和系统操作，中间通过 preload、`contextBridge` 与 IPC 暴露有限的能力。网页不该直接拿到整套系统权限。[进程模型](https://www.electronjs.org/docs/latest/tutorial/process-model)

常见搭配是 **Svelte／React／Vue + TypeScript + Electron**。前端框架可以沿用，新增的功课主要在桌面集成、进程通信和打包发布。

## Tauri：厨房用当地的，自己带菜谱

[Tauri](https://v2.tauri.app/start/) 也用 Web 技术写界面，但借用系统的 **WebView**——可以理解为嵌在应用里的网页显示器——而不随每个应用打包一套浏览器引擎。

它用 Rust 构建系统侧核心，前端通过命令或插件调用能力。这样通常能缩小应用自身的安装包；与此同时，各平台 WebView 的差异仍要测试，包体小也不代表所有场景都更快。

常见搭配是 **Svelte／React／Vue + TypeScript + Tauri + Rust**。Tauri 2 也支持 Android 和 iOS，不过具体插件与系统能力要逐端确认。

## Capacitor：给网页配一张手机门禁卡

[Capacitor](https://capacitorjs.com/docs) 更适合从 Web 项目走向 Android 和 iOS：界面运行在原生容器的 WebView 里，相机、定位等能力通过插件接入。

通常先把前端构建成 HTML、CSS 和 JavaScript，再同步进手机工程，由 Android Studio 或 Xcode 构建应用。也就是说，网页资源可以跟着安装包走，不必每次启动都打开一个远程网址。[开发流程](https://capacitorjs.com/docs/basics/workflow)

常见搭配是 **现有前端 + Capacitor + 原生插件**。需要自定义能力时，再补 Swift、Java 或 Kotlin。经常一起出现的 Ionic 主要提供 UI 组件和交互，Capacitor 负责原生容器与能力连接，两者可以分开用。[与 Ionic 搭配](https://capacitorjs.com/docs/getting-started/with-ionic)

## 还有一种选择：让网页自己拿到桌面座位

如果只是希望“能安装、有图标、能离线”，也可以看看 [PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)。它通过 Web App Manifest 描述安装信息，配合 Service Worker 实现缓存和离线策略，仍由浏览器体系承载。

它不需要另做一个原生壳，但安装方式和设备能力取决于浏览器与系统；离线也需要自己设计，装上图标不会自动获得。

## 一套代码，省的是重复劳动

拿前面的待办工具来说，任务数据结构、筛选逻辑和大部分界面可以共用；桌面端的托盘、手机端的返回键和相机，则各自适配。

三种壳子的区别，可以放进一张表：

| 方案 | 界面怎么运行 | 系统能力怎么接 | 实现特点 |
| --- | --- | --- | --- |
| Electron | 自带 Chromium | Node.js、Electron API，通过 IPC 通信 | 主要面向桌面，渲染基础较一致，包体开销较大 |
| Tauri | 借用系统 WebView | Rust 命令与插件 | 覆盖桌面和移动端，包体通常较小，需处理 WebView 差异 |
| Capacitor | 手机原生容器内的 WebView | 原生插件 | 主要面向 Android／iOS，沿用 Web 界面并接入手机能力 |

**会写 Web，你也能写客户端和移动端。** 熟悉的 HTML、CSS、JavaScript 可以继续用，再补上各端的交互适配、系统接口和打包发布，就能让网页走出浏览器，住进不同设备。
