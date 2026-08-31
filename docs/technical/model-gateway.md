# Model Gateway and Agent Runtime

Status: Current
Last verified: 2026-08-26
Read when: 修改 Agents SDK、LiteLLM、模型别名、Runtime、流式事件或 Provider 适配
Applies to: `apps/worker/src/agent-runtime`、`apps/worker/src/agents` 和 `packages/model`

## Related

- Business: `docs/business/conversations-and-agent-runs.md`
- Technical module: `docs/technical/conversations-and-agent-runs.md`
- Architecture: `ARCHITECTURE.md`

## Architecture Contract

- 必须遵守根目录 `ARCHITECTURE.md`。
- API 不依赖 OpenAI Agents SDK，也不执行长时间模型调用。
- Worker 只通过 `AgentRuntime` 稳定接口调用 Runtime。
- Provider、Gateway URL 和模型别名由 `@wex/model` 统一解析，不散落在业务代码。
- SDK 原始事件不得越过 Runtime 边界；跨应用事件来自 `@wex/contracts`。

## Current Implementation

```text
ChatRunProcessorService
  -> AgentRuntimeService
       -> AgentConfigRegistry
       -> ModelCatalog
       -> AgentsModelProviderFactory
       -> AgentFactory
       -> OpenAI Agents SDK Runner (SDK tracing disabled)
       -> LiteLLM /v1
       -> upstream model
       -> Langfuse via OpenTelemetry
  <- AgentEvent stream
  -> persisted chat events and terminal state
```

当前主链路使用 `main-chat` Agent、逻辑模型角色 `chat` 和别名 `gpt-5.6-luna`。Agent 最多执行 1 turn，没有 Tool、结构化输出、文件系统、Shell、网络搜索或 Sandbox 能力。

## Boundaries

| Module                    | Responsibility                                      | Must not                              |
| ------------------------- | --------------------------------------------------- | ------------------------------------- |
| `packages/model`          | 环境校验、模型目录、别名和 Agents SDK Provider 工厂 | 包含 Conversation、Run 或页面业务逻辑 |
| `AgentRuntimeService`     | Runner 生命周期、超时、取消信号和标准事件           | 持久化数据库行或暴露 SDK 事件         |
| `AgentConfigRegistry`     | Agent 指令、版本、模型角色和 turn 上限              | 读取 HTTP 请求或数据库                |
| `ChatRunProcessorService` | 组装输入、消费标准事件并持久化业务状态              | 依赖 SDK 的 Runner 或原始事件类型     |
| `@wex/contracts`          | Runtime 输入、输出、状态和事件边界                  | 引用具体 Provider 或 LiteLLM 配置     |

## Model Configuration

| Setting                        | Current value or rule                                            |
| ------------------------------ | ---------------------------------------------------------------- |
| Gateway                        | 单一远程 LiteLLM Proxy                                           |
| Protocol                       | OpenAI-compatible Chat Completions (`useResponses: false`)       |
| `LITELLM_BASE_URL`             | 必填绝对 HTTP(S) URL，路径必须指向 `/v1`                         |
| `LITELLM_API_KEY`              | 必填 LiteLLM virtual key，只存在于 Worker                        |
| `LANGFUSE_PUBLIC_KEY`          | 可选；与 Secret Key 同时配置时启用 Worker Langfuse OTEL          |
| `LANGFUSE_SECRET_KEY`          | 可选；Worker-only Langfuse project secret                        |
| `LANGFUSE_BASE_URL`            | 可选；传给 Langfuse OTLP exporter，默认云端地址                  |
| `LANGFUSE_TRACING_ENVIRONMENT` | 可选；Langfuse environment，默认使用 `NODE_ENV` 或 `development` |
| `LANGFUSE_RELEASE`             | 可选；Langfuse release 标识                                      |
| Request timeout                | 120,000ms                                                        |
| Strict feature validation      | enabled                                                          |
| Trace sensitive data           | disabled；只记录 Run 标识、Agent 标识和终态                      |

逻辑角色和当前别名由 `DEFAULT_MODEL_CONFIG` 管理：

| Role        | Alias               | Current use                         |
| ----------- | ------------------- | ----------------------------------- |
| `chat`      | `gpt-5.6-luna`      | 当前 `main-chat` Agent              |
| `coding`    | `coding-primary`    | 预留；不代表 Coding Agent 已接入    |
| `fast`      | `coding-fast`       | 预留 Agent 配置使用，未进入产品链路 |
| `reasoning` | `reasoning-primary` | 预留；未进入产品链路                |

模型别名是 Wex 与 LiteLLM 之间的稳定契约。上游 Provider 或具体模型应由 LiteLLM 配置管理，业务代码不得硬编码 Provider 名称。

## Agent Configuration

`main-chat` 当前配置：

| Property     | Value       |
| ------------ | ----------- |
| ID           | `main-chat` |
| Display name | `Wex`       |
| Model role   | `chat`      |
| Max turns    | `1`         |
| Tools        | none        |

Agent 指令必须明确当前能力边界，不得声称已搜索、执行命令、修改文件或完成现实世界操作。修改 Agent 指令或版本时，应同步行为测试和业务能力文档。

## Runtime Contract

`AgentRuntime` 定义 `run`、`cancel`、`resume` 和 `submitApproval`，但当前交付状态不同：

| Method           | Implementation status                                        |
| ---------------- | ------------------------------------------------------------ |
| `run`            | 已实现；返回标准 `AgentEvent` 异步流                         |
| `cancel`         | 仅支持进程内 AbortSignal；没有 API、数据库状态机或多进程链路 |
| `resume`         | 主动抛错；Checkpoint 实现前不支持                            |
| `submitApproval` | 主动抛错；当前没有 Tool 和审批流程                           |

