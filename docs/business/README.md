# Wex Agent 业务知识库

Status: Current
Last verified: 2026-08-26
Read when: 任何可能影响产品行为、业务规则、权限、状态或验收标准的任务
Applies to: Wex 当前产品定义、业务域和 Codex 任务路由

## Related

- Glossary: `docs/glossary.md`
- Design: `DESIGN.md` and `docs/design/README.md`
- Architecture: `ARCHITECTURE.md`
- Technical: `docs/technical/README.md`

## Purpose

本文是 Wex Agent 的业务入口，也是 Coding Agent 修改产品行为前的必读文档。它回答产品服务谁、当前已经提供什么、核心对象如何关联，以及不同需求还需要阅读哪些领域文档。

> 最后校准日期：2026-08-25。业务文档描述当前产品规则；技术方案描述实现方式或演进计划。文档与代码不一致时，不要静默选择一方，应先确认差异属于实现缺陷、文档过期还是尚未完成的规划。

## 1. 产品定义

Wex 是一个以对话为主要入口的 AI 网站创作工作台。用户创建 Project，在项目工作区中与 Wex 对话，并逐步获得可预览、可继续迭代的网站。

当前产品处于“持久化对话闭环”阶段：账号访问、Project 管理、持久化消息、Agent Run 和流式回复已经打通；代码生成、Sandbox Workspace、文件操作和真实站点 Preview 尚未接入。因此当前的 Wex Agent 是无工具的对话助手，不能声称已经修改文件或生成可运行网站。

### 目标用户

- 希望通过自然语言创建网站的个人创作者。
- 需要持续迭代同一个网站 Project，而不是只获得一次性回答的用户。
- 当前阶段只支持个人使用语义，尚无团队、成员角色和共享协作能力。

### 核心价值

- 用 Project 保存长期创作上下文。
- 用 Conversation 和 Message 保存用户与 Agent 的连续交流。
- 用 Agent Run 记录每一次模型执行，使回复可以流式展示、失败可解释、刷新可恢复。
- 未来通过 Sandbox 和 Preview 将对话结果连接到真实网站产物。

### 当前非目标

- 团队空间、Project 成员和细粒度角色权限。
- 模板市场、发布、域名、计费和用量套餐。
- 文件树、代码编辑器、版本历史和可恢复 Checkpoint。
- Tool 审批、Run Resume/Retry、多个并行 Conversation 的完整 UI。

## 2. 角色与系统参与者

| 参与者       | 定义                                         | 当前能力                                         |
| ------------ | -------------------------------------------- | ------------------------------------------------ |
| 访客         | 没有有效 Supabase Session 的访问者           | 浏览首页，进入认证流程                           |
| 已登录用户   | 浏览器中存在有效 Supabase Session 的个人用户 | 进入工作台和 Project 页面，使用当前业务功能      |
| Wex Agent    | 面向用户输出回复的 AI 助手                   | 理解对话上下文并生成文本；无 Tool 和文件能力     |
| API Server   | 对外业务入口                                 | Project、Conversation、Message、SSE 的校验与编排 |
| Agent Worker | 后台执行者                                   | 领取排队中的 Run，调用模型并持久化事件与结果     |
| LiteLLM      | 统一模型网关                                 | 根据稳定模型别名路由请求                         |
| Supabase     | 认证和业务数据基础设施                       | Auth、PostgreSQL、业务函数和持久化               |

重要限制：Web 已限制未登录用户访问业务页面，但 API 尚未验证用户 Session，也未按 `owner_id` 隔离数据。这是安全闭环缺口，不能把前端路由保护当成服务端授权。

## 3. 核心业务链路

```text
访客
  -> 登录或首次注册
  -> 工作台
  -> 创建或打开 Project
  -> 自动取得最近的 Conversation；没有则创建
  -> 发送 Message
  -> 创建 queued Agent Run 与 assistant 占位消息
  -> Worker 领取 Run 并调用 Wex Agent
  -> Agent Event 持久化
  -> Web 通过 SSE 展示流式回复
  -> Run completed / failed / cancelled

Project 工作区右侧 Preview
  -> 当前仅为状态占位
  -> 尚未连接 Agent 输出、代码文件或 Sandbox
```

刷新页面时，Message 和活跃 Run 以服务端持久化数据为准；浏览器中的乐观消息和连接状态都不是业务权威状态。

## 4. 领域与数据关系

```text
User
  -> Project
       -> Conversation
            -> Message (user)
            -> AgentRun
                 -> Message (assistant)
                 -> AgentEvent[]

Project
  -> Sandbox Workspace   [未实现]
       -> Files          [未实现]
       -> Preview        [未实现]
```

