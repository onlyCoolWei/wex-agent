# Conversations and Agent Runs

Status: Current
Last verified: 2026-08-26
Read when: 修改消息持久化、Agent Run、Worker 执行、Agent Event 或 SSE
Applies to: API、Worker、Contracts 和数据库中的持久化对话链路

## Related

- Business: `docs/business/conversations-and-agent-runs.md`
- Design: `docs/design/project-workspace.md`
- Technical topic: `docs/technical/model-gateway.md`
- Architecture: `ARCHITECTURE.md`

## Architecture Contract

- 必须遵守根目录 `ARCHITECTURE.md`。
- API 负责 REST/SSE、校验、业务编排和持久化入口，不执行长时间 Agent 工作。
- Worker 领取 queued Run、调用 Runtime，并持久化事件和最终状态。
- PostgreSQL 是 Message、Agent Run 和 Agent Event 的权威来源；SSE 只负责传输。
- 跨应用 DTO、状态和事件类型来自 `@wex/contracts`。

## Current Implementation

```text
ChatPanel
  -> list or create Conversation
  -> load persisted Messages and active Run
  -> POST User Message
  -> create_chat_run() atomically persists:
       User Message
       Assistant placeholder
       queued Agent Run
  -> Worker claims Run
  -> AgentRuntimeService -> LiteLLM
  -> database functions persist deltas, events and terminal state
  -> API polls Agent Events and emits SSE
  -> ChatPanel renders persisted and streamed state
```

Web 当前只打开 Project 最近活跃的 Conversation；没有时创建默认“新对话”。刷新后从持久化 Message 和 active Run 恢复，浏览器乐观状态不是业务事实。

## Boundaries

| Module    | Responsibility                                     | Must not                                   |
| --------- | -------------------------------------------------- | ------------------------------------------ |
| Web       | Conversation 选择、消息 UI、SSE 消费和临时展示状态 | 决定 Run 终态，或把未持久化 delta 当作事实 |
| API       | 输入校验、原子创建 Run、查询和 SSE                 | 调用模型执行长任务                         |
| Worker    | 领取 Run、组装上下文、执行 Runtime 和持久化结果    | 提供浏览器业务 API                         |
| Contracts | Message、Run、Event 和 Runtime 的稳定边界          | 引用 SDK 事件或数据库行类型                |
| Database  | 顺序、幂等、active Run 唯一性和终态一致性          | 依赖浏览器连接维持 Run                     |

## Data

| Entity          | Stable semantics                                                   |
| --------------- | ------------------------------------------------------------------ |
| Conversation    | 属于一个 Project；当前状态为 `active` / `archived`                 |
| Message         | 角色为 user/assistant；以 `position` 在 Conversation 内排序        |
| Message content | `schemaVersion: 1`，当前恰好包含一个 text part                     |
| Agent Run       | 关联一次 User Message 和一个 Assistant Message；保存状态和模型别名 |
| Agent Event     | 属于一个 Run；`sequence` 单调递增且在 Run 内唯一                   |

数据库结构和事务函数以 `supabase/migrations/20260816020000_create_chat.sql` 为准；HTTP 和 Runtime 类型以 `packages/contracts/src/index.ts` 为准。

## Contracts

| Operation           | Input                               | Output or behavior                               |
| ------------------- | ----------------------------------- | ------------------------------------------------ |
| List Conversations  | Project UUID                        | active Conversations，按最近消息倒序             |
| Create Conversation | Project UUID，optional title        | persisted Conversation                           |
| Get Conversation    | Conversation UUID                   | persisted Conversation                           |
| List Messages       | Conversation UUID，optional cursor  | ascending page、next cursor、active Run          |
| Send Message        | client UUID + `MessageContentV1`    | User Message、Assistant Message、Run、events URL |
| Stream Events       | Run UUID + optional `Last-Event-ID` | ordered SSE events until a terminal event        |

稳定输入规则：

- Conversation title 去除首尾空格后为 1-100 字符，省略时使用“新对话”。
- Message 只接受文本，去除首尾空格后为 1-20,000 字符。
- `clientMessageId` 必须是 UUID，并作为发送幂等键。
- 消息页默认最多 50 条，调用方 `limit` 上限为 100；`before` 使用 Message position。

## Run State

当前持久化主路径：

```text
queued
  -> running
       -> completed
       -> failed
       -> cancelled
```

Contracts 还保留 `cancelling`、`waiting_for_approval` 和 `interrupted`，但当前数据库约束不接受后两种状态，产品也没有取消、恢复或审批入口。不得从类型预留推断对应能力已实现。

Run 和 Assistant Message 必须保持对应终态：

| Run terminal state | Assistant Message state | Result                                 |
| ------------------ | ----------------------- | -------------------------------------- |
| `completed`        | `completed`             | 保存完整文本和完成时间                 |
| `failed`           | `failed`                | 保存稳定错误；可以保留已产生的部分文本 |
| `cancelled`        | `cancelled`             | 保存取消终态                           |

## Persistence Flow

### Send

`create_chat_run()` 在同一数据库事务中：

