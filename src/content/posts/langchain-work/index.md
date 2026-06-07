---
title: LangChain的核心以及工作流程思路分析
published: 2026-06-07
description: "本文将重点介绍LangChain由哪些核心组成，以及其工作流程思路分析，同时提供一些实战案例与常见问题优化方案。"
tags: ["LangChain"]
category: Agent
draft: false
---

# 一、LangChain简介

## 1.1 什么是LangChain

LangChain是一个用于构建基于大语言模型（LLM）应用的开源框架，由Harrison Chase于2022年10月推出。它提供了一整套工具和抽象层，帮助开发者更便捷地将大模型与外部数据源、工具进行整合，构建复杂的AI应用。

LangChain的核心设计理念是"模块化"与"可组合性"——将LLM应用拆分为独立的组件（如提示词模板、记忆模块、工具调用），再通过链式调用将这些组件串联起来，形成完整的工作流程。

## 1.2 LangChain的核心定位与价值

LangChain在AI应用开发中的定位可以归结为以下几点：

**降低开发门槛**：封装了大模型交互的复杂逻辑，开发者无需关注底层Prompt构建、模型调用、重试机制等细节。

**提供标准接口**：定义了LLM、Tool、Memory、Retrieval等组件的统一抽象，使得不同服务商（OpenAI、Anthropic、开源模型）的模型可以无缝切换。

**支持复杂工作流**：通过Chain机制，将多个组件串联成处理复杂任务的流水线，支持RAG、Agent等高级场景。

**生态丰富**：拥有庞大的社区生态，提供了丰富的预置组件、模板和第三方集成。

## 1.3 LangChain适用场景与优势

LangChain适用于以下典型场景：

- **智能问答系统**：基于企业知识库或私有文档的问答（RAG场景）
- **聊天机器人**：具备多轮对话能力、上下文记忆的对话系统
- **自动化代理**：能够自主决策、调用工具完成复杂任务的AI Agent
- **内容生成与处理**：自动化文案生成、数据抽取、格式转换等
- **代码助手**：理解代码库结构、辅助代码编写与调试

其优势在于：开发效率高、扩展性强、社区支持完善，但对于简单场景可能存在一定的学习成本。

## 1.4 LangChain版本迭代与核心特性

| 版本 | 时间 | 核心特性 |
|------|------|----------|
| 0.0.x | 2022.10 | 初始版本，提供基础LLM调用和Chain概念 |
| 0.1.x | 2023-2024 | 支持Agent、Memory、RAG等核心组件 |
| 0.2.x | 2024 | 架构优化，性能提升，LCEL表达式增强 |
| 0.3.x | 2024-2025 | 更好的类型安全、标准化接口、LangGraph整合 |

从0.2版本开始，LangChain引入了**LCEL（LangChain Expression Language）**，这是一种声明式的链式调用语法，大幅简化了Chain的构建方式。
# 二、LangChain的核心组成
## 2.1 大模型组件（LLMs & Chat Models）

LangChain提供统一的大模型接口，支持两大类模型：

**LLMs**：面向文本补全的基础大语言模型，输入字符串，输出字符串。适用于纯文本生成任务。

```javascript
import { OpenAI } from "@langchain/openai";

const llm = new OpenAI({ model: "gpt-3.5-turbo-instruct" });
const response = await llm.invoke("给我讲一个关于AI的笑话");
```

**Chat Models**：面向对话场景的聊天模型，基于消息列表进行交互，支持多轮对话上下文。LangChain将各类聊天模型（OpenAI ChatGPT、Anthropic Claude、Azure OpenAI等）统一封装为`ChatModel`接口。

```javascript
import { ChatOpenAI } from "@langchain/openai";

const chat = new ChatOpenAI({ model: "gpt-4" });
const messages = [
    ["system", "你是一个专业的AI助手"],
    ["human", "什么是RAG？"]
];
const response = await chat.invoke(messages);
```

## 2.2 提示词模板（Prompts）

提示词模板用于动态构建Prompt，将固定部分与变量部分分离，提升复用性和可维护性。

**PromptTemplate**：用于构建纯文本Prompt。

```javascript
import { PromptTemplate } from "@langchain/core/prompts";

const template = PromptTemplate.fromTemplate(
    "请将以下文本翻译成{target_language}：{text}"
);
const prompt = await template.invoke({
    target_language: "日语",
    text: "今天天气真好"
});
```

**ChatPromptTemplate**：用于构建聊天式Prompt，支持多角色消息模板。

```javascript
import { ChatPromptTemplate } from "@langchain/core/prompts";

const chatTemplate = ChatPromptTemplate.fromMessages([
    ["system", "你是一个{role}专家，擅长回答关于{topic}的问题。"],
    ["human", "{user_question}"]
]);
const prompt = await chatTemplate.invoke({
    role: "金融",
    topic: "投资理财",
    user_question: "如何分散投资风险？"
});
```