| 领域       | 负责的问题                                   | 必读文档                                            |
| ---------- | -------------------------------------------- | --------------------------------------------------- |
| 身份与访问 | 谁可以进入产品，登录后返回哪里，权限如何判断 | [身份与访问](identity-and-access.md)                |
| Project    | 用户长期创作对象如何创建、展示和删除         | [Project](projects.md)                              |
| 对话与运行 | 消息如何持久化，Agent 如何生成并流式返回回复 | [对话与 Agent Run](conversations-and-agent-runs.md) |

Project Workspace 是组合 Projects、Conversations、Agent Runs 和 Preview 占位的页面，不是独立业务域。Preview 当前没有真实产物、权威数据或生命周期，达到独立业务边界前不创建业务模块文档。

## 5. 能力状态

使用以下标记阅读所有业务文档：

- **已实现**：当前代码与数据结构已提供，修改时必须考虑回归和兼容。
- **已定义未闭环**：产品规则已明确，但实现只完成一部分；不能描述为已具备。
- **暂不支持**：不属于当前行为，除非需求明确要求，否则不要顺手实现。

| 能力                           | 状态         | 说明                                                   |
| ------------------------------ | ------------ | ------------------------------------------------------ |
| Email/Password 与 Google 登录  | 已实现       | 使用 Supabase Auth，首次邮箱注册需要确认链接           |
| Web 受保护路由                 | 已实现       | `/workspace` 和 `/projects/:id` 要求浏览器存在 Session |
| API 鉴权与数据所有权           | 已定义未闭环 | API 尚未校验 Bearer Token，`owner_id` 仍可为空         |
| Project 创建、列表、打开、删除 | 已实现       | 删除为不可恢复的物理删除，并级联删除对话数据           |
| Project 归档                   | 暂不支持     | 数据状态预留 `archived`，没有业务操作入口              |
| 持久化多轮对话                 | 已实现       | UI 当前只使用最近一个 Conversation                     |
| Agent 流式文本回复             | 已实现       | 固定 `main-chat`、`gpt-5.6-luna`、无 Tool              |
| 取消、重试、恢复、审批         | 暂不支持     | 类型或 Runtime 可能有预留，但不是可用产品能力          |
| 代码生成与文件修改             | 暂不支持     | Agent 没有文件系统或 Shell Tool                        |
| Sandbox 与真实 Preview         | 暂不支持     | 右侧面板是占位 UI，不代表已生成站点                    |

## 6. Codex 按任务选读

每次产品改动先读本文和 [`../glossary.md`](../glossary.md)，再根据影响范围选读；不要默认把所有技术方案都装入上下文。

| 任务关键词或修改范围                      | 继续阅读                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 登录、注册、Session、退出、redirect、权限 | `identity-and-access.md`、`../design/identity-and-access.md`、`../technical/identity-and-access.md`                 |
| 工作台、Project 创建/列表/删除/归档       | `projects.md`、`../design/projects.md`、`../technical/projects.md`                                                  |
| Conversation、Message、聊天输入、SSE      | `conversations-and-agent-runs.md`、`../design/project-workspace.md`、`../technical/conversations-and-agent-runs.md` |
| Worker、Agent、模型、事件、Run 状态       | `conversations-and-agent-runs.md`、`../technical/conversations-and-agent-runs.md`、`../technical/model-gateway.md`  |
| Project 双栏、移动端、Preview 占位        | `projects.md`、`conversations-and-agent-runs.md`、`../design/project-workspace.md`                                  |
| Sandbox 或未来真实 Preview                | 当前业务能力状态、`../technical/architecture-roadmap.md`；形成独立生命周期后再建立对应模块文档                      |
| 公共契约、数据库或跨应用边界              | 对应领域文档、根目录 `ARCHITECTURE.md`，并检查生产者和消费者                                                        |

## 7. 需求判断顺序

Codex 开始实现前，应按顺序回答：

1. 这次改变哪个用户结果？
2. 涉及哪些业务对象，其权威状态存在哪里？
3. 哪些业务不变量不能被破坏？
4. 当前能力是已实现、未闭环还是暂不支持？
5. 是否改变权限、数据、跨应用契约或失败语义？
6. 业务文档、交互文档、技术方案和代码是否一致？
7. 验收标准如何覆盖成功、失败、空状态和重复操作？

如果问题无法从业务文档和代码中确定，并且不同答案会改变数据模型、权限或用户流程，应向需求方澄清，而不是自行补全产品规则。

## 8. 文档维护规则

- 本目录只描述当前业务事实、明确的不变量和已经确认的产品边界。
- 未来设想必须标为“已定义未闭环”或“暂不支持”，不能与已实现能力混写。
- 交互细节可以放在专门文档，技术选型和实施步骤放在技术方案；业务域文档只保留理解行为所需的信息。
- 业务行为变化时先更新对应领域文档，再同步契约、数据、实现和验收。
- 新增业务域时，同时更新本文的领域表、能力状态和 Codex 选读表。
- 已过期的技术方案不要继续扩写为业务事实；保留历史价值时应在开头标注状态并链接当前业务文档。
