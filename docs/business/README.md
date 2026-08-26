# Wex Agent Business

Status: Current
Last verified: 2026-08-26
Read when: 任何可能影响产品行为、业务规则、权限、状态或验收标准的任务
Applies to: Wex 当前产品定义、业务域和 Codex 任务路由

## Related

- Glossary: `docs/glossary.md`
- Documentation: `docs/README.md`
- Design: `DESIGN.md` and `docs/design/README.md`
- Technical: `docs/technical/README.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

本文是 Wex Agent 的业务入口。它用于确定产品服务谁、当前提供什么、核心对象如何关联，以及一次修改还需要读取哪些领域文档。

业务文档描述当前产品事实、已经确认的规则和必要边界，不把目标架构或预留类型描述成可用能力。文档与代码不一致时，必须先确认差异属于实现缺陷、文档过期还是已批准但尚未交付的变更。

## Product

Wex 是一个以对话为主要入口的 AI 网站创作工作台。用户创建 Project，在 Project 工作区中与 Wex 对话，并保存可持续迭代的创作上下文。

当前产品已经打通账号访问、Project 管理、持久化消息、Agent Run 和流式文本回复。Wex Agent 当前没有 Tool、文件或 Sandbox 能力，因此不得声称已经修改文件、生成可运行网站或更新真实 Preview。

## Users

| User       | Goal                     | Current access                                        |
| ---------- | ------------------------ | ----------------------------------------------------- |
| 访客       | 了解产品并建立身份       | 浏览首页，进入认证流程                                |
| 已登录用户 | 围绕一个网站目标持续创作 | 进入工作台和 Project 页面，管理 Project 并与 Wex 对话 |

当前只定义个人使用语义。团队、成员和角色不属于现有权限模型。

## Capabilities

- 使用 Email/Password 或 Google 建立和恢复 Session。
- 在 Web 路由层保护工作台和 Project 页面。
- 创建、查看、打开和永久删除 Project。
- 在 Project 内保存多轮 Conversation 和 Message。
- 为每次用户发送创建持久化 Agent Run。
- 通过 SSE 增量展示 Wex 的文本回复。
- 刷新后从持久化 Message 和 active Run 恢复对话状态。

## Entities

```text
User
  -> Project
       -> Conversation
            -> Message (user)
            -> Agent Run
                 -> Message (assistant)
                 -> Agent Event[]
```

| Entity       | Meaning                                | Authority     |
| ------------ | -------------------------------------- | ------------- |
| User         | 通过 Supabase Auth 建立身份的个人用户  | Supabase Auth |
| Project      | 长期网站创作目标及下级数据的所有权根   | PostgreSQL    |
| Conversation | Project 内的有序对话容器               | PostgreSQL    |
| Message      | 用户输入或 Wex 回复的持久化内容        | PostgreSQL    |
| Agent Run    | 一次回复生成的持久化执行记录           | PostgreSQL    |
| Agent Event  | Run 内按 sequence 排序的状态或内容事件 | PostgreSQL    |

Project 工作区是组合 Projects、Conversations、Agent Runs 和 Preview 占位的页面，不是独立业务域。Preview 当前没有真实产物、权威数据或生命周期。

## Participants

| Participant  | Responsibility                            | Must not be treated as                           |
| ------------ | ----------------------------------------- | ------------------------------------------------ |
| Web          | Session 恢复、页面交互和 SSE 展示         | 服务端授权或业务权威状态                         |
| API Server   | 业务校验、编排、持久化和对外 REST/SSE     | 长时间 Agent 执行环境                            |
| Agent Worker | 领取并执行 Run，持久化 Agent Event 和结果 | 对外业务 API                                     |
| Wex Agent    | 根据持久化对话上下文生成文本              | 已具备文件、Shell 或 Preview 能力的 Coding Agent |
| LiteLLM      | 按稳定模型别名路由模型请求                | 业务状态来源                                     |
| Supabase     | Auth、PostgreSQL 和业务函数               | 前端路由保护的替代品                             |

## Main Flow

```text
访客
  -> 登录或首次注册
  -> 工作台
  -> 创建或打开 Project
  -> 取得最近的 Conversation；没有则创建
  -> 发送 User Message
  -> 原子创建 Assistant Message 与 queued Agent Run
  -> Worker 领取 Run 并调用 Wex Agent
  -> Agent Event 持久化
  -> Web 通过 SSE 展示流式回复
  -> Run 与 Assistant Message 进入一致终态