## 2.3 解析器（Output Parsers）

解析器用于将大模型的原始输出（通常是字符串）结构化为程序可处理的格式（如JSON、Python对象）。

**JsonOutputParser**：将输出解析为JSON格式。

```javascript
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { PromptTemplate } from "@langchain/core/prompts";

const parser = new JsonOutputParser();
const prompt = new PromptTemplate({
    template: "请生成一个关于{topic}的JSON格式简介，包含name和description字段。\n{format_instructions}",
    inputVariables: ["topic"],
    partialVariables: {
        format_instructions: parser.getFormatInstructions()
    }
});

const chain = prompt.pipe(llm).pipe(parser);
const result = await chain.invoke({ topic: "人工智能" });
// result: {"name": "人工智能", "description": "..."}
```

**PydanticOutputParser**：基于Pydantic模型进行类型安全的输出解析。

```javascript
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";

const parser = StructuredOutputParser.fromZodSchema(
    z.object({
        name: z.string(),
        age: z.number(),
        city: z.string()
    })
);
```

## 2.4 记忆模块（Memory）

Memory模块为对话系统提供记忆能力，支持在多轮对话中保持上下文。常见的记忆方式有以下几种：

### ConversationBufferMemory
最简单的记忆方式，将所有对话历史存储在内存中。

```javascript
import { ChatMessageHistory } from "@langchain/core/stores";

const memory = new ChatMessageHistory();
await memory.addUserMessage("我叫张三");
await memory.addAiMessage("你好张三，很高兴认识你！");
await memory.addUserMessage("我喜欢编程");
await memory.addAiMessage("那很棒！你擅长什么编程语言？");

const history = await memory.getMessages();
// history: [HumanMessage("我叫张三"), AIMessage("你好张三，很高兴认识你！"), ...]
```
显而易见，`ConversationBufferMemory`适用于短对话、简单任务，但对话越长token开销越大。

### ConversationBufferWindowMemory
只保留最近k轮对话，避免历史过长，节省token开销。

```javascript
import { ConversationBufferWindowMemory } from "langchain/memory";

// 只保留最近3轮对话
const memory = new ConversationBufferWindowMemory({ k: 3 });
await memory.saveContext({ input: "我叫张三" }, { output: "你好张三！" });
await memory.saveContext({ input: "今天天气真好" }, { output: "是的，适合出门" });
await memory.saveContext({ input: "我想去公园" }, { output: "好主意！" });
await memory.saveContext({ input: "哪里有好吃的？" }, { output: "附近有一家不错的餐厅" });

// 只会保留后3轮对话
const history = await memory.loadMemoryVariables({});
```
这种方法适用于中等长度对话，解决`ConversationBufferMemory`的token开销问题。但是随着对话的进行，`ConversationBufferWindowMemory`会丢失早期重要信息。

### ConversationSummaryMemory
对长对话进行摘要总结，通过将历史对话转换为摘要，添加到记忆中。

**核心原理**：
1. **摘要生成**：使用大模型（LLM）生成对话的摘要。
2. **记忆存储**：将摘要存储在记忆中，作为后续对话的上下文。

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { ConversationSummaryMemory } from "langchain/memory";
import { RunnableSequence } from "@langchain/core/runnables";

// 1. 初始化LLM
const llm = new ChatOpenAI({ model: "gpt-3.5-turbo", temperature: 0 });

// 2. 创建摘要记忆
const memory = new ConversationSummaryMemory({
  llm,
  memoryKey: "chat_history",
  returnMessages: true,
});

// 3. 模拟多轮对话
const conversation = [
  { input: "我叫张三，来自北京，从事软件工程师工作5年了", output: "你好张三！很高兴认识你。" },
  { input: "我最近在学习AI大模型相关的技术", output: "很好的方向！AI领域发展很快。" },
  { input: "我想转行做AI工程师，你觉得可行吗", output: "以你的背景完全可行，建议从LangChain开始入门。" },
];

for (const turn of conversation) {
  await memory.saveContext({ input: turn.input }, { output: turn.output });
}

// 4. 加载记忆（自动生成摘要）
const { chat_history } = await memory.loadMemoryVariables({});

// chat_history 示例内容：
// "用户叫张三，来自北京，是一名软件工程师。他正在学习AI大模型技术，想转行做AI工程师。AI助手建议他从LangChain开始入门。"

