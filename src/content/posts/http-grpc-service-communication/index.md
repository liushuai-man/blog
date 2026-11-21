---
title: 从一次计算请求理解 HTTP 和 gRPC
published: 2026-11-21
description: 用浏览器、Gateway、Agent 和计算器服务走完一次调用，拆解 HTTP 与 gRPC 的分层关系，以及流式回复的断线、取消、超时和去重。
tags: ['HTTP', 'HTTP/2', 'gRPC', 'Protobuf', 'SSE', 'AI Agent']
category: 架构
draft: true
---

在 Naxixi Agent 的工作台里输入「请用计算器求 178 × 349」，页面先显示工具正在执行，接着出现计算结果 `62122`，最后逐段显示助手回复。在浏览器开发者工具里，能看到提交对话的 HTTP 请求和一条持续接收数据的连接。计算器的 gRPC 调用发生在服务端，从工具卡片和进程日志里可以核对它。

沿着这次请求往下看，可以把几个容易混在一起的问题分开。HTTP 决定一轮请求和响应如何表达。gRPC 让客户端按类型明确的方法调用远端服务。SSE 让浏览器从一条 HTTP 响应中持续接收事件。它们在同一条业务链路上各有位置。

## 从浏览器到计算器经过哪几跳

用 Gateway 入口打开工作台时，浏览器连接本机的 `8081`。这次计算会穿过三个各自启动的服务进程。

| 调用方向 | 这一跳使用什么 | 接收方负责什么 |
| --- | --- | --- |
| 浏览器 → Gateway | HTTP。提交和查询通常用 JSON，订阅用 SSE | 校验工作台访问权限，将浏览器请求映射成 Agent RPC |
| Gateway → Agent | gRPC，默认目标为本机 `50051` | 受理对话、编排模型与工具、保存消息和执行状态 |
| Agent → 工具执行服务 | gRPC，默认目标为本机 `50052` | 执行计算器运算，返回结果或明确的错误 |

浏览器提交的是自然语言。模型给出计算器名称和参数后，Agent 校验这些参数，通过 gRPC 请求工具进程。工具进程只关心操作符与两个数。Agent 保存工具结果，再把它交给模型，由模型整理成最终回答。

看源码时，可以从 `agent_service/`、`gateway_service/` 和 `tool_execution_service/` 各自的 `main.py` 找到进程入口。Agent 进程内部还注册了 `PingService`、`ChatService` 和 `ConversationService` 等接口。进程决定部署和运行边界，`.proto` 中的 `service` 决定一组可以远程调用的方法。

## HTTP 和 gRPC 分别解决什么问题

### HTTP 表达请求与响应的含义

以工作台的 Ping 为例，下面用 HTTP/1.1 的文本形式写出请求和响应的关键部分。

```http
GET /api/v1/ping HTTP/1.1
Host: 127.0.0.1:8081
Authorization: Bearer <本地访问凭据>

HTTP/1.1 200 OK
Content-Type: application/json
X-Request-Id: <请求追踪编号>

{"message":"pong","service":"naxixi-agent","timestamp":1795250000}
```

