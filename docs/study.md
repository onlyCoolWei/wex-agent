# Coding Agent 开源项目研究指南

如果目标是构建一个类似 Lovable、Claude Code 或 Codex 的 AI Software Engineer，真正值得研究的并不只是产品 UI，而是其背后的：

- Agent Harness / Runtime
- Agent Loop
- Context Engineering
- Session 与状态管理
- Workspace 与 Sandbox
- Human-in-the-loop
- Evaluation

本文选取 5 个有代表性的开源项目，分析它们各自最值得借鉴的部分，并给出一条可执行的学习路线。

## 核心结论

| 优先级 | 项目 | 最值得研究的方向 |
| --- | --- | --- |
| 1 | OpenHands | 完整 Software Engineering Agent 架构、生命周期、Sandbox、Eval |
| 2 | Pi | 精简的 Coding Agent Runtime、Context、Session、Compaction |
| 3 | OpenCode | 完整开源 Coding Agent 产品、TypeScript 工程实现 |
| 4 | Aider | Codebase Map、Git、Lint/Test、错误修复等工程细节 |
| 5 | SWE-agent / mini-SWE-agent | Agent Loop、SWE-bench 与任务级 Evaluation |

如果按源码学习价值排序，建议优先阅读：

```text
Pi -> OpenCode -> OpenHands -> Aider -> mini-SWE-agent
```

如果按构建完整产品的参考价值排序，则建议优先关注：

```text
OpenHands -> OpenCode -> Pi -> Aider -> mini-SWE-agent
```

## 1. OpenHands：完整 Software Engineering Agent

如果目标是构建类似 Lovable 的 AI Software Engineer，OpenHands 是最值得重点研究的开源项目之一。

OpenHands 已将 Agent 核心能力独立为 **OpenHands Software Agent SDK**，它也是 OpenHands CLI 和 Cloud 背后的 Agent 引擎，覆盖：

- Agent Loop
- Code Agent
- Tools
- Memory
- Skills / Context
- Sandbox
- Agent Server
- 生命周期控制
- Multi-Agent
- Evaluation
- 本地与远程 Workspace

SDK 既可以直接运行在本地 Workspace，也支持通过 Docker 或 Kubernetes 运行临时 Workspace。其配套论文还将 memory management、custom tools、sandboxed execution、lifecycle control、multi-LLM routing、security analysis 和 evaluation 等能力列为生产级 Agent 的核心组成部分。参见 [OpenHands Software Agent SDK][1] 与 [相关论文][2]。

### 研究重点

不要只研究 OpenHands UI，应直接阅读 Software Agent SDK，并重点追踪以下数据流：

```text
Agent
  -> Agent Loop
  -> Action
  -> Observation
  -> State
  -> Memory
  -> Context
  -> Workspace
  -> Lifecycle
```

OpenHands 最适合用来理解：一个完整的 Software Engineering Agent 如何组织运行时、工作区、安全边界和生命周期。

## 2. Pi：Context、Session 与 Compaction

如果说 OpenHands 适合研究完整的 Software Engineering Agent，那么 Pi 更适合研究 Coding Agent Runtime 的内核设计。

Pi 的核心 Runtime 较小，并通过 Extension 扩展能力。研究时应重点阅读：

```text
pi-agent-core
```

### 研究重点

- Agent Loop
- Session
- Context
- Compaction
- Event
- Tool Execution
- Extension
- State

Pi 尤其适合回答这些问题：

- Context 如何构建与更新？
- Session 如何保存完整执行过程？
- 长对话如何压缩，同时保留关键状态？
- Tool 执行如何转化为事件并反馈给 Agent？
- Runtime 如何保持精简，同时允许能力扩展？

## 3. OpenCode：完整的开源 Coding Agent 产品

如果目标是构建类似 Claude Code 或 Codex 的 Coding Agent，OpenCode 很适合直接阅读源码。它的主要价值在于：它不仅是一个 Agent Runtime，也是一个完整的开源 Coding Agent 产品。

可以沿着下面的主流程阅读：

```text
User Message
  -> Session
  -> Agent
  -> LLM
  -> Tool
  -> Tool Result
  -> Context
  -> Compaction
  -> Continue Loop
```

### 研究重点

- Session 与消息模型
- Agent Loop 与 Tool 调度
- Context 组装与 Compaction
- 用户打断与任务恢复
- Human Approval
- 可观测性
- TypeScript 工程组织