// 5. 清空记忆
await memory.clear();
```

**特点**：
- ✅ 极大减少token开销（摘要远短于完整对话）
- ✅ 保留对话的核心信息
- ⚠️ 每次保存都需要LLM调用生成摘要，有额外延迟
- ⚠️ 摘要可能丢失细节信息

适用场景：长对话、长时间会话、需要保持上下文一致性的客服场景。

### VectorStoreRetrieverMemory
将记忆存储在向量数据库中，支持语义检索。通过向量化和余弦相似度匹配，实现长期记忆的语义检索。

**核心原理**：
1. **向量化（Embedding）**：将文本转换为向量表示，捕捉语义信息
2. **余弦相似度（Cosine Similarity）**：衡量查询与历史记录的语义相似度（范围：-1~1，值越大越相似）

```javascript
import { VectorStoreRetrieverMemory } from "langchain/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

// 1. 创建向量数据库
const embeddings = new OpenAIEmbeddings();
const vectorStore = new Chroma(embeddings, { collectionName: "memory" });

// 2. 创建向量检索记忆
const memory = new VectorStoreRetrieverMemory({
  vectorStoreRetriever: vectorStore.asRetriever({ k: 2 }),
  memoryKey: "history",
});

// 3. 保存记忆
await memory.saveContext({ input: "我正在学习LangChain" }, { output: "很好！它是一个强大的框架" });
await memory.saveContext({ input: "我想构建一个AI助手" }, { output: "可以使用Agent来实现" });

// 4. 根据语义检索相关记忆
const history = await memory.loadMemoryVariables({ prompt: "AI助手" });
// 会检索到与"AI助手"语义相似的历史记录
```

**余弦相似度计算示例**：
```javascript
// 余弦相似度公式：cos(θ) = (A·B) / (||A|| × ||B||)
// 两个向量越相似，余弦值越接近1

// 在LangChain中，向量数据库自动处理相似度计算
// 检索时通过 similarity_threshold 控制相似度阈值
const retriever = vectorStore.asRetriever({
  k: 3,
  filter: { source: "conversation" },
  similarityThreshold: 0.7 // 只返回相似度≥0.7的结果
});
```
这种方法适用于复杂问答、需要长期记忆的场景。但是需要额外的向量数据库和检索开销,并且技术上比较复杂。

**特点**：
- ✅ 支持语义检索，长期记忆
- ⚠️ 需要额外的向量数据库和检索开销
- ⚠️ 技术上比较复杂，需要配置和维护向量数据库

### 记忆模块对比总结

| 记忆类型 | 优点 | 缺点 | 适用场景 |
|----------|------|------|----------|
| **ConversationBufferMemory** | 简单直观，保存完整历史 | 对话越长token开销越大 | 短对话、简单任务 |
| **ConversationBufferWindowMemory** | 控制历史长度，节省token | 可能丢失早期重要信息 | 中等长度对话 |
| **ConversationSummaryMemory** | 大幅压缩历史，节省token | 需要额外LLM调用生成摘要 | 长对话、长时间会话 |
| **VectorStoreRetrieverMemory** | 支持语义检索，长期记忆 | 需要向量数据库，检索开销 | 复杂问答、需要长期记忆 |

**选择建议**：
- 快速原型开发或简单对话：使用 `ConversationBufferMemory`
- 生产环境中等对话：使用 `ConversationBufferWindowMemory`（建议 k=3-5）
- 长对话或长时间会话：使用 `ConversationSummaryMemory`
- 需要知识检索或长期记忆：使用 `VectorStoreRetrieverMemory`

## 2.5 工具组件（Tools）

Tools是LangChain中Agent与外部世界交互的桥梁，定义了Agent可以调用的各种能力。

**内置工具**：LangChain内置了搜索、计算器、Wikipedia查询等常用工具。

```javascript
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";

const search = new DuckDuckGoSearch({});
const result = await search.invoke("LangChain是什么");
```

**自定义工具**：通过装饰器轻松创建自定义工具。

```javascript
import { tool } from "@langchain/core/tools";

const getWeather = tool(async (city) => {
    return `${city}今天晴天，气温25度`;
}, {
    name: "get_weather",
    description: "获取指定城市的天气信息"
});

