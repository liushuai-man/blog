---
title: Multi-Agent架构在AI模拟面试系统中的应用与优化
published: 2026-07-25
description: 记录AI模拟面试Agent从Single-Agent到Multi-Agent架构演进过程，以及在任务拆分、Agent协作、Memory设计和性能优化方面的实践。
tags: ['Multi-Agent', '架构设计', 'Agent', 'LangGraph', 'AI 应用']
category: 架构
draft: false
---

## 备注

在我的「AI简历助手」项目中，有一个在线面试功能。最开始我使用的是单智能体架构，但发现单个智能体提出的问题质量不够高，针对用户回答的追问效果也不好。于是我决定使用多智能体架构来优化这个功能。

---

# 一、背景：为什么从Single-Agent迁移到Multi-Agent？

## 1.1 项目背景

AI模拟面试功能的核心流程：

```
用户上传简历 → 选择目标岗位 → AI生成面试问题 → 用户回答 → AI评价 → 继续追问 → 生成面试报告
```

整个流程听起来简单，但实际要做好却不容易。一个优秀的面试官需要：

- 了解候选人的简历和目标岗位
- 提出有针对性的问题
- 根据回答判断能力水平
- 发现知识盲区并深挖
- 最后给出专业的评价和建议

## 1.2 初始Single-Agent架构

最开始我采用了最简单的单Agent设计：

```
用户 ←→ Interview Agent ←→ LLM
```

这个 Agent 负责所有事情：

- 生成面试问题
- 分析用户回答
- 决定是否追问
- 控制面试流程

代码结构也很简单，就是一个 `interview.agent.ts` 文件，里面一个 `InterviewAgent` 类，包含几个方法：

```typescript
class InterviewAgent {
  async generateQuestion(resume, position) { ... }
  async evaluateAnswer(question, answer) { ... }
  async generateFollowUp(question, answer, evaluation) { ... }
}
```

## 1.3 Single-Agent存在的问题

### 问题1：职责过重，Prompt越来越复杂

一个Agent同时承担了太多职责，导致Prompt变得非常冗长。我需要把面试策略、问题生成、回答评价、追问决策等所有逻辑都塞进一个Prompt里。

想象一下，就像让一个人同时扮演面试官、评分员、记录员和HR，他很难把每个角色都做好。

### 问题2：问题质量不稳定

单Agent在生成问题时，容易忽略用户回答中的细节。

**举个真实例子：**

用户简历上写着"使用Redis缓存数据"，回答时只说了一句：

> "我使用Redis缓存数据。"

单Agent可能直接跳过，进入下一个问题。但优秀的面试官应该追问：

> "如果数据库更新成功，但Redis删除失败，如何保证数据一致性？"

### 问题3：上下文不断膨胀

随着面试轮次增加，传入LLM的上下文越来越大：

- 简历全文
- 历史问题和回答
- 评价信息
- 能力画像

这导致两个问题：

1. **Token消耗增加**：每次调用都要传入大量重复信息
2. **推理质量下降**：上下文太长时，LLM容易忽略早期的重要信息

---

# 二、Multi-Agent架构设计

## 2.1 Multi-Agent设计思想

Multi-Agent不是简单地增加Agent数量，而是通过**任务拆分**，让不同的Agent负责不同的职责。

核心思想很简单：

```
复杂任务 → 拆分成小任务 → 让专业的Agent分别处理 → 最后汇总结果
```

就像一个真实的面试小组：

- 技术面试官负责问技术问题
- HR负责考察软技能
- 面试官组长负责协调流程

## 2.2 实际架构设计

经过调研和实践，我最终设计了8个Agent的协作架构：

```
                    Supervisor Agent (面试官组长)
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
  Strategy Agent     Evaluation Agent    Memory Agent
  (面试策略)          (回答评估)          (能力画像)
         │                 │                 │
         ▼                 ▼                 ▼
  Question Planner    评分/优缺点/知识缺口    更新能力画像
         │
         ▼
   ┌────┴────┬────┴────┐
   ▼         ▼         ▼
Technical  Project  FollowUp
  Agent     Agent    Agent
(技术问题) (项目问题) (深度追问)
```

## 2.3 为什么这样设计？

每个Agent都有明确的职责：