`GET` 表达读取语义，路径指定目标，响应状态码和正文表示这次操作的结果。`application/json` 告诉客户端怎样解释正文。换成 HTTP/2，同样的 HTTP 方法、状态码和字段仍有相同语义，线上通过帧和流传输。一条连接可以交错承载多个请求和响应，这种能力叫多路复用。 [RFC 9110 HTTP 语义](https://www.rfc-editor.org/rfc/rfc9110.html) · [RFC 9113 HTTP/2 流与多路复用](https://www.rfc-editor.org/rfc/rfc9113.html#section-5)

JSON 是一种消息表示格式。REST 是一种组织接口的设计风格，比如用 `GET /operations/{id}` 读取某个执行资源。协议、正文编码和接口风格可以分别选择。这个项目对浏览器用 HTTP 路径表达语义，对内部工具调用用方法名表达意图。

### gRPC 把远程调用写成带类型的方法

工具服务的 `.proto` 契约有这样一段。为便于阅读，这里摘出服务定义和请求类型。

```proto
package naxixi.v1;

service ToolExecutionService {
  rpc Calculate(CalculateRequest) returns (CalculateResponse);
}

message CalculateRequest {
  string operator = 1;
  string left_operand = 2;
  string right_operand = 3;
}
```

客户端和服务端通过代码生成得到消息类型与接口。客户端的 **stub** 是本地代理，调用它的 `Calculate` 方法时，gRPC 运行时会编码请求、送到远端，并把响应解码成类型化对象。Protobuf 用字段编号识别字段，所以修改契约时要保持已分配编号的含义，删除字段后应保留其编号。样例用十进制字符串表示操作数，避免在这一跳转换成浮点数。 [gRPC 核心概念](https://grpc.io/docs/what-is-grpc/core-concepts/) · [Protobuf 字段编号](https://protobuf.dev/programming-guides/proto3/#assigning-field-numbers)

这个项目的原生 gRPC 调用承载在 HTTP/2 上。调用 `Calculate` 时，路径是 `/naxixi.v1.ToolExecutionService/Calculate`。gRPC 在 HTTP/2 的数据流中放入带长度的消息，在尾部字段中报告 `grpc-status`。排查原生 RPC 时，HTTP `200` 和 `grpc-status` 要分别看。前者属于 HTTP 响应，后者表达 RPC 的最终状态。 [gRPC over HTTP/2 协议](https://github.com/grpc/grpc/blob/master/doc/PROTOCOL-HTTP2.md)

RPC 成功返回以后，还要读懂响应里的业务结果。计算器可以正常收到请求，并用响应里的 `error` 字段报告除零。客户端等到 deadline 仍收不到结果时，gRPC 则以 `DEADLINE_EXCEEDED` 结束调用，由 Agent 转成 `TOOL_TIMEOUT`。这两个错误出现在不同层。 [gRPC 状态码](https://grpc.io/docs/guides/status-codes/)

## 单次请求、流式响应和后台任务

先问一次调用要交换多少条**业务消息**。在 gRPC 中，`.proto` 里的 `stream` 关键字说明哪一侧能发送多条消息。

| 模式 | 客户端 → 服务端 | 服务端 → 客户端 | 适用场景 |
| --- | --- | --- | --- |
| 一元 RPC | 一条请求 | 一条响应 | Ping、查询状态、计算器求值 |
| 服务端流 | 一条请求 | 多条消息 | 订阅执行事件、逐批返回数据 |
| 客户端流 | 多条消息 | 一条响应 | 分批提交记录，结束时返回汇总 |
| 双向流 | 多条消息 | 多条消息 | 双方都需要持续交互，例如实时语音 |

一元 RPC 的客户端也可以用 `await` 异步等待。这里的异步描述调用代码怎样在等待 I/O 时让出执行权，表中的流描述调用双方交换的消息数量。 [gRPC 四种调用模式](https://grpc.io/docs/what-is-grpc/core-concepts/#service-definition)

后台任务还多了一个生命周期问题。Agent 可以先确认一轮对话已被受理，再继续生成答案。此时提交与订阅是两次独立请求，后台执行有自己的编号和终态。只需要偶尔看状态时，可以用 HTTP 轮询。需要随时看到服务端事件时，可以开 SSE。浏览器和服务端在同一连接上都需要持续发消息时，可以考虑 WebSocket。 [RFC 9110 关于 202 Accepted](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.3) · [SSE 规范](https://html.spec.whatwg.org/multipage/server-sent-events.html) · [WebSocket 协议](https://www.rfc-editor.org/rfc/rfc6455.html)

## 一次流式回复怎样走到浏览器

1. 浏览器调用 `POST /api/v1/threads/{thread_id}/turns`。Gateway 调用 Agent 的一元 RPC `SubmitTurn`。Agent 把用户消息、执行和提交记录写入数据库后，Gateway 返回 HTTP `202 Accepted` 和 `operation_id`。这是受理回执，答案还在生成。
2. 浏览器带上执行编号调用 `GET /api/v1/operations/{operation_id}/events?after_seq=0`。Gateway 先查询这项执行，再通过服务端流 RPC `SubscribeOperation` 订阅事件。
3. 模型请求计算器时，Agent 发布 `tool.started`，向工具进程完成一次 `Calculate` 调用，保存结果并发布 `tool.completed`。随后 Agent 把结果交回模型。模型逐段输出的文本对应 `assistant.delta` 事件。
4. Gateway 把每条 gRPC 事件转换成 `text/event-stream` 响应体里的一个 SSE 帧。浏览器读取这些事件来更新工具卡片和回复。Agent 保存最终消息和执行状态后，发布 `operation.completed`。

下例是一条文本增量，执行编号与消息编号均为示意。每条事件以空行结束。

```text
id: 17
event: assistant.delta
data: {"schema_version":1,"operation_id":"示例执行","thread_id":"示例会话","seq":17,"event":"assistant.delta","payload":{"message_id":"示例消息","text":"62122"}}

```

浏览器的工作是按 SSE 规则解析帧，再把同一消息的增量拼起来。一次网络读取可能只拿到半行，也可能拿到多个事件。这个工作台使用带 `Authorization` 的 `fetch` 读取响应体，并自行保存序号和处理重连。标准 `EventSource` 也使用 SSE 帧格式，并在自身的重连流程中处理 `Last-Event-ID`。 [HTML 标准 SSE 帧与重连](https://html.spec.whatwg.org/multipage/server-sent-events.html#server-sent-events)

## 断线、取消、超时和重复提交怎么处理

**断线时恢复观察。** 浏览器关闭订阅连接后，Agent 已受理的执行继续运行。重连时用原 `operation_id` 和最后处理的 `seq` 读取后续事件，并用序号去重。如果错过终态，可以查询 `GET /api/v1/operations/{id}` 和会话历史。这里的事件重放依赖 Agent 进程的有限缓冲，最终消息和状态从数据库读取。SSE 的 HTTP `200` 表示订阅已建立，执行结果由终态事件或状态查询确认。

**停止时改变执行状态。** 工作台的「停止」按钮调用 `POST /api/v1/operations/{id}/cancel`。Agent 处理停止请求、取消在途的模型调用或工具 RPC，保存已生成的内容，并返回当前权威状态。生成先完成时，查询仍会读到已完成状态。涉及外部写入时，取消前已经发生的副作用需要业务层单独处理。 [gRPC 取消语义](https://grpc.io/docs/what-is-grpc/core-concepts/#cancelling-an-rpc)

**超时时明确等待预算。** Agent 可以给计算器 RPC 设置 3 秒的 deadline，表示这次调用最多愿意等待到什么时间。验收中，工具服务配置了 4 秒演示延时，客户端约在 3 秒报告 `TOOL_TIMEOUT`。Agent 把错误保存成工具结果，交给模型生成后续回复。因此同一次执行里，工具卡片可以显示超时，而最终回复仍能正常完成。 [gRPC Deadline 指南](https://grpc.io/docs/guides/deadlines/)

**提交结果未知时复用幂等键。** 浏览器可能因断线没看到 `202`，数据库里却已经有这次执行。显式重试时带上原来的正文和请求体 `request_id`，Agent 可以认出同一次提交并返回原执行。复用同一个键但更改参数会返回冲突。

排查时按编号找对应层。打开浏览器开发者工具的 Network，查看 `/api/v1/ping` 响应头里的 `x-request-id`，再用同一个值在 Agent 日志里找到 `/naxixi.v1.PingService/Ping`，就能确认 Gateway 确实发起了这次 RPC。

| 编号 | 用来追踪什么 |
| --- | --- |
| 请求头 `x-request-id` | 一次 HTTP 请求及其 Gateway 到 Agent 的 gRPC 调用 |
| 请求体 `request_id` | 一次提交意图，重试时用于去重 |
| `operation_id` | 后台执行，用于查询、订阅和停止 |
| `call_id` | 将一次工具请求与结果配对 |
| `seq` | 同一执行中的事件位置，重连时用作游标 |

想从代码里验证这条链路，可以先看 `gateway_service/http_app.py` 里的提交和订阅路由，再看 `gateway_service/agent_client.py` 发出的 RPC。工具调用则从 Agent 的 `infrastructure/tool_execution_client.py` 跟到 `tool_execution_service/grpc_server.py` 的 `Calculate` 方法。