const calculate = tool(async (expression) => {
    return String(eval(expression));
}, {
    name: "calculate",
    description: "执行数学计算"
});
```

## 2.6 检索组件（Retrieval）

Retrieval组件用于构建RAG（检索增强生成）系统，从外部知识库中检索相关信息。

简单介绍一下RAG的作用：
**RAG核心概念**：
RAG（Retrieval Augmented Generation，检索增强生成）是一种将检索与生成相结合的技术，通过从外部知识库检索相关信息来增强大模型的回答能力。

**RAG解决的核心问题**：
1. **幻觉问题**：大模型知识有截止日期，可能产生过时或错误的信息，RAG通过检索实时/私有数据来解决
2. **知识盲区**：模型无法掌握私有领域知识（如企业内部文档、产品手册）
3. **信息溯源**：提供可解释的回答来源，增强可信度

**RAG工作流程**：
```
用户查询 → 检索（Query Embedding）→ 匹配相关文档 → 将文档内容注入Prompt → LLM生成回答
```

**RAG适用场景**：
- 企业知识库问答（如客服、内部文档检索）
- 专业领域问答（法律、医疗、金融）
- 实时性要求高的场景（新闻、产品更新）
- 需要引用源信息的场景（研究助手）

**RAG核心组成**：
| 组件 | 作用 |
|------|------|
| Document Loader | 加载各种格式的文档 |
| Text Splitter | 将长文档分割成小块 |
| Embedding | 将文本转为向量表示 |
| VectorStore | 存储和检索向量 |
| Retriever | 根据查询检索相关文档 |

**Document Loader**：文档加载器，支持PDF、TXT、Markdown、Web页面等多种文档格式。

```javascript
import { WebBaseLoader } from "@langchain/community/document_loaders/web";

const loader = new WebBaseLoader("https://example.com/article");
const docs = await loader.load();
```

**Text Splitter**：文本分割器，将长文档拆分为适合检索的小块。

```javascript
import { RecursiveCharacterTextSplitter } from "@langchain/core/text_splitter";

const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,// 每个文档块的最大字符数
    chunkOverlap: 50,// 相邻文档块之间的重叠字符数
});
const chunks = await splitter.splitDocuments(docs);
```

**Embedding & VectorStore**：嵌入模型和向量数据库，用于语义检索。

```javascript
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

const embeddings = new OpenAIEmbeddings();
const vectorstore = await Chroma.fromDocuments(chunks, embeddings);

const retriever = vectorstore.asRetriever({ k: 3 });
```

## 2.7 链结构（Chains）

Chains是LangChain的核心概念，将多个组件串联成处理特定任务的流水线。

**LLMChain**：最基本的链结构，结合LLM与PromptTemplate。

```javascript
// 使用LCEL构建链
const chain = prompt.pipe(llm).pipe(parser);

// 执行
const result = await chain.invoke({ topic: "AI" });
// result: "The weather is nice today."
```

**RetrievalQA**：基于检索的问答链。

```javascript
import { RetrievalQAChain } from "langchain/chains";

const qaChain = RetrievalQAChain.fromLLM(llm, retriever);
```

**LCEL（LangChain Expression Language）**：声明式的链式调用语法，是现代LangChain开发的主流方式。
主要通过pipe（管道）方法将组件串联起来，实现链式调用和组件组合。

```javascript
const chain = prompt.pipe(llm).pipe(parser);
const result = await chain.invoke({ topic: "LangChain" });
```
pipe的作用就是将多个组件串联起来，将上一个组件的输出作为下一个组件的输入，实现链式调用和组件组合。

## 2.8 智能体（Agents）

Agent是LangChain中能够自主决策、执行动作的高级组件，能够根据输入和上下文动态选择下一步操作。

**Agent的核心组成**：
- **推理引擎**：使用LLM进行推理和决策
- **工具集**：Agent可调用的外部工具
- **执行循环**：观察→推理→行动的循环过程

**ReAct Agent**：最常用的Agent类型，结合推理与行动。

```javascript
import { AgentType, initializeAgent } from "langchain/agents";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";

const tools = [new DuckDuckGoSearch({})];
const agent = await initializeAgent(
    tools,
    llm,
    AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    { verbose: true }
);

await agent.invoke("帮我查一下今天北京的天气，并总结一下");
```

**Conversational Agent**：适用于对话场景的Agent类型，集成Memory模块。

```javascript
import { createConversationalRetailAgent } from "langchain/agents";

const agent = await createConversationalRetailAgent(llm, tools, { memory });
```
# 三、LangChain的工作流程思路分析

## 3.1 核心工作流程整体思路

LangChain的核心工作流程遵循"**输入 → 组件处理 → 链式组合 → 输出**"的基本范式：

```
用户输入 → Prompt模板组装 → LLM处理 → OutputParser解析 → 结构化输出
```

在实际应用中，工作流程会根据场景复杂度呈现不同形态：

- **简单场景**：直接调用LLM，一个Prompt进、一个输出出
- **RAG场景**：输入 → 检索（Retrieval）→ 增强Prompt → LLM → 输出
- **Agent场景**：输入 → Agent决策 → 循环调用工具 → 最终响应

LangChain的价值在于：无论场景复杂与否，都可以用统一的组件化和链式调用思路来实现。

## 3.2 基础执行链路拆解（输入-处理-输出）

以一个最简单的翻译任务为例，基础执行链路如下：

```
1. 输入：用户原始文本
2. Prompt组装：将用户输入和系统指令组装成完整的Prompt
3. LLM调用：将Prompt发送给大模型
4. 输出解析：将LLM返回的原始文本解析为结构化结果
5. 输出：最终结果
```

```javascript
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// 使用LCEL构建链
const template = "请将以下中文翻译成英文：{text}";
const prompt = PromptTemplate.fromTemplate(template);
const parser = new StringOutputParser();

