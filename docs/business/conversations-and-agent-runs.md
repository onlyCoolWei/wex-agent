# Conversations and Agent Runs 对话与 Agent Run 业务规则

Status: Current
Last verified: 2026-08-26
Read when: 修改 Conversation、Message、Agent Run、Agent Event、聊天输入或 SSE 行为
Applies to: Project 内的持久化对话和后台执行链路

## Related

- Design: `docs/design/workspace-layout.md`
- Technical: `docs/technical/chat-agent-phase-1.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

本文定义 Project 内的 Conversation、Message、Agent Run 和 Agent Event 如何协作。详细技术方案见 [`../technical/chat-agent-phase-1.md`](../technical/chat-agent-phase-1.md) 与 [`../technical/openai-agents-litellm.md`](../technical/openai-agents-litellm.md)。

## 1. 业务目标

- 用户与 Wex 进行可持续、可刷新恢复的多轮对话。
- 每次发送都产生可追踪的 User Message、Assistant Message 和 Agent Run。
- 模型回复逐步显示，连接中断不改变服务端执行状态。
- 重复请求不重复创建消息，并发请求不会破坏消息顺序。
- 失败必须成为明确终态，不能伪装成已完成回复。

## 2. 对象职责

| 对象         | 业务职责                               | 权威数据                   |
| ------------ | -------------------------------------- | -------------------------- |
| Conversation | 在一个 Project 内组织有序消息          | PostgreSQL `conversations` |
| Message      | 保存用户输入或 Wex 回复                | PostgreSQL `messages`      |
| Agent Run    | 记录一次回复生成的排队、执行和终止状态 | PostgreSQL `agent_runs`    |
| Agent Event  | 保存 Run 的流式内容和生命周期事件      | PostgreSQL `agent_events`  |
| SSE          | 将已持久化事件传到浏览器               | 传输层，不是权威状态       |

一个 User Message 对应一个 Run；该 Run 对应一个 Assistant Message。Conversation 可以包含多个按 `position` 排序的 Message 和多个依次执行的 Run。

## 3. 当前能力

### 已实现

- 进入 Project 时列出 active Conversation，并使用最近活跃的一个；没有则自动创建“新对话”。
- Message 使用版本化纯文本结构，单次输入去除首尾空格后为 1-20000 字符。
- Web 先显示乐观 User Message，API 成功后替换为持久化记录。
- `clientMessageId` 保证同一发送重试返回原有 Message 和 Run。
- 同一 Conversation 同时只允许一个 active Run；并发发送返回冲突。
- Worker 从数据库领取 queued Run，调用 `main-chat`，并持久化 delta、usage 和终止事件。
- Web 订阅 SSE 并增量展示 Assistant Message；刷新后从 Message 和 active Run 恢复。
- Worker 会将 lease 超时的 running Run 标记为 `RUN_STALLED` 失败。
- 模型历史按 Message 顺序组装，当前最多选择最近约 80,000 个字符。

### 已定义未闭环

- API 支持列出和创建多个 Conversation，但 Web 没有会话切换、新建或归档入口。
- Message API 支持游标分页，但 Web 当前只加载首批消息，没有“加载更早消息”交互。
- Contracts 与 Runtime 预留更多 Run 状态和方法，数据库聊天闭环只实现 queued、running、cancelling、completed、failed、cancelled 的一部分路径。
- SSE 支持事件回放所需的事件序号，浏览器原生重连行为存在，但完整断线验收仍需自动化覆盖。
- 所有权字段存在，但 API 尚未按已登录用户校验 Project、Conversation 和 Run。

### 暂不支持

- 用户取消、重试、Resume 和人工 Approval 的产品闭环。
- 多 Agent Handoff、Tool Call、文件操作、Shell 和网站生成。
- 编辑、删除、重新生成或分支 Message。
- Conversation 重命名、归档、删除和切换 UI。
- 图片、附件、结构化富文本和多模态 Message。

## 4. 当前发送链路

```text
Web submit
  -> 生成 clientMessageId
  -> 插入乐观 User Message
  -> POST /conversations/:id/messages
       -> 数据库事务校验 Conversation 与内容
       -> 幂等检查 clientMessageId
       -> 检查同 Conversation 无 active Run
       -> 写 User Message (completed)
       -> 写 Assistant Message (streaming)
       -> 写 Agent Run (queued)
  -> Web 订阅 /agent-runs/:id/events
  -> Worker claim queued -> running
  -> main-chat 通过 LiteLLM 生成文本
  -> delta / usage / terminal event 持久化
  -> SSE 轮询并推送新事件
  -> Message 与 Run 进入 completed / failed / cancelled