1. 锁定 Conversation 并确认其存在。
2. 检查是否已有 active Run。
3. 按 `clientMessageId` 处理重复发送。
4. 分配连续 Message positions。
5. 写入 completed User Message。
6. 写入 streaming Assistant Message。
7. 写入 queued Agent Run，并返回三者 ID。

同一 Conversation 同时只允许一个 active Run。重复 `clientMessageId` 返回原有 User Message、Assistant Message 和 Run，不得创建第二组记录。

### Execute

1. Worker 每 750ms 调用 `claim_next_chat_run()`，进程内避免并行轮询。
2. 数据库以 `FOR UPDATE SKIP LOCKED` 语义领取一个 queued Run 并改为 running。
3. Worker 加载已完成的历史消息，从最新向前选择最多约 80,000 字符上下文。
4. Runtime 使用固定 `main-chat` Agent 产生标准事件。
5. Worker 将 delta 按 250ms 或 100 字符批量刷新，降低写放大。
6. `finish_chat_run()` 原子写入 Run、Assistant Message 和终态事件。

### Stream

1. API 从 `Last-Event-ID` 或 0 开始读取更大的持久化 sequence。
2. API 每 200ms 查询新增 Agent Event，并按 sequence 发出 SSE。
3. 每 15 秒发送 heartbeat；heartbeat 不是 Agent Event，也不推进 cursor。
4. 发送 `run.completed`、`run.failed` 或 `run.cancelled` 后关闭流。

## Consistency

- User Message、Assistant placeholder 和 queued Run 必须原子创建。
- `(conversation_id, client_message_id)` 保证用户发送幂等。
- 同一 Conversation 的 active Run 由数据库唯一约束保护。
- `(run_id, sequence)` 唯一；SSE cursor 使用 sequence，不依赖数据库 UUID。
- 事件和最终 Message/Run 状态必须先持久化，再对浏览器可见。
- 页面关闭、刷新或 SSE 断线不得取消服务端 Run。
- Project 删除通过外键级联删除 Conversation、Message、Run 和 Event。

## Failure Handling

| Failure                      | Behavior                                              |
| ---------------------------- | ----------------------------------------------------- |
| 无效 UUID、cursor 或内容     | API 返回稳定 `400`                                    |
| Conversation 不存在          | `404`                                                 |
| Conversation 已有 active Run | `409 CONVERSATION_BUSY`                               |
| 数据库失败                   | 记录内部上下文，对外返回非敏感 `500`                  |
| Runtime 超时                 | `MODEL_TIMEOUT`，Run 和 Assistant Message 进入 failed |
| Runtime 无终态事件           | `RUN_STALLED`，Worker 主动写入 failed 终态            |
| Worker 执行异常              | 尝试以 `INTERNAL_ERROR` 持久化 failed 终态            |
| SSE 断线                     | 客户端使用最后 sequence 重连并补读持久化事件          |

## Security

- API 尚未闭环身份验证；实现后所有 Conversation、Message、Run 和 Event 查询必须沿 Project 校验所有权。
- Worker 使用高权限 Supabase Client，只能执行受控的领取和持久化函数。
- 日志和对外错误不得包含 Token、模型凭据、完整 Provider 错误或用户消息正文。
- `userId: "anonymous"` 是当前无授权链路的占位，不得用于生产多用户审计。

## Known Implementation Gaps

- API 尚未验证用户身份或按 `owner_id` 隔离对话数据。
- Worker 通过数据库轮询、`SKIP LOCKED` 和固定 3 分钟 lease 提供基础领取与超时清理，但没有队列、lease 续约、独立 Attempt 历史或生产级多 Worker 恢复。
- 取消、恢复、重试、审批和 Checkpoint 没有端到端产品链路。
- Web 使用原生 `EventSource`，不能附带 Authorization header；接入 API Bearer Token 时需要同步调整 SSE 认证方案。
- 当前只有文本消息和无 Tool 的单轮 `main-chat` Agent，没有文件、Shell、Sandbox 或真实 Preview。

## Change Map

| Change            | Also inspect                                                  |
| ----------------- | ------------------------------------------------------------- |
| Message content   | Contracts、API 解析、migration 约束、Worker 上下文和 Web 渲染 |
| Run status        | Contracts、数据库 check/函数、Worker、SSE 终止条件和 Web 状态 |
| Agent Event       | Contracts、SDK mapper、持久化函数、SSE 和 Web listeners       |
| Send idempotency  | `create_chat_run()`、API 错误映射和 Web `clientMessageId`     |
| Worker scheduling | claim 函数、并发模型、租约/恢复、幂等和可观测性               |
| Ownership         | Auth Guard、Project 关系、所有查询、SSE 订阅和 RLS            |
| Context assembly  | Message 选择、字符限制、未来 compaction 和 token 预算         |

## Verification

```bash
pnpm --filter @wex/api typecheck
pnpm --filter @wex/worker test
pnpm --filter @wex/worker typecheck
pnpm --filter @wex/web typecheck
pnpm typecheck
pnpm build
```

手工验证初次创建 Conversation、历史恢复、重复发送、active Run 冲突、流式 delta、SSE 重连、Runtime 失败、刷新恢复和 Project 级联删除。