const chain = prompt.pipe(llm).pipe(parser);

// 执行
const result = await chain.invoke({ text: "今天天气真好" });
// result: "The weather is nice today."
```

## 3.3 检索增强（RAG）专属工作流程

RAG（Retrieval-Augmented Generation）是LangChain最核心的应用场景之一，其工作流程如下：

```
1. 文档加载（Load）→ 2. 文本分割（Split）→ 3. 向量化（Embed）→ 4. 存储（Store）
                                                              ↓
用户问题 → 5. 检索（Retrieve）→ 6. 组装Prompt（Augment）→ 7. LLM生成（Generate）→ 8. 输出
```

**第一步：索引构建（离线）**

```javascript
import { TextLoader } from "@langchain/community/document_loaders/fs";
import { RecursiveCharacterTextSplitter } from "@langchain/core/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";

// 加载文档
const loader = new TextLoader("knowledge.txt");
const documents = await loader.load();

// 分割文本
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50
});
const chunks = await splitter.splitDocuments(documents);

// 向量化并存储
const embeddings = new OpenAIEmbeddings();
const vectorstore = await Chroma.fromDocuments(chunks, embeddings);
```

**第二步：检索增强生成（在线）**

```javascript
import { RetrievalQAChain } from "langchain/chains";

// 构建问答链
const qaChain = RetrievalQAChain.fromLLM(llm, {
    retriever: vectorstore.asRetriever()
});

// 用户提问
const result = await qaChain.invoke({ query: "文档中关于AI的观点是什么？" });
```

## 3.4 Agent智能体决策工作流程

Agent的工作流程是一个**循环迭代**的过程，通过"思考-行动-观察"的循环来完成任务：

```
用户输入 → Agent分析 → [决策：使用工具?] 
                         ↓              ↓
                       是              否
                         ↓              ↓
                    执行工具         直接回复
                         ↓              
                   观察结果 → 继续决策循环
```

**ReAct模式的决策流程**：

1. **Thought（思考）**：Agent分析当前状态，决定是否需要采取行动
2. **Action（行动）**：如果需要，调用一个工具
3. **Observation（观察）**：获取工具返回的结果
4. **重复**：直到Agent判断可以给出最终响应

```javascript
import { AgentType, initializeAgent } from "langchain/agents";

// 初始化Agent
const agent = await initializeAgent(
    tools,  // 可用工具
    llm,
    AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    { verbose: true }  // 显示推理过程
);

// 执行任务
const result = await agent.invoke("北京的人口有多少？比上海多还是少？");
```

## 3.5 核心流程代码基本实现

以下是一个完整的RAG问答系统的核心实现：

```javascript
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatOpenAI } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Document } from "@langchain/core/documents";

// 1. 初始化组件
const llm = new ChatOpenAI({ model: "gpt-4" });
const embeddings = new OpenAIEmbeddings();

// 2. 创建向量数据库（带数据）
const vectorstore = await Chroma.fromDocuments(
  [
    new Document({
      pageContent: "LangChain是一个用于构建LLM应用的框架",
      metadata: { source: "langchain docs" }
    }),
    new Document({
      pageContent: "LangChain提供组件化和链式调用",
      metadata: { source: "langchain docs" }
    })
  ],
  embeddings,
  "./chroma_db"
);
const retriever = vectorstore.asRetriever({ k: 2 });

// 3. 构建提示词模板
const prompt = ChatPromptTemplate.fromTemplate(`
基于以下参考内容回答问题。如果参考内容没有相关信息，请如实告知。

参考内容：{context}

问题：{question}
`);

// 4. 组装RAG链
const ragChain = RunnableSequence.from([
  {
    context: retriever,
    question: (input) => typeof input === "string" ? input : input.question
  },
  prompt,
  llm,
  new StringOutputParser()
]);