| Agent            | 职责                              | 类比           |
| ---------------- | --------------------------------- | -------------- |
| Supervisor       | 流程控制、调度其他Agent           | 面试官组长     |
| Strategy         | 决定下一阶段考察方向和难度        | 面试策略制定者 |
| Question Planner | 根据策略选择用哪个Agent生成问题   | 出题规划师     |
| Technical        | 生成技术基础问题（如Java、React） | 技术面试官     |
| Project          | 生成项目经验相关问题              | 项目面试官     |
| FollowUp         | 根据回答深度追问                  | 深挖专家       |
| Evaluation       | 评价回答、发现知识盲区            | 评分员         |
| Memory           | 维护用户能力画像                  | 记录员         |

---

# 三、各个Agent详解

## 3.1 Supervisor Agent（面试官组长）

这是整个架构的核心，不负责具体业务，只负责**流程调度**。

它的主要工作：

1. 面试开始时，调用Strategy生成面试计划
2. 用户回答后，调用Evaluation进行评估
3. 评估完成后，决定下一步：是追问还是问新问题
4. 面试结束时，生成最终报告

**关键代码**：

```typescript
// supervisor.agent.ts
class InterviewSupervisorAgent {
  async evaluateAnswer(question, answer, resumeText, targetPosition, profile) {
    // 1. 调用评价Agent
    const evaluation = await this.evaluationAgent.evaluate(...);

    // 2. 更新能力画像
    const updatedProfile = this.memoryAgent.updateProfile(profile, evaluation);

    return { evaluation, updatedProfile };
  }

  async generateNextQuestion(state) {
    // 根据当前状态生成下一题
    // 这里整合了策略和问题规划的逻辑
  }
}
```

## 3.2 Strategy Agent（策略规划师）

负责制定面试策略，决定"**考什么**"。2. **生成下一题**：根据当前面试状态（进度、能力画像、历史问答），直接生成下一个问题

**输入**：

- 用户当前能力画像
- 面试计划
- 历史问答记录

- 面试计划（如：React基础2题、项目经验3题、系统设计1题）
- 当前阶段难度（简单/中等/困难）

**举个例子**：

- 下一个具体问题（每轮问答后）

```
用户简历显示React经验丰富 → Strategy决定减少React基础题 → 增加工程化和性能优化题
```

## 3.3 Question Planner Agent（出题规划师）

根据Strategy的输出，决定"**谁来出题**"。

它会判断：

- 这题需要考察技术基础？→ 交给Technical Agent
- 这题需要考察项目经验？→ 交给Project Agent
- 需要深度追问？→ 交给FollowUp Agent

## 3.4 Technical Agent（技术面试官）

````

## 3.3 Technical Agent（技术面试官）

负责生成技术基础问题，也就是我们常说的"**八股文**"。

它会根据简历中的技术栈生成问题：

- 如果简历写了React，可能问："React的虚拟DOM原理是什么？"
- 如果简历写了Redis，可能问："Redis有哪些数据结构？"

## 3.5 Project Agent（项目面试官）

负责生成项目经验相关的问题。

这是区别于普通面试系统的关键。它会深入挖掘用户简历中的项目：

- "你在XX项目中担任什么角色？"
- "这个项目遇到了什么技术难点？怎么解决的？"
- "你负责的模块性能如何优化的？"

## 3.6 FollowUp Agent（深挖专家）⭐

这是最有价值的Agent之一。

**它的工作不是生成新问题，而是"**追问**"。**

它会基于：

- 当前问题
- 用户回答
- Evaluation结果（特别是"知识缺口"）

来发现用户没有说清楚的地方，进行深度追问。

**举个真实的工作场景：**

用户回答：

> "我使用Redis缓存数据，减少数据库压力。"

Evaluation发现的知识缺口：

> "没有说明缓存一致性方案"

FollowUp生成追问：

> "如果数据库更新成功，但Redis删除失败，如何保证数据一致性？有没有考虑过使用缓存击穿、缓存雪崩的解决方案？"

## 3.7 Evaluation Agent（评分员）

负责评价用户的回答。

**输出结构**：

