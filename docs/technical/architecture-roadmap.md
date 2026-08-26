# Coding Agent Architecture Roadmap

Status: Reference
Last verified: 2026-08-26
Read when: 评估 Runtime、Sandbox、队列、Tool、审批、恢复或发布能力的演进方向
Applies to: 未交付能力的目标边界和决策顺序；不替代当前架构与业务事实

## Related

- Business: `docs/business/README.md`
- Technical index: `docs/technical/README.md`
- Model gateway: `docs/technical/model-gateway.md`
- Current architecture: `ARCHITECTURE.md`
- ADR: `docs/adr/README.md`

## Purpose

本文为 Wex 从持久化文本对话演进为 Coding Agent 提供技术参考。它描述目标边界、依赖顺序和决策门槛，不表示列出的组件或能力已经实现。

当前事实必须以根目录 `ARCHITECTURE.md`、模块 Technical 文档、Business 能力状态和代码为准。路线图中的长期且难以逆转的选型在实施前应单独形成 ADR。

## Current Baseline

当前已经具备：

- React + Vite Web、NestJS API 和独立 NestJS Worker 进程。
- Supabase PostgreSQL 中的 Project、Conversation、Message、Agent Run 和 Agent Event。
- REST 命令/查询和基于持久化 sequence 的 SSE。
- OpenAI Agents SDK Runtime、LiteLLM 单一网关和逻辑模型别名。
- 数据库 `SKIP LOCKED` 领取、固定 3 分钟 lease 和超时 Run 清理。
- `packages/sandbox` 接口边界，但没有进入产品运行链路。

当前不应被视为已具备：

- API 多用户授权闭环。
- Tool、文件、Shell、Build 或真实 Preview。
- 持久化取消、恢复、重试、审批或 Checkpoint。
- BullMQ/Redis、lease 续约、独立 Attempt 历史或生产级多 Worker 恢复。
- Artifact 存储、发布、团队协作或评测流水线。

## Target Principles

### Persistent Run Authority

Agent Run 和 Event 必须保存在 PostgreSQL。队列、Worker 内存和 SSE 都不是业务权威来源。

### API and Worker Separation

API 负责身份、权限、命令、查询和订阅；Worker 负责可能持续数分钟的 Agent 执行。浏览器关闭不得终止服务端工作。

### Runtime Isolation

业务模块只依赖稳定 `AgentRuntime`，不得直接依赖 Agents SDK `Runner`、Provider 原始事件或 Tool 实现。

### Sandbox Isolation

Runtime 只依赖 `packages/sandbox` 接口。调用方不得依赖 Docker、Daytona、E2B 或其他供应商细节。

### Persist Before Publish

业务事件必须先持久化，再通过 SSE 推送。断线重连必须从持久化 sequence 补读。

### Explicit Capability State

预留接口、状态或目录不代表能力可用。只有 Contracts、持久化、Runtime、API、UI、权限和失败路径形成闭环后，能力才能标记为已实现。

## Target System Shape

```text
Browser
  -> Web
  -> API (Auth, REST, SSE)
       -> PostgreSQL
       -> Object Storage
       -> Job Queue
            -> Agent Worker
                 -> Agent Runtime
                      -> Model Gateway
                      -> Tool Registry
                      -> Sandbox Interface
                           -> isolated Workspace
                                -> Files / Shell / Build / Preview
```

MVP 可以暂时省略 Queue 和远程 Sandbox Provider，但不得省略持久化 Run/Event、API/Worker 进程边界和 Sandbox 接口边界。

## Target Boundaries

| Component      | Target responsibility                              | Must not become                         |
| -------------- | -------------------------------------------------- | --------------------------------------- |
| Web            | Chat、文件、Run 状态、审批、日志和 Preview         | 权威 Run 状态或直接 Sandbox 客户端      |
| API            | Auth、权限、业务命令、查询、SSE 和调度入口         | 长时间 Agent Runtime                    |
| Job Queue      | 交付、延迟、并发和调度                             | Run 状态或审计事实来源                  |
| Worker         | 领取 Attempt、执行 Runtime、维护租约和持久化结果   | 对外业务 API                            |
| Agent Runtime  | Agent loop、上下文、Tool 调用、取消和恢复          | HTTP Controller 或具体 Sandbox Provider |
| Sandbox        | 隔离 Workspace、进程、资源、网络和 Preview         | 宿主机文件系统或长期凭据容器            |
| Model Gateway  | Provider 路由、访问控制、预算和用量                | Agent 状态机或 Tool 编排                |
| PostgreSQL     | Run、Attempt、Event、Approval、Checkpoint 和元数据 | 大型日志、构建产物或 Workspace 归档     |
| Object Storage | Artifact、截图、日志包和 Workspace 快照            | 可查询业务状态                          |

## Target Run Model

扩展 Run 生命周期前，应先区分 Run 和 Attempt：

```text
Agent Run
  -> Attempt 1 -> failed
  -> Attempt 2 -> running -> completed
```