OpenCode 使用 TypeScript，对计划采用 TypeScript 构建 Agent 产品的团队尤其有参考价值。

## 4. Aider：成熟 Coding Agent 的工程细节

Aider 的架构不像 Pi 或 OpenHands 那样强调通用 Agent Runtime，但它在真实 Coding Agent 场景中经过了长期打磨。

其主要能力包括：

- Codebase Map
- Git 集成与自动提交
- Lint 与 Test
- Error Feedback
- 自动修复
- Image / Web Context
- 多模型支持
- 持续 Agent Loop

如果要研究“Coding Agent 如何长期、稳定地与真实代码库协作”，Aider 很有价值。尤其值得关注代码库上下文选择、Git 工作流，以及构建或测试失败后的反馈闭环。参见 [Aider GitHub 仓库][3]。

## 5. SWE-agent / mini-SWE-agent：任务级 Evaluation

SWE-agent 面向真实 GitHub Issue 和 Software Engineering Task，并将 benchmark 与 SWE-bench 作为重要组成部分。官方建议新的研究工作优先使用更简单、更易于理解的 mini-SWE-agent。参见 [SWE-agent 文档][4]。

它最值得研究的部分是 **Evaluation**。

通用 Agent Framework 的评测常停留在：

```text
LLM Response 是否正确？
```

Coding Agent 的评测则需要覆盖完整任务链路：

```text
用户需求
  -> Agent 执行
  -> 修改代码
  -> Build
  -> Test
  -> Runtime Verification
  -> 是否真正完成任务？
```

因此，Coding Agent 的评测对象不应只是单次模型输出，而应是最终代码状态和可验证的任务结果。

## 能力映射

| 目标能力 | 推荐研究项目 |
| --- | --- |
| Agent Loop | Pi / OpenHands / OpenCode |
| Context Engineering | Pi / OpenCode |
| Context Compaction | Pi / OpenCode / OpenHands |
| Memory | OpenHands / Pi |
| System Prompt | OpenCode / OpenHands / Pi |
| Session | Pi / OpenCode |
| Retry | OpenHands / OpenCode |
| Interrupt | OpenHands / Pi |
| Resume | OpenHands / Pi |
| Human Approval | OpenHands / OpenCode |
| Sandbox | OpenHands |
| Workspace | OpenHands |
| Codebase Context | Aider |
| Git | Aider |
| Error -> Repair | Aider / OpenHands |
| Evaluation | SWE-agent / OpenHands |
| Multi-Agent | OpenHands |
| Tool Abstraction | Pi / OpenHands |
| Observability | OpenHands / OpenCode |
| TypeScript 工程实现 | Pi / OpenCode |

## 目标架构：Coding Agent Runtime

综合这些项目后，最终需要构建的并不是另一个通用 Agent Framework，而是面向软件开发任务的 Coding Agent Runtime。

```text
                  Coding Agent Runtime
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
      Agent Loop      Context Engine       State
          |                |                |
          v                v                v
       Tool Call       Compaction         Session
          |                |                |
          v                v                v
       Workspace          Memory          Resume
          |
          v
        Sandbox
          |
          v
      Build / Test
          |
          v
    Error Detection
          |
          v
      Auto Repair
          |
          +------------------------------> Agent Loop
```

Runtime 外层再承载产品能力：

```text
                     Product Layer
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
         Chat            Project          Preview
          |                |                |
          +----------------+----------------+
                           |
                           v
                  Coding Agent Runtime
```

产品层决定用户如何与 Agent 交互；Runtime 则决定 Agent 能否可靠、安全、可恢复地完成工程任务。

## 核心概念拆分

### Context

Context 是当前这一轮实际提供给模型的信息：

```text
System Prompt
+ Current Task
+ Relevant Files
+ Tool Results
+ Project Rules
```

它具有明确的窗口限制，需要根据当前任务动态选择、排序和压缩。

### Memory

Memory 是跨任务保留、未来仍可能复用的知识，例如：

```text
项目使用 Next.js
API 遵循某项规范
用户有特定偏好
过去曾解决某类问题
```

Memory 不应无条件全部注入 Context，而应按当前任务检索和筛选。

### Session

Session 是一次 Agent 执行的完整状态与事件记录：

```text
User Message
  -> Agent
  -> Tool Call
  -> Tool Result
  -> Agent
  -> Tool Call
  -> ...
```