```json
{
  "score": 7,
  "feedback": "回答思路清晰，但缺少关键细节",
  "strengths": ["对Redis基本用法熟悉"],
  "weaknesses": ["缺少缓存一致性方案", "没有提到缓存淘汰策略"],
  "knowledgeGap": ["缓存一致性", "Redis集群"],
  "profileUpdate": { "skill": "Redis", "level": 6, "confidence": 0.7 }
}
````

这个结果会作为后续Agent的输入，特别是FollowUp Agent会根据`knowledgeGap`来生成追问。

## 3.8 Memory Agent（记录员）

负责维护用户的**能力画像**。

每次Evaluation完成后，它会更新用户的能力画像：

```json
{
  "skills": {
    "React": { "level": 8, "confidence": 0.9 },
    "Redis": { "level": 6, "confidence": 0.7 },
    "Node.js": { "level": 7, "confidence": 0.85 }
  },
  "overallLevel": 7.2
}
```

这个画像会影响后续的问题难度和考察方向。

---

# 四、实际工作流程

## 4.1 面试开始阶段

```
用户选择简历和岗位 → startLangGraphInterview()
                            │
                            ▼
              Supervisor生成第一个问题（自我介绍）
                            │
                            ▼
              将面试状态保存到sessionStore
                            │
                            ▼
              返回第一个问题给用户
```

## 4.2 每轮问答流程

```
用户回答问题 → submitLangGraphAnswer()
                      │
                      ▼
              Evaluation Agent评估回答
                      │
                      ▼
              Memory Agent更新能力画像
                      │
                      ▼
              判断是否需要追问
                │           │
              是           否
                │           │
                ▼           ▼
      FollowUp Agent    Strategy Agent
      生成追问问题      制定面试策略
               │            │
               │            ▼
               │    Question Planner
               │      选择问题生成器
               │           │
               │           ▼
               │   Technical/Project
               │     Agent生成问题
               │           │
               └─────┬─────┘
                     ▼
              返回问题给用户
```

## 4.3 面试结束阶段

```
所有问题回答完毕 → generateReport()
                      │
                      ▼
              根据问答记录生成面试报告
                      │
                      ▼
              保存到数据库
                      │
                      ▼
              返回报告给用户
```

---

# 五、性能优化实践

## 5.1 问题：多Agent导致延迟增加

Multi-Agent架构的一个明显问题是：**LLM调用次数增加了**。

原来单Agent每轮只需要调用2次LLM（评价+生成问题），在最初的Multi-Agent设计中，可能需要4次（评价+策略+问题规划+生成问题）。

## 5.2 优化1：合并策略和问题生成 ⭐

这是最有效的优化。

**问题分析**：

在最初的设计中，Strategy Agent 和 Question Planner Agent 是两个独立的模块：

- Strategy Agent 负责分析当前状态，决定下一个考察方向
- Question Planner Agent 负责根据策略，选择合适的问题生成器

两者需要两次独立的 LLM 调用，而且策略分析的结果需要传递给问题规划，这会造成上下文信息的丢失。

**优化方案**：

创建一个新的 `Interview Decision Agent`，将策略分析和问题生成整合到一次 LLM 调用中。

**优化前架构**：

```
                    Supervisor
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
  Strategy Agent     Evaluation Agent    Memory Agent
         │
         ▼
  Question Planner Agent
         │
   ┌────┴────┬────┴────┐
   ▼         ▼         ▼
Technical  Project  FollowUp
  Agent     Agent    Agent
```

**优化后架构**：

```
                    Supervisor
                           │
                           ▼
              Interview Decision Agent
           (策略规划 + 问题生成)
                           │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
       Technical      Project      FollowUp
         Agent         Agent        Agent
                           │
                           ▼
                 Evaluation Agent
                           │
                           ▼
                    Memory Agent
```

**优化前流程**（每轮问答）：

```
用户回答 → Evaluation → Strategy → Question Planner → 生成问题
         (1次LLM)    (1次LLM)    (1次LLM)      (1次LLM)
总耗时 = 4 × LLM响应时间
```

**优化后流程**（每轮问答）：

```
用户回答 → Evaluation → Interview Decision → 生成问题
         (1次LLM)           (1次LLM，整合策略+规划+生成)
总耗时 = 2 × LLM响应时间
```

**优化效果**：

- **减少50%的LLM调用次数**：从每轮4次减少到2次
- **降低延迟**：响应时间显著缩短，用户体验更流畅
- **提升问题质量**：策略和问题生成在同一个上下文中完成，避免信息丢失
- **简化架构**：减少了Agent数量，降低了系统复杂度

**实现方式**：

将 Strategy Agent 的策略分析逻辑和 Question Planner 的问题选择逻辑，整合到新创建的 `Interview Decision Agent` 的 `generateNextQuestion` 方法中。这样一次 LLM 调用就能完成：

1. 分析当前面试状态和候选人能力画像
2. 决定下一个考察方向和难度
3. 选择合适的问题生成器（Technical/Project/FollowUp）
4. 生成具体的面试问题

## 5.3 优化2：简历内容只提取一次

原来每次调用LLM时，都要把简历从JSON格式转换成文本格式。现在我在面试开始时提取一次，之后所有Agent都共享这个文本：

```typescript
// interview.agent.ts - 面试开始时
const resumeText = getResumeText(resumeContent);