- Run 表示一次用户意图和长期业务记录。
- Attempt 表示一次具体 Worker 执行。
- Retry 新建 Attempt，不覆盖历史结果。
- Worker 领取、租约、心跳和幂等围绕 Attempt 建模。

目标状态机需要通过数据库约束和显式命令实现，不得只依赖布尔字段：

```text
queued -> running -> completed
                  -> failed
                  -> cancelling -> cancelled
                  -> waiting_for_approval -> running
                  -> interrupted -> queued (new attempt)
```

任何新增状态都必须同步 Contracts、数据库约束、事务函数、Worker、SSE、Web 和业务规则。

## Target Sandbox Contract

Sandbox 至少需要稳定表达：

- Workspace 创建、恢复和销毁。
- 受控文件读取、写入和目录操作。
- Shell 命令、超时、退出码、stdout 和 stderr。
- CPU、内存、磁盘、进程数和执行时间限制。
- 默认拒绝的网络策略和短期凭据注入。
- Build/Preview 生命周期和受控访问地址。

Sandbox 内代码始终按不可信代码处理。不得挂载宿主机 Docker Socket、仓库根目录或长期云凭据。

## Target Event Contract

Event envelope 保持稳定标识、Run、Attempt、sequence、type、timestamp 和 payload。未来事件可以覆盖：

- Run 状态和失败。
- Assistant message delta 和完成。
- Tool 请求、开始、输出和完成。
- Approval 请求与决定。
- 文件变更、Build/Test 和 Preview 状态。
- Checkpoint 和恢复结果。

高频日志和 token delta 必须批量持久化或聚合，避免数据库写放大。大体积内容进入对象存储，Event 只保存摘要和引用。

## Delivery Sequence

### Foundation: Authorization

- API 验证 Supabase Access Token。
- 所有 Project 下级资源沿所有权根校验。
- SSE 建立可携带或验证身份的订阅方案。
- 加入跨用户负向测试。

后续 Sandbox、Artifact 和发布能力都会扩大数据风险，因此必须先完成授权闭环。

### Coding Workspace

- 定义 Workspace 和 Artifact 的业务生命周期。
- 实现最小 Sandbox Provider 和文件/Shell Tool。
- 建立 Tool 输入校验、路径约束、超时和输出限制。
- 将真实 Build/Preview 状态连接到持久化对象和 UI。

### Durable Execution

- 引入独立 Run Attempt、可续约 lease、心跳和完整悬挂任务处理。
- 接入 BullMQ/Redis 或经过 ADR 选择的队列。
- 支持多 Worker、并发限制和幂等领取。
- 实现持久化取消、重试和恢复。

### Approval and Recovery

- 建模 Approval、Checkpoint 和审计事件。
- Tool 执行前按风险请求批准。
- 支持断点恢复，并明确过期、拒绝和重复提交语义。

### Quality and Operations

- Context compaction、预算和模型策略。
- Build/Test/Runtime verification。
- Trace、用量、成本和稳定错误观测。
- Eval pipeline、渐进发布和自动修复策略。

每一阶段都需要对应 Business 定义、Design 状态、Technical 当前文档、Contracts、migration、测试和运维验证；不得仅以接口或 UI 占位宣布完成。

## Decision Gates

实施前必须通过 ADR 或明确技术方案回答：

| Decision            | Required evidence                                     |
| ------------------- | ----------------------------------------------------- |
| Queue provider      | 吞吐、延迟、租约、重试、运维和故障恢复需求            |
| Sandbox provider    | 隔离强度、启动时间、网络、Preview、成本和本地开发体验 |
| Artifact storage    | 大小、保留期、访问控制、版本和清理策略                |
| Approval model      | Tool 风险分类、过期、重复决定、审计和恢复             |
| Run retry semantics | Run/Attempt 关系、幂等、副作用和用户可见状态          |
| Model routing       | 能力、预算、降级、数据驻留和 Provider 错误差异        |

## Change Map

| Planned capability  | Existing boundaries to inspect                                      |
| ------------------- | ------------------------------------------------------------------- |
| Tool                | Business rules、Agent config、Runtime、Events、Approval 和 Sandbox  |
| Files or Workspace  | Project ownership、Storage、Sandbox、Contracts 和 Preview           |
| Queue               | Run/Attempt persistence、Worker claim、idempotency 和 observability |
| Cancel/Resume/Retry | Run state、database functions、Runtime、SSE 和 Web                  |
| Approval            | Auth、Tool risk、persistent state、events and UX                    |
| Multi-worker        | leases、heartbeats、SKIP LOCKED、attempts and recovery              |
| Real Preview        | Artifact authority、Sandbox networking、access control and UI       |

## Reference Verification

路线图更新时执行：

```bash
pnpm check:docs
pnpm exec prettier --check docs/technical/architecture-roadmap.md
```

还必须对照 `ARCHITECTURE.md`、Business 能力状态和代码，确保 Current Baseline 没有把计划描述为事实。路线图本身不证明任何运行时能力已经交付。
