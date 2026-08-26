# Conversations and Agent Runs

Status: Current
Last verified: 2026-08-26
Read when: 修改 Conversation、Message、Agent Run、Agent Event、聊天输入或 SSE 行为
Applies to: Project 内的持久化对话和后台执行链路

## Related

- Design: `docs/design/project-workspace.md`
- Technical: `docs/technical/conversations-and-agent-runs.md`
- Model gateway: `docs/technical/model-gateway.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

- 用户与 Wex 进行可持续、刷新后可恢复的多轮对话。
- 每次发送产生可追踪的 User Message、Assistant Message 和 Agent Run。
- 模型回复逐步显示，浏览器连接状态不改变服务端执行状态。
- 重复或并发请求不得制造重复消息、孤立记录或错误顺序。
- 失败必须成为明确终态，不得伪装成已完成回复。

## Capabilities

- 进入 Project 时使用最近活跃的 Conversation；没有时自动创建“新对话”。
- 接收去除首尾空格后 1-20000 字符的纯文本 Message。
- 使用乐观 User Message 提供即时反馈，并以持久化记录替换。
- 使用 `clientMessageId` 幂等处理同一次发送的网络重试。
- 同一 Conversation 同时只执行一个 active Run。
- 由 Worker 领取 queued Run，调用 `main-chat` 并持久化事件和终态。
- 通过 SSE 增量展示 Assistant Message，并在刷新后恢复消息和 active Run。
- 将 lease 超时的 running Run 标记为 `RUN_STALLED` 失败。

## Entities

| Entity       | Meaning                                | Authority                  |
| ------------ | -------------------------------------- | -------------------------- |
| Conversation | 在一个 Project 内组织有序 Message      | PostgreSQL `conversations` |
| Message      | 保存用户输入或 Wex 回复                | PostgreSQL `messages`      |
| Agent Run    | 记录一次回复生成的排队、执行和终止状态 | PostgreSQL `agent_runs`    |
| Agent Event  | 保存 Run 的流式内容和生命周期事件      | PostgreSQL `agent_events`  |
| SSE          | 把已持久化事件传输到浏览器             | 非权威传输层               |

一个 User Message 对应一个 Agent Run，该 Run 对应一个 Assistant Message。Conversation 包含多个按 `position` 排序的 Message，以及多个依次执行的 Run。

## States

### Message

| Role      | State       | Meaning                                |
| --------- | ----------- | -------------------------------------- |
| user      | `completed` | User Message 在 Run 创建事务中直接完成 |
| assistant | `streaming` | Run 已创建，正在等待或生成回复         |
| assistant | `completed` | 完整回复已经保存                       |
| assistant | `failed`    | 生成失败，可以保留部分文本和稳定错误   |
| assistant | `cancelled` | Run 已取消；当前没有用户取消入口       |

### Agent Run

当前可靠主路径：

```text
queued -> running -> completed
                  -> failed
                  -> cancelled
```

`cancelling` 属于数据库 active 状态，但取消 API 尚未形成产品闭环。`waiting_for_approval`、`interrupted` 等 Contract 预留状态不得在缺少数据库、Worker 和 UI 支持时启用。

## Rules

- Message 顺序必须由服务端 `position` 决定。
- `clientMessageId` 必须在同一 Conversation 内标识一次用户发送意图。
- 同一 Conversation 最多存在一个 active Run。
- User Message、Assistant Message 和 Run 必须原子创建。
- Agent Event 必须先持久化，再通过 SSE 推送。
- 每个 Run 的 Event `sequence` 必须单调递增且唯一。
- 历史上下文必须使用规范化的持久化 Message，并按顺序组装。
- 当前模型历史最多选择最近约 80,000 个字符。

## Invariants

- 网络重试必须返回同一 Message 和 Run，不得重复创建业务记录。
- 浏览器到达顺序和时间戳不得覆盖服务端 Message 顺序。
- SSE 断开不得自动取消 Agent Run。
- 每个 Run 只能产生一次终止事件。
- Run 与 Assistant Message 的终态必须一致；失败内容不得标记为 `completed`。
- 浏览器不得提交 `modelAlias`、`agentId`、`ownerId` 等服务端执行策略。
- 浏览器乐观状态不得成为历史上下文或业务权威数据。

## Flow

```text
Web submit
  -> 生成 clientMessageId
  -> 插入乐观 User Message
  -> POST /conversations/:id/messages
       -> 校验 Conversation 与内容
       -> 幂等检查 clientMessageId
       -> 检查同一 Conversation 没有 active Run
       -> 原子写入 User Message、Assistant Message 和 queued Run
  -> Web 订阅 /agent-runs/:id/events
  -> Worker claim queued -> running
  -> main-chat 通过 LiteLLM 生成文本
  -> delta / usage / terminal event 持久化
  -> SSE 推送新事件
  -> Message 与 Run 进入一致终态