`run` 的稳定输入包含 Run、Attempt、Project、Conversation、Assistant Message、User、Workspace 和 Agent ID。Runtime 不查询数据库；调用方必须提供已经组装好的历史输入。

## Event Mapping

| SDK or Runtime signal     | Stable Agent Event  | Notes                                          |
| ------------------------- | ------------------- | ---------------------------------------------- |
| run begins                | `run.started`       | 包含 Attempt 和解析后的模型快照                |
| output text delta         | `message.delta`     | 绑定 Assistant Message ID                      |
| response usage            | `usage.updated`     | 暴露 input/output token 数和可选缓存输入 token |
| final output              | `message.completed` | 完整最终文本                                   |
| normal completion         | `run.completed`     | 终态                                           |
| mapped error              | `run.failed`        | 稳定 code、retryable 和非敏感 message          |
| abort or SDK cancellation | `run.cancelled`     | 终态                                           |

SDK 中与当前产品无关的原始事件会被忽略。新增事件必须同步 Contracts、Mapper、Worker 持久化、SSE 和 Web 消费者。

## Reliability

- 每个 `run` 创建独立 `Runner`、AbortSignal 和 120 秒超时计时器。
- 超时映射为 retryable `MODEL_TIMEOUT`，不向调用方抛出 Provider 原始错误。
- Runtime 在 `finally` 中清理计时器和取消注册项。
- Model snapshot 至少保存 alias、gateway 和 config version，便于追踪一次执行使用的逻辑配置。
- Runtime 不自动重试模型请求；是否重试属于持久化 Run/Attempt 策略，不能在 SDK 层静默重复。

## Failure Handling

| Condition                    | Stable code                    | Retryable |
| ---------------------------- | ------------------------------ | --------- |
| Gateway 认证失败             | `MODEL_AUTH_FAILED`            | no        |
| Rate limit                   | `MODEL_RATE_LIMITED`           | yes       |
| Request timeout              | `MODEL_TIMEOUT`                | yes       |
| Network/5xx/invalid response | `MODEL_BAD_RESPONSE`           | yes       |
| Context length exceeded      | `MODEL_CONTEXT_EXCEEDED`       | no        |
| Capability unsupported       | `MODEL_CAPABILITY_UNSUPPORTED` | no        |
| Max turns exceeded           | `RUN_MAX_TURNS_EXCEEDED`       | no        |
| Unknown failure              | `INTERNAL_ERROR`               | no        |

错误日志可以包含 Run 标识和稳定分类，不得包含 API key、完整请求正文、用户隐私或未经处理的 Provider 响应。

## Security

- LiteLLM 和 Langfuse credentials 只从 Worker 环境读取，不进入 Contracts、数据库事件或 Web。
- OpenAI Agents SDK tracing 永久关闭；Worker 启动时将 Langfuse credentials 显式传给 OpenTelemetry span processor，并只导出 `wex-agent-run` / `wex-generate-response` span。
- 每次 Agent Run 创建一个 `agent` 根 observation 和一个嵌套的 `generation` observation；两者传播 Conversation session、User、environment、release 和稳定元数据。
- Langfuse observation 按当前明确授权记录 Agent 的 system prompt、完整用户消息正文和模型输出，以便排查语义问题；API key 仍不会进入 observation。输入以配置中的 system prompt 为首条消息，并复用 Runner 实际使用的 OpenAI Agents SDK `AgentInputItem[]`（包括 assistant 的 `status` 与嵌套 `content`），generation 额外记录模型别名、配置版本、普通 token 和缓存输入 token usage。
- 完整内容会发送到配置的 Langfuse 项目；该项目必须按敏感数据处理，配置访问控制、保留期限和删除策略。
- LiteLLM virtual key 应按环境和服务隔离，并在网关侧配置预算、模型访问和轮换策略。
- Agent 输入和模型输出按不可信内容处理；未来 Tool/Sandbox 接入必须建立独立授权与隔离边界。

## Known Implementation Gaps

- 没有 Tool、handoff、structured output、guardrail 或 Sandbox 集成。
- 没有持久化取消、恢复、审批、Checkpoint 或 Run Attempt 重试链路。
- Model config 当前是进程内常量，没有数据库配置、租户策略或动态发布。
- 模型集成测试需要可访问的 LiteLLM 服务和凭据，默认测试只覆盖本地边界行为。

## Change Map

| Change              | Also inspect                                                              |
| ------------------- | ------------------------------------------------------------------------- |
| Model role or alias | `model-config.ts`、LiteLLM 配置、Agent config、UI 标签和测试              |
| Gateway protocol    | Provider factory、SDK 兼容性、event mapper 和集成测试                     |
| Agent instruction   | Agent version、行为测试和 Business capability                             |
| Runtime input       | Contracts、Worker context assembly 和所有 Runtime 实现                    |
| Agent Event         | Contracts、SDK mapper、Worker、数据库、SSE 和 Web                         |
| Timeout or retry    | Runtime、Run/Attempt 状态、一致性规则和用户失败语义                       |
| Tool capability     | Agent config、Runtime、approval、Sandbox、安全边界和 Business/Design 文档 |

## Verification

```bash
pnpm --filter @wex/model typecheck
pnpm --filter @wex/worker test
pnpm --filter @wex/worker typecheck
pnpm typecheck
pnpm build
```

配置真实 LiteLLM 凭据后，可以运行 `pnpm --filter @wex/worker smoke` 验证网关流式链路；该命令会产生外部模型调用，不属于无凭据的默认检查。
