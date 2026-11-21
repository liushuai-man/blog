---
title: AI 连接器接上了什么？
published: 2026-11-19
description: 从发一条飞书群消息入手，拆开看连接器的接口定义、授权配置和执行过程，再比较它与 MCP、Skill 的区别。
tags: ['AI Agent', '连接器', 'MCP', 'Skill']
category: Agent
draft: false
---

假设你想让 AI 往飞书的研发群发一句「会议改到下午三点」。AI 知道要发什么，产品还得知道调用哪个接口、用哪份授权，以及怎么判断消息发成功了。这些信息来自哪里？

上一篇[《别再混淆 Skill、MCP 和 Function Calling 了》](../skill-mcp-function-calling/)讲了工具如何被发现、调用和组织。

## 一个连接器由什么组成？

假设团队有一个通知服务，已经能用飞书应用机器人发群消息。现在要让 AI 产品调用这个服务。用 Power Platform 自定义连接器的文件结构举例，连接器里要放这些东西。

| 文件 | 放了什么 | 在发消息的例子里 |
| --- | --- | --- |
| `apiDefinition.swagger.json` | 接口定义。有哪些操作、接收什么参数、返回什么 | 把「发群消息」映射到通知服务的 `POST /feishu/group-message`，接收群 ID `chat_id` 和正文 `text`，返回消息 ID |
| `apiProperties.json` | 连接属性。配置怎么向目标服务认证 | 例如要求创建连接时填写通知服务的 API Key，由平台在调用时带上 |
| `script.csx`（可选） | 自定义代码。需要额外修改请求或结果时使用 | 例如把通知服务的错误码转换成产品能直接显示的提示 |

这几个文件定义的是可复用的**连接器**。使用时，平台另外保存一条**连接**，里面是这次接入所用的凭据，这里就是通知服务的 API Key。飞书应用的 App ID 和 App Secret 由通知服务保管，用来换取 `tenant_access_token`。 [Power Platform 连接器文件](https://learn.microsoft.com/en-us/connectors/custom-connectors/paconn-cli) · [连接与凭据](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-connection-reference) · [飞书访问凭证](https://open.feishu.cn/document/server-docs/api-call-guide/calling-process/get-access-token?lang=zh-CN)

## 调用时，谁真正发出请求？

AI 调用「发群消息」时，只需给出群 ID 和正文。平台根据连接器定义，用这条连接的凭据请求通知服务。通知服务再带上飞书的 `tenant_access_token`，调用 `POST /open-apis/im/v1/messages?receive_id_type=chat_id`。飞书收到的请求体如下，群 ID 是示意值。

```json
{
  "receive_id": "oc_example",
  "msg_type": "text",
  "content": "{\"text\":\"会议改到下午三点\"}"
}
```

`content` 是序列化后的 JSON 字符串，由通知服务负责转换。这个例子给飞书应用开通 `im:message:send_as_bot`（以应用的身份发消息），机器人也要在目标群里并能发言。飞书返回成功后，通知服务把消息 ID 交回 AI 产品。 [飞书发送消息接口](https://open.feishu.cn/document/server-docs/im-v1/message/create?lang=zh-CN) · [飞书消息内容结构](https://open.feishu.cn/document/server-docs/im-v1/message-content-description/create_json?lang=zh-CN)

## 连接器和 MCP 有什么区别？

**连接器把某个服务的能力接进产品。MCP 规定客户端如何发现和调用服务器提供的工具。** 比如飞书官方 OpenAPI MCP 可以把发送消息接口暴露为 `im.v1.message.create` 工具。产品可以将这种接入显示为「飞书连接器」，客户端和服务器之间的工具调用使用 MCP。 [飞书官方 OpenAPI MCP](https://github.com/larksuite/lark-openapi-mcp/blob/main/README_ZH.md) · [Claude 自定义连接器](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)

| 对比维度 | 连接器（产品集成） | MCP（通信协议） |
| --- | --- | --- |
| 怎么接入 | 在产品里启用集成，按需登录并选择使用范围 | 直接接入时，在支持 MCP 的客户端配置远程地址或本地启动命令 |
| 授权管什么 | 绑定一份实际授权，让产品能以获准的身份访问外部服务 | HTTP 接入可用标准授权流程，具体权限由服务和授权决定 |
| 能读还是能写 | 看集成开放了哪些操作，例如读取或发送消息 | 看服务器提供了哪些工具，以及客户端和权限允许哪些调用 |
| 数据怎么来 | 可以按需查询外部系统，也可以先同步建索引再搜索 | 统一请求和结果的格式，查源系统或查索引由服务器实现决定 |
| 换个 AI 产品还能用吗 | 看新产品有没有相应的集成，以及它开放了哪些能力 | 兼容的客户端可以连接同一个 MCP Server，再按需授权和启用工具 |

自己开发 MCP Server 时，也可以把「发群消息」声明成一个 MCP 工具。客户端通过 MCP 把参数发给服务器，服务器再调用飞书 API。 [MCP Server 开发指南](https://modelcontextprotocol.io/docs/develop/build-server) · [MCP 授权规范](https://modelcontextprotocol.io/specification/latest/basic/authorization)

做文档搜索时，连接器还可以包含同步和索引流程。例如 Microsoft 365 Copilot 的同步连接器先把外部内容写入索引，联合连接器则通过 MCP 实时取数。 [Microsoft 365 Copilot 连接器文档](https://learn.microsoft.com/en-us/microsoft-365/copilot/connectors/overview)

![Microsoft 365 Copilot 的两种连接器：同步连接器先建索引，联合连接器通过 MCP 实时取数。](./images/copilot-connector-paths-handdrawn.png)

*Microsoft 365 Copilot 连接器取数方式示意图。*

## Skill 放在哪？

如果团队常发会议变更通知，可以用 `SKILL.md` 固定做法。正文先写会议名称、新时间和时区，再请用户确认群聊和内容，最后调用已接入的发送操作。 [Agent Skills 规范](https://agentskills.io/specification)

## 按场景怎么选？

| 场景 | 怎么选 |
| --- | --- |
| 当前产品自带飞书集成，已经支持发群消息 | **用现成连接器。** 建好连接，确认它有目标群的发消息权限。 |
| 现有集成只读，但客户端支持接入飞书官方 OpenAPI MCP | **接现成的 MCP Server。** 配置应用权限，再启用发送工具。 |
| 内部工单系统只有 REST API，要接进团队正在用的 AI 产品 | **开发自定义连接器。** 先确认产品支持的接入方式，再实现查询和账号授权。 |
| 同一套工单查询要给多个支持 MCP 的 AI 客户端用 | **复用或开发一个 MCP Server。** 在各客户端接入，再配置各自的授权。 |
| 想把内部知识库纳入公司现有的统一搜索 | **选支持索引同步的连接器。** 确认哪些内容会被索引，以及源系统权限怎样同步。 |
| 已经可以发消息，团队经常用同一格式发会议变更通知 | **沿用现有接入，加一个 Skill。** 固定通知格式和确认步骤。 |

## 总结

**连接器把外部服务的接口和授权方式包装成产品可用的操作。** 接口定义写清能做什么，连接属性写清怎么授权，实际调用时再用一条已经授权的连接执行。选连接器时，重点查它开放了哪些操作，以及你的授权能用到哪些数据。