```

API 请求失败时，Web 撤销乐观消息、恢复输入并允许重新发送。SSE 断开只改变浏览器连接状态。

## Agent Boundary

| Property      | Current value  |
| ------------- | -------------- |
| Agent ID      | `main-chat`    |
| Display name  | Wex            |
| Model role    | `chat`         |
| Model alias   | `gpt-5.6-luna` |
| Maximum turns | 1              |
| Tools         | 无             |

当前 Agent 只能基于 Conversation 文本回复，不得声称已经搜索外部信息、执行命令、修改文件或更新 Preview。

## Boundaries

| Boundary           | Current fact                                              |
| ------------------ | --------------------------------------------------------- |
| Conversation UI    | API 支持多个 Conversation，Web 只使用最近活跃的一个       |
| Message pagination | API 支持游标分页，Web 只加载首批消息                      |
| Run lifecycle      | 数据库只闭环当前主路径，预留状态不代表可用能力            |
| SSE recovery       | 事件支持按 sequence 回放，完整断线验收仍缺少自动化覆盖    |
| Ownership          | API 尚未按已登录用户校验 Project、Conversation 和 Run     |
| Input and tools    | 当前只接受纯文本，不提供 Tool、附件、多模态或网站生成能力 |
| Run controls       | 当前不提供用户取消、重试、Resume 或 Approval 闭环         |

## Edge Cases

| Case              | Expected behavior                                |
| ----------------- | ------------------------------------------------ |
| 快速重复点击      | 只创建一次 User Message 和 Run                   |
| 网络重试          | 通过 `clientMessageId` 返回原有结果              |
| active Run 存在   | 拒绝第二次发送，不产生孤立 Message               |
| API 创建失败      | 撤销乐观消息，恢复输入并允许重试                 |
| SSE 断开或重连    | Run 继续执行；按 sequence 恢复且不重复追加 delta |
| Worker lease 超时 | Run 与 Assistant Message 进入一致失败状态        |
| 模型失败          | 保存稳定错误，保留允许展示的部分文本，不伪装成功 |

## Impact Map

| Change          | Also inspect                                                           |
| --------------- | ---------------------------------------------------------------------- |
| Contract 或字段 | Contracts、migration、数据库函数、API、Worker 和 Web                   |
| Run 状态        | 合法迁移、终止语义、刷新恢复和所有生产者与消费者                       |
| 重试语义        | 原请求、Attempt 或新 Run 的身份关系；历史记录不得被覆盖                |
| 并发与 SSE      | 幂等、active Run 约束、事件 sequence 和重连行为                        |
| 上下文选择      | Message 顺序、长度、成本和敏感信息                                     |
| Tool 能力       | Sandbox、权限、Approval、审计事件和 Agent 能力声明                     |
| 数据与原子函数  | `supabase/migrations/20260816020000_create_chat.sql`                   |
| API 与执行      | `apps/api/src/chat/`、`apps/worker/src/chat-runs/` 和 `agent-runtime/` |
| Agent 与模型    | `main-chat-agent.config.ts`、`packages/model/src/model-config.ts`      |
| Web Chat        | `apps/web/src/pages/project/chat-panel.tsx`                            |

## Acceptance

- [ ] 多轮发送后刷新页面，消息内容、角色、顺序和状态保持一致
- [ ] 快速重复点击或网络重试不创建重复 User Message 或 Run
- [ ] active Run 存在时拒绝第二次发送，且不产生孤立 Message
- [ ] 流式文本追加到正确的 Assistant Message，终止后状态一致
- [ ] 模型或 Worker 失败时展示稳定错误，输入可以恢复
- [ ] SSE 重连不重复追加 delta，浏览器断开不取消后台 Run
- [ ] Agent 不声称执行当前未提供的 Tool 能力