```

API 请求失败时，Web 撤销乐观消息、恢复输入并允许用户再次发送。SSE 断开只改变浏览器连接状态，不自动取消 Run。

## 5. 状态规则

### Message

| 角色      | 允许状态    | 说明                                       |
| --------- | ----------- | ------------------------------------------ |
| user      | `completed` | 当前用户消息在 Run 创建事务中直接完成      |
| assistant | `streaming` | Run 已创建，等待或正在生成                 |
| assistant | `completed` | 完整回复已保存                             |
| assistant | `failed`    | 生成失败，可保留已产生的部分文本和稳定错误 |
| assistant | `cancelled` | Run 被取消；当前无用户取消入口             |

### Agent Run

当前可靠主路径：

```text
queued -> running -> completed
                  -> failed
                  -> cancelled
```

`cancelling` 是数据库活跃状态的一部分，但取消 API 尚未形成产品闭环。`waiting_for_approval`、`interrupted` 等 Contract 预留状态不能在缺少数据库迁移、Worker 行为和 UI 的情况下直接启用。

## 6. Agent 能力边界

当前主 Agent：

- `agentId`: `main-chat`
- 展示名称：Wex
- 模型角色：`chat`
- 当前模型别名：`gpt-5.6-luna`
- `maxTurns`: 1
- Tool：无

因此当前 Agent 只能基于 Conversation 文本进行回复。它必须明确自己没有搜索、命令执行、文件修改和外部访问能力。任何要求 Agent 生成真实网站或更新 Preview 的功能，都必须先设计 Sandbox、Tool、Artifact 和安全审批边界。

## 7. 业务不变量

- Message 顺序由服务端 `position` 决定，不能依赖浏览器到达顺序或时间戳排序。
- `clientMessageId` 在同一 Conversation 内标识一次用户意图；网络重试必须返回同一结果。
- 同一 Conversation 最多存在一个 active Run。
- User Message、Assistant Message 和 Run 必须原子创建，不能留下只有一半的业务记录。
- Event 必须先持久化再通过 SSE 推送；断开 SSE 不取消 Run。
- 每个 Run 的 Event `sequence` 单调递增且唯一，终止事件只能产生一次。
- Run 和 Assistant Message 的终态必须一致；失败内容不能标记为 completed。
- 浏览器不能直接提交 `modelAlias`、`agentId`、`ownerId` 等受服务端控制的执行策略。
- 历史上下文只使用规范化的持久化 Message，不使用浏览器乐观状态。

## 8. 修改影响检查

- Contract、migration、数据库函数、API、Worker 和 Web 是否同步理解新增字段或状态。
- 新 Run 状态是否定义所有合法进入/退出路径、终止语义和刷新恢复行为。
- 重试是否复用原请求、创建新 Attempt，还是创建新 Run；必须明确，不能覆盖历史。
- 失败、超时、重复发送、并发发送和 SSE 重连是否仍保持不变量。
- 上下文选择是否保持消息顺序并控制长度、成本和敏感信息。
- 新 Tool 是否需要 Sandbox、权限、Approval 和审计事件。

## 9. 验收基线

- 连续多轮发送后，刷新页面仍保持消息内容、角色、顺序和状态。
- 快速重复点击或网络重试不创建重复 User Message 或 Run。
- active Run 存在时第二次发送被拒绝，且不会产生孤立 Message。
- 流式文本追加到正确 Assistant Message，终止后状态一致。
- 模型或 Worker 失败时显示稳定错误，输入可恢复，历史不伪装为成功。
- SSE 重连不重复追加 delta，也不会因浏览器断开取消后台 Run。
- Agent 不声称执行当前未提供的 Tool 能力。

## 10. 实现定位

- 公共契约：`packages/contracts/src/index.ts`
- 数据与原子函数：`supabase/migrations/20260816020000_create_chat.sql`
- API：`apps/api/src/chat/`
- Worker：`apps/worker/src/chat-runs/`
- Runtime：`apps/worker/src/agent-runtime/`
- Agent 配置：`apps/worker/src/agents/main-chat-agent.config.ts`
- 模型策略：`packages/model/src/model-config.ts`
- Web Chat：`apps/web/src/pages/project/chat-panel.tsx`