// 5. 执行
const result = await ragChain.invoke("LangChain是什么？");
console.log(result);
```
# 四、LangChain核心实战案例

## 4.1 基础对话链实现

构建一个简单的对话链，支持多轮对话上下文：

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { BufferMemory } from "langchain/memory";

const llm = new ChatOpenAI({ model: "gpt-4", temperature: 0.7 });

const prompt = ChatPromptTemplate.fromMessages([
    ["system", "你是一个热情的旅行助手，擅长推荐旅游景点和行程规划。"],
    new MessagesPlaceholder("history"),
    ["human", "{input}"]
]);

const memory = new BufferMemory({
    returnMessages: true,
    outputKey: "answer"
});

async function chatWithMemory(inputText, chatHistory = []) {
    await memory.saveContext({ input: inputText }, { answer: "" });

    const { history } = await memory.loadMemoryVariables({});

    const response = await prompt.pipe(llm).invoke({
        input: inputText,
        history: history
    });

    await memory.saveContext({ input: inputText }, { answer: response.content });

    return response.content;
}

// 测试
console.log(await chatWithMemory("我想去日本旅游，有什么推荐吗？"));
console.log(await chatWithMemory("那里有什么好吃的？"));
```

## 4.2 简易RAG知识库问答实现

基于本地文档构建一个知识库问答系统：

```javascript
import { DirectoryLoader } from "@langchain/community/document_loaders";
import { RecursiveCharacterTextSplitter } from "@langchain/core/text_splitter";
import { OpenAIEmbeddings, ChatOpenAI } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnablePassthrough } from "@langchain/core/runnables";

// 1. 加载文档
const loader = new DirectoryLoader("./docs", {
    glob: "**/*.txt"
});
const documents = await loader.load();

// 2. 分割文本
const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50
});
const chunks = await splitter.splitDocuments(documents);

// 3. 向量化存储
const embeddings = new OpenAIEmbeddings();
const vectorstore = await Chroma.fromDocuments(chunks, embeddings, {
    persistentDirectory: "./vector_db"
});
await vectorstore.persist();

// 4. 构建检索链
const retriever = vectorstore.asRetriever({ k: 3 });

// 5. 定义Prompt
const template = `基于以下参考文档回答问题。请在参考文档中寻找答案，如果找不到，请说明"我不知道"。

参考文档：
{context}

问题：{question}
`;
const prompt = PromptTemplate.fromTemplate(template);

// 6. 组装RAG链
const llm = new ChatOpenAI({ model: "gpt-4" });
const ragChain = (
    { context: retriever, question: new RunnablePassthrough() }
    | prompt
    | llm
    | new StringOutputParser()
);

// 7. 问答
const result = await ragChain.invoke("文档中提到的核心概念是什么？");
console.log(result);
```

## 4.3 工具调用Agent实战示例

构建一个能够调用多种工具的Agent：

```javascript
import { AgentType, initializeAgent } from "langchain/agents";
import { DuckDuckGoSearch } from "@langchain/community/tools/duckduckgo_search";
import { tool } from "@langchain/core/tools";
import { ChatOpenAI } from "@langchain/openai";
import { BufferMemory } from "langchain/memory";

// 定义自定义工具
const getStockPrice = tool(async (symbol) => {
    const prices = { "AAPL": "178.50", "GOOGL": "142.30", "MSFT": "378.90" };
    return `${symbol}当前价格：$${prices[symbol] ?? "未知"}`;
}, {
    name: "get_stock_price",
    description: "获取股票当前价格"
});

const calculate = tool(async (expression) => {
    try {
        const result = eval(expression);
        return `计算结果：${result}`;
    } catch {
        return "计算表达式无效";
    }
}, {
    name: "calculate",
    description: "执行数学计算"
});

// 初始化工具列表
const tools = [
    getStockPrice,
    calculate,
    new DuckDuckGoSearch({})
];

// 初始化Agent
const llm = new ChatOpenAI({ model: "gpt-4", temperature: 0 });
const agent = await initializeAgent(
    tools,
    llm,
    AgentType.ZERO_SHOT_REACT_DESCRIPTION,
    {
        verbose: true,
        memory: new BufferMemory({ memoryKey: "chat_history", returnMessages: true })
    }
);

// 测试复杂任务
const result = await agent.invoke("苹果公司的股价是多少？比谷歌贵多少？");
console.log(result);
```

## 4.4 复杂任务处理（如任务分解、任务协调）

使用LangChain实现复杂任务的多步骤处理：

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { JsonOutputParser } from "@langchain/core/output_parsers";
import { StringOutputParser } from "@langlang/core/output_parsers";

const llm = new ChatOpenAI({ model: "gpt-4" });

// 任务分解Prompt
const decompositionPrompt = PromptTemplate.fromTemplate(
    `请将以下任务分解为具体的执行步骤，输出JSON格式的步骤列表。

任务：{task}

输出格式：
{{"steps": ["步骤1", "步骤2", ...]}}`
);

// 任务执行Prompt
const executionPrompt = PromptTemplate.fromTemplate(
    `你是一个任务执行助手。请严格按照以下步骤执行。

步骤列表：
{steps}

当前执行步骤：{current_step}
任务目标：{task}

请执行当前步骤并报告结果。`
);