```

刷新页面时，Message 和 active Run 以服务端持久化数据为准；浏览器乐观消息和 SSE 连接状态都不是业务权威状态。

## Domain Map

| Domain                       | Owns                                       | Read                                                            |
| ---------------------------- | ------------------------------------------ | --------------------------------------------------------------- |
| Identity and Access          | 身份流程、Session、redirect 和数据访问边界 | [Identity and Access](identity-and-access.md)                   |
| Projects                     | Project 创建、展示、打开、删除和所有权根   | [Projects](projects.md)                                         |
| Conversations and Agent Runs | Message 持久化、Agent Run 和流式事件       | [Conversations and Agent Runs](conversations-and-agent-runs.md) |

只有形成独立用户目标、权威数据和生命周期的概念才建立业务模块。页面组合视图和没有真实产物的 Preview 占位不单独建立业务域。

## Capability Status

以下状态只用于区分当前事实，不作为未来功能清单：

- **已实现**：代码与数据结构已经提供，修改时必须考虑回归和兼容。
- **已定义未闭环**：业务规则已经确认，但当前实现不完整，不得描述为已具备。
- **暂不支持**：为理解当前规则所必需的能力边界，不得从预留类型推断为可用功能。

| Capability                     | Status       | Current fact                                           |
| ------------------------------ | ------------ | ------------------------------------------------------ |
| Email/Password 与 Google 登录  | 已实现       | 使用 Supabase Auth，首次邮箱注册需要确认链接           |
| Web 受保护路由                 | 已实现       | `/workspace` 和 `/projects/:id` 要求浏览器存在 Session |
| API 鉴权与数据所有权           | 已定义未闭环 | API 尚未验证 Bearer Token，`owner_id` 仍可为空         |
| Project 创建、列表、打开、删除 | 已实现       | 删除为不可恢复的物理删除，并级联删除对话数据           |
| 持久化多轮对话                 | 已实现       | Web 当前只使用最近活跃的 Conversation                  |
| Agent 流式文本回复             | 已实现       | 使用固定 `main-chat`、`gpt-5.6-luna`，且没有 Tool      |
| Project 归档                   | 暂不支持     | 数据状态有预留，但没有业务操作入口                     |
| Run 控制                       | 暂不支持     | 取消、重试、恢复和审批没有产品闭环                     |
| 网站产物                       | 暂不支持     | 代码生成、Sandbox 和真实 Preview 尚未接入              |

## Task Routing

每次产品改动先读本文和 [`../glossary.md`](../glossary.md)，再根据影响范围选读。

| Task keywords or scope                    | Continue reading                                                                                                    |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 登录、注册、Session、退出、redirect、权限 | `identity-and-access.md`、`../design/identity-and-access.md`、`../technical/identity-and-access.md`                 |
| 工作台、Project 创建、列表、删除、归档    | `projects.md`、`../design/projects.md`、`../technical/projects.md`                                                  |
| Conversation、Message、聊天输入、SSE      | `conversations-and-agent-runs.md`、`../design/project-workspace.md`、`../technical/conversations-and-agent-runs.md` |
| Worker、Agent、模型、事件、Run 状态       | `conversations-and-agent-runs.md`、`../technical/conversations-and-agent-runs.md`、`../technical/model-gateway.md`  |
| Project 双栏、移动端、Preview 占位        | `projects.md`、`conversations-and-agent-runs.md`、`../design/project-workspace.md`                                  |
| Sandbox 或真实 Preview                    | 本文的能力边界、`../technical/architecture-roadmap.md`                                                              |
| 公共契约、数据库或跨应用边界              | 对应领域文档和根目录 `ARCHITECTURE.md`                                                                              |

## Change Checklist

开始实现前必须确认：

- [ ] 这次改变的用户结果和涉及的业务对象已经明确
- [ ] 每个业务对象的权威状态来源已经明确
- [ ] 相关 Rules、Invariants 和 Edge Cases 已经检查
- [ ] 当前能力状态没有被预留类型或目标架构夸大
- [ ] 权限、数据、契约和失败语义的影响已经识别
- [ ] Business、Design、Technical 和代码之间没有未解释冲突
- [ ] 验收标准覆盖成功、失败、空状态和重复操作

## Maintenance

- 本目录只描述当前业务事实、明确不变量和理解当前行为所需的能力边界。
- 业务行为变化时，必须先更新对应领域文档，再同步契约、数据、实现和验收。
- 新业务域必须同时更新 Domain Map、Capability Status 和 Task Routing。
- 设计细节归入 `docs/design/`，实现链路和已确认的技术缺口归入 `docs/technical/`。
- 已批准但尚未交付的需求应进入需求或计划文档，完成后再合入当前业务文档。
- Related 只链接真实存在且与当前模块相关的事实来源。