const sessionData = {
  resumeContent,
  resumeText, // 预计算的文本格式
  // ...
};
```

这样不仅减少了重复计算，还保证了简历格式的一致性。

## 5.4 优化3：提取公共工具函数

原来每个Agent文件里都有一个`getResumeText`函数，代码重复。我把它提取到了单独的工具文件中：

```typescript
// utils.ts - 统一的工具函数
export function getResumeText(resumeContent: any): string {
  // 将结构化简历转为文本
}

export function getRelevantResumeSection(
  resumeContent: any,
  topic: string
): string {
  // 根据主题提取相关章节
}
```

## 5.5 优化4：调整超时时间

由于LLM调用次数增加，我把前端的超时时间从2分钟增加到了5分钟：

```typescript
// interview.api.ts
request({
  timeout: 5 * 60 * 1000, // 5分钟
});
```

---

# 六、技术栈说明

## 6.1 后端框架

- **Node.js + Express**：API服务器
- **LangChain**：LLM调用和Agent基础能力
- **LangGraph**：Agent工作流编排
- **PostgreSQL + Prisma**：数据持久化
- **MemoryVectorStore**：向量存储（当前使用内存实现，pgvector支持正在规划中）

## 6.2 前端框架

- **React + TypeScript**：UI组件
- **Mantine**：UI组件库
- **React Router**：路由管理
- **Axios**：HTTP请求

## 6.3 核心文件结构

```
backend/src/
├── ai/
│   ├── agents/
│   │   ├── interview/
│   │   │   ├── supervisor.agent.ts    # 核心调度
│   │   │   ├── decision.agent.ts      # 策略规划+问题生成
│   │   │   ├── technical.agent.ts     # 技术问题
│   │   │   ├── project.agent.ts       # 项目问题
│   │   │   ├── followup.agent.ts      # 深度追问
│   │   │   ├── evaluation.agent.ts    # 回答评价
│   │   │   ├── memory.agent.ts        # 能力画像
│   │   │   └── utils.ts               # 工具函数
│   │   └── interview.agent.ts         # 入口文件
│   ├── prompts/
│   │   └── interview/                 # 提示词模板
│   └── types/
│       └── interview.types.ts         # 类型定义
├── controllers/
│   └── interview.controllers.ts       # API控制器
├── services/
│   └── interview.service.ts           # 业务逻辑
└── routes/
    └── interview.routes.ts            # 路由配置
```

---

# 七、总结与思考

## 7.1 Multi-Agent带来的收益

1. **提升问题质量**：每个Agent专注于自己的领域，问题更加专业和有针对性
2. **提升追问能力**：FollowUp Agent专门负责深挖，能发现单Agent忽略的知识缺口
3. **提升系统可扩展性**：新增领域只需要添加新的Agent，不需要修改现有代码
4. **提升可维护性**：每个Agent有独立的Prompt和测试方式，方便单独优化

## 7.2 未来规划

1. **接入pgvector**：将内存向量存储替换为PostgreSQL + pgvector，支持跨会话的长期记忆
2. **模型分层**：简单任务使用轻量级模型，复杂分析使用大模型，降低成本
3. **并行执行**：Evaluation和Memory更新可以并行执行，减少响应时间
4. **多轮面试**：基于用户能力画像，实现个性化的多轮面试体验

## 7.3 给初学者的建议

如果你也想尝试Multi-Agent架构，可以从以下几点入手：

1. **先做好单Agent**：确保单Agent能稳定运行，再考虑拆分
2. **明确职责边界**：每个Agent只做一件事，不要让它们承担太多职责
3. **从简单场景开始**：先实现核心流程，再逐步增加功能
4. **关注性能优化**：多Agent会增加LLM调用次数，需要提前考虑优化方案

Multi-Agent不是银弹，但在需要复杂决策和多步骤处理的场景下，它确实能带来显著的优势。希望这篇文章能对你有所启发！