// 分解链
const decomposeChain = decompositionPrompt.pipe(llm).pipe(new JsonOutputParser());

// 执行链
const executeChain = (
    {
        steps: (x) => x["steps"],
        current_step: (x) => x["current_step"],
        task: (x) => x["task"]
    }
    | executionPrompt
    | llm
);

// 主任务
const task = "帮我分析某公司是否值得投资";
const taskObj = await decomposeChain.invoke({ task });
const steps = taskObj["steps"];

// 顺序执行各步骤
const results = [];
for (const step of steps) {
    const result = await executeChain.invoke({
        task,
        steps,
        current_step: step
    });
    results.push({ step, result });
}

// 最终综合
const summaryPrompt = PromptTemplate.fromTemplate(
    `基于以下各步骤的执行结果，给出最终结论。

任务：{task}

执行结果：
{results}

请给出综合分析结论。`
);

const finalResult = summaryPrompt.pipe(llm).pipe(new StringOutputParser());
console.log(await finalResult.invoke({
    task,
    results: results.map(r => `【${r.step}】${r.result.content}`).join("\n")
}));
```

## 4.5 高级功能（如多模态输入、多模态输出）

LangChain支持多模态大模型，可以处理图像、音频等多种输入：

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage } from "@langchain/core/messages";

const llm = new ChatOpenAI({ model: "gpt-4o" });  // 支持视觉的模型

// 处理图像输入
const imageUrl = "https://example.com/chart.png";

const response = await llm.invoke([
    new HumanMessage({
        content: [
            { type: "text", text: "请描述这张图片的内容" },
            { type: "image_url", image_url: { url: imageUrl } }
        ]
    })
]);

console.log(response.content);

// 同时处理文本和图像
const response2 = await llm.invoke([
    new HumanMessage({
        content: [
            { type: "text", text: "这张图表显示了什么数据趋势？" },
            { type: "image_url", image_url: { url: imageUrl } }
        ]
    })
]);
```

处理文件输入（PDF、Excel等）：

```javascript
import { PDFLoader } from "@langchain/community/document_loaders/fs";

const loader = new PDFLoader("./document.pdf");
const pages = await loader.load();

// 将PDF内容加入RAG系统
await vectorstore.addDocuments(pages);
```
# 五、LangChain使用常见问题与优化方案

## 5.1 提示词优化技巧

**问题**：模型输出不稳定、回答偏离预期

**优化技巧**：

1. **使用结构化Prompt**：明确角色、任务、输出格式

```javascript
// 推荐：结构化指令
const prompt = `你是一个专业翻译专家。
任务：将以下中文文本翻译成英文
要求：
1. 保持原文风格
2. 专业术语准确翻译
3. 输出纯文本，不要解释

文本：{text}`;
```

2. **Few-shot示例**：提供1-3个示例，帮助模型理解模式

```javascript
const prompt = PromptTemplate.fromTemplate(`示例：
输入：今天天气真好
输出：The weather is nice today.

输入：{text}
输出：`);
```

3. **使用OutputParser约束格式**：避免解析失败

```javascript
import { z } from "zod";
import { StructuredOutputParser } from "@langchain/core/output_parsers";

const TranslationSchema = z.object({
    original: z.string(),
    translated: z.string()
});

const parser = StructuredOutputParser.fromZodSchema(TranslationSchema);
```

## 5.2 记忆模块使用误区与优化

**问题**：对话历史过长导致token消耗大、模型处理慢

**优化方案**：

1. **使用摘要记忆替代完整历史**

```javascript
import { ConversationSummaryMemory } from "langchain/memory";

// 每轮对话后自动生成摘要，节省token
const memory = new ConversationSummaryMemory({ llm });
```

2. **限制历史消息条数**

```javascript
import { ConversationBufferWindowMemory } from "langchain/memory";

// 只保留最近3轮对话
const memory = new ConversationBufferWindowMemory({ k: 3 });
```

3. **使用向量检索记忆**：对于长期记忆，按需检索相关历史

```javascript
import { VectorStoreRetrieverMemory } from "langchain/memory";

const retriever = vectorstore.asRetriever({ search_kwargs: { k: 2 } });
const memory = new VectorStoreRetrieverMemory({ retriever });
```

## 5.3 RAG检索精度提升方案

**问题**：检索到的内容不相关、回答质量差

**优化方案**：

1. **优化分块策略**：根据内容类型调整chunk大小

```javascript
// 技术文档：较小chunk，更精确
const splitter1 = new RecursiveCharacterTextSplitter({
    chunkSize: 300,
    chunkOverlap: 30
});

// 叙事文章：较大chunk，保持连贯
const splitter2 = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 100
});
```