当 Session 变长时，可通过 Compaction 生成新的 Context：

```text
Session -> Compaction -> New Context
```

### 三者的关系

| 概念 | 解决的问题 | 生命周期 |
| --- | --- | --- |
| Context | 当前模型需要看到什么？ | 单轮或短周期 |
| Memory | 哪些知识需要跨任务保留？ | 长期 |
| Session | 本次执行发生了什么、当前处于什么状态？ | 单次任务全过程 |

这三个概念应在数据模型和生命周期上明确分离，否则后续的压缩、恢复、审计和调试都会变得困难。

## Interrupt、Approval 与 Resume

真正的 Coding Agent 不能只有一个不可中断的 `run()`。它需要在执行过程中响应用户打断，保存状态，并在适当的时候恢复：

```text
Agent
  -> Tool Call
  -> User Interrupt
  -> Save State
  -> Resume
  -> Continue Agent Loop
```

对于高风险工具调用，还需要 Human Approval：

```text
Potentially Destructive Action
  -> Permission Request
  -> Allow / Deny
  -> Save Decision
  -> Resume
```

这要求 Runtime 原生支持：

- 可取消的 Tool 执行
- 明确的生命周期状态
- Checkpoint 或持久化机制
- 幂等或可恢复的任务设计
- Approval 状态与审计记录

OpenHands 在这一方向尤其值得研究，因为它将 Agent 生命周期、Sandbox 和人机交互都作为 SDK 层能力来设计。

## 建议学习路线

### 第一阶段：掌握 Runtime 基础

研究对象：

```text
OpenAI Agents SDK + Pi
```

目标：理解 Agent Loop、Context、Tool、Session 和 Compaction。

建议产出：实现一个最小 Agent Runtime，支持工具调用、会话持久化和上下文压缩。

### 第二阶段：理解 Coding Agent 产品化

研究对象：

```text
OpenCode + OpenHands
```

目标：理解如何将 Agent Runtime 做成真正可用的 Coding Agent 产品。

建议产出：补充 Workspace、Sandbox、Interrupt、Resume、Approval 和 Observability。

### 第三阶段：建立任务级评测

研究对象：

```text
SWE-agent / mini-SWE-agent + OpenHands Evaluation
```

目标：理解 Coding Agent 如何通过真实工程任务进行评测。

建议产出：建立包含代码修改、构建、测试和运行时验证的 Eval Pipeline。

### 第四阶段：构建自己的 Coding Agent Runtime

在 OpenAI Agents SDK 的基础上逐步加入：

```text
Context Manager
+ Memory
+ Compaction
+ Session
+ Interrupt
+ Approval
+ Retry
+ Evaluation
+ Sandbox
```

完成这一阶段后，关注点就不再是“选择哪个 Agent 框架”，而是形成自己的 Coding Agent Runtime。

## 最终判断

Lovable 类产品的核心壁垒之一，不是 UI，而是能否构建一套可靠的 Coding Agent Runtime，包括：

- 高质量的 Context Engineering
- 可持续演进的 Session 与 Memory
- 安全且隔离的 Workspace / Sandbox
- 可打断、可审批、可恢复的生命周期
- 基于真实工程结果的 Evaluation
- 从错误检测到自动修复的执行闭环

近期研究也开始将 **Agent Harness 本身**视为影响成功率、Token 消耗和整体性能的重要变量，而不再只比较底层模型。一项 2026 年研究对 Goose、OpenHands SDK 和 OpenCode 等不同 Harness 进行同模型比较，发现 Harness 的选择可能使每个成功任务的 Token 成本产生最高约 40 倍的差异。参见 [The Scaffold Effect in Coding Agents][5]。

因此，研究这些项目时，最值得借鉴的不是界面，而是它们背后的 **Harness、Runtime、Context Engineering 和 Evaluation**。

[1]: https://github.com/OpenHands/software-agent-sdk/blob/main/README.md "OpenHands Software Agent SDK"
[2]: https://arxiv.org/abs/2511.03690 "The OpenHands Software Agent SDK"
[3]: https://github.com/Aider-AI/aider "Aider"
[4]: https://github.com/SWE-agent/SWE-agent/blob/main/docs/index.md "SWE-agent"
[5]: https://arxiv.org/abs/2607.22585 "The Scaffold Effect in Coding Agents"