2. **使用语义分块**：基于语义相似度而非固定长度分块

```javascript
import { SemanticChunker } from "@langchain/experimental/text_splitter";
import { OpenAIEmbeddings } from "@langchain/openai";

const chunker = new SemanticChunker({
    breakpointThresholdAmount: 0.8,
    embedding: new OpenAIEmbeddings()
});
const chunks = await chunker.splitDocuments(documents);
```

3. **混合检索**：结合向量检索和关键词检索

```javascript
import { EnsembleRetriever } from "@langchain/community/retrievers/ensemble";

// 混合检索器
const ensembleRetriever = new EnsembleRetriever({
    retrievers: [semanticRetriever, keywordRetriever],
    weights: [0.6, 0.4]
});
```

4. **元数据过滤**：使用文档元数据缩小检索范围

```javascript
// 添加元数据
await vectorstore.addDocuments(documents, {
    metadatas: [{ source: "技术文档", category: "API" }]
});

// 按元数据过滤检索
const retriever = vectorstore.asRetriever({
    search_kwargs: {
        k: 5,
        filter: { category: "API" }
    }
});
```

## 5.4 链式调用性能优化

**问题**：复杂链式调用响应慢、资源消耗高

**优化方案**：

1. **使用异步调用**：充分利用异步IO

```javascript
import { ChatOpenAI } from "@langchain/openai";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// 根据任务复杂度选择不同模型
function getLlm(taskComplexity) {
    if (taskComplexity === "low") {
        return new ChatOpenAI({ model: "gpt-3.5-turbo" });
    } else if (taskComplexity === "high") {
        return new ChatOpenAI({ model: "gpt-4" });
    }
}
```

2. **批量处理**：减少模型调用次数

```javascript
// 不推荐：逐条处理
for (const item of items) {
    const result = await chain.invoke(item);
}

// 推荐：批量处理
const results = await chain.batch(items);
```

3. **缓存常用结果**：使用LCEL的cache机制

```javascript
import { setLlmCache } from "@langchain/core/globals";
import { InMemoryCache } from "@langchain/community/cache";

await setLlmCache(new InMemoryCache());

// 相同输入将直接返回缓存结果
const result = await chain.invoke({ query: "常见问题" });
```

4. **选择合适的模型**：简单任务用小模型

```javascript
// 根据任务复杂度选择不同模型
function getLlm(taskComplexity) {
    if (taskComplexity === "low") {
        return new ChatOpenAI({ model: "gpt-3.5-turbo" });
    } else if (taskComplexity === "high") {
        return new ChatOpenAI({ model: "gpt-4" });
    }
}
```
# 六、学习总结与未来展望

## 6.1 LangChain核心知识点复盘

本文系统介绍了LangChain的核心知识体系，主要包括以下要点：

| 模块 | 核心内容 | 应用场景 |
|------|----------|----------|
| **LLMs & Chat Models** | 统一模型接口，支持多种大模型 | 基础文本生成与对话 |
| **Prompts** | PromptTemplate、ChatPromptTemplate | 动态Prompt构建 |
| **Output Parsers** | JsonOutputParser、PydanticOutputParser | 结构化输出解析 |
| **Memory** | BufferMemory、SummaryMemory、VectorStoreMemory | 对话上下文管理 |
| **Tools** | 内置工具、自定义工具 | Agent与外部世界交互 |
| **Retrieval** | Document Loader、Text Splitter、VectorStore | RAG知识库构建 |
| **Chains** | LLMChain、RetrievalQA、LCEL | 组件串联与工作流 |
| **Agents** | ReAct、Conversational Agent | 自主决策与任务执行 |

**关键设计思想**：
- **模块化**：各组件独立可替换，便于组合和扩展
- **链式调用**：通过`|`操作符串联组件，代码简洁直观
- **接口标准化**：统一的抽象接口，降低学习成本


## 6.2 后续学习与进阶方向

对于希望深入学习LangChain的开发者，建议按以下路径进阶：

**入门阶段**：
- 熟练掌握LCEL语法，能够独立构建简单Chain
- 完成RAG和Agent的实战项目

**进阶阶段**：
- 学习LangGraph，掌握复杂工作流的编排方式
- 深入理解Prompt Engineering技巧
- 探索模型微调与LangChain的结合

**高级阶段**：
- 研究Agent架构设计（多Agent协作、Agent自我进化）
- 关注LLM应用的可观测性与安全性
- 参与开源社区，贡献代码和组件

**推荐学习资源**：
- LangChain官方文档：https://python.langchain.com
- LangChain GitHub仓库：关注最新版本和最佳实践
- LangGraph文档：学习复杂工作流编排
- 社区教程与实战项目：Hands-On LLM Applications
