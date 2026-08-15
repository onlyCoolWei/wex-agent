# OpenAI Agents SDK 与 LiteLLM 接入技术方案

## 1. 文档目的

本文定义 Wex Agent 接入 OpenAI Agents SDK 与 LiteLLM 的技术边界、运行链路和分阶段实施方案，作为后续开发、联调与验收依据。

本文所称 **Agents SDK** 指 OpenAI 官方 TypeScript 包 `@openai/agents`，不是 Google Agent Development Kit。Wex Agent 当前为 TypeScript Monorepo，因此不引入 Python Runtime，也不采用 Python SDK 中的 `LitellmModel` 扩展。

## 2. 目标与非目标

### 2.1 目标

- 使用 Agents SDK 承担 Agent Loop、Tool Calling、Streaming、Handoff、Guardrail 与 OpenAI Trace。
- 使用 LiteLLM Proxy 统一所有模型的 OpenAI-compatible 接口、模型别名、路由、限流和用量治理。
- 保持 API、Worker、Agent Runtime、Model Gateway 与 Sandbox 的边界清晰。
- 让业务代码依赖 Wex 自有接口，而不是直接依赖 `Runner`、LiteLLM 或某一家模型提供商。
- 支持流式事件、取消、人工审批、失败重试和后续任务恢复。
- 在模型或网关能力不一致时能够显式降级，而不是静默丢失 Tool、Usage 或 Structured Output。

### 2.2 非目标

- 本阶段不实现多 Agent 自动规划或复杂 Handoff 网络。
- 本阶段不接入 BullMQ、完整 Checkpoint 恢复或多 Worker 调度。
- 本阶段不把 LiteLLM 的管理接口直接开放给浏览器。
- 本阶段不允许 Worker 绕过 LiteLLM 直连任何模型供应商。
- 当前方案不接入 OpenAI Responses API、Hosted Tools 或其他 Responses-only 能力。

## 3. 当前仓库基础

当前仓库已经具备以下边界：

| 模块                 | 当前职责                       | 本次接入后的职责                                  |
| -------------------- | ------------------------------ | ------------------------------------------------- |
| `apps/api`           | HTTP API 与业务编排            | 创建 AgentRun、查询状态、SSE 订阅、取消与审批入口 |
| `apps/worker`        | 独立 NestJS Worker 骨架        | 消费并执行 AgentRun，持有 Runtime 生命周期        |
| `packages/model`     | `ModelProvider` 与模型角色占位 | 模型目录、路由策略与 Agents SDK Provider 工厂     |
| `packages/contracts` | Web/API 共享类型               | AgentRun 命令、状态与事件契约                     |
| `packages/sandbox`   | Sandbox 接口占位               | 向 Agent Tool 暴露受控文件与命令能力              |
| Supabase PostgreSQL  | Project 与健康检查             | AgentRun、Event、Message、ToolCall、Usage 持久化  |

现有 `packages/model` 中的 `ModelProvider` 只返回描述信息，不能直接替代 Agents SDK 的同名 `ModelProvider`。实现时必须通过命名区分，例如将业务接口改为 `ModelCatalog`，将 SDK 类型通过 `OpenAIModelProvider` 别名导入。

## 4. 核心技术决策

### 4.1 采用 TypeScript Agents SDK

安装目标：

```bash
pnpm --filter @wex/worker add @openai/agents zod
pnpm --filter @wex/model add @openai/agents
```

`@openai/agents` 提供 `Agent`、`Runner`、Function Tool、Guardrail、Session、Streaming 与 Tracing。Wex 只在 Runtime/Model Adapter 内直接引用 SDK，Controller、Project Service 和前端不引用 SDK 类型。模型推理统一经过 LiteLLM，但 Agents SDK Trace 使用独立 OpenAI 凭据导出到 OpenAI Traces Dashboard。

### 4.2 LiteLLM 采用独立 Proxy 服务

Wex 是 Node.js 服务，不在 Worker 中嵌入 LiteLLM Python SDK。LiteLLM 以独立容器运行，对 Worker 暴露 OpenAI-compatible HTTP API：

```text
Agent Worker
  -> @openai/agents
  -> OpenAIProvider(baseURL = LITELLM_BASE_URL)
  -> LiteLLM Proxy
  -> OpenAI / Anthropic / Gemini / 其他模型服务
```

选择 Proxy 而非 Python SDK 的原因：

- 不向 TypeScript Worker 引入 Python 进程内依赖。
- 多个 Worker 共享模型别名、凭据、预算、限流、路由与审计策略。
- 上游供应商密钥只保存在 LiteLLM 服务端。
- LiteLLM 可独立扩缩容和升级，不需要重新发布 Agent Worker。

### 4.3 使用单一 LiteLLM 网关

所有模型请求统一经过 LiteLLM Proxy，Worker 不保存上游供应商密钥，也不实现 OpenAI 或其他供应商的直连回退：

```text
Agents SDK -> LiteLLM Proxy -> 上游模型供应商
```

当前方案统一且仅使用 LiteLLM 的 Chat Completions 兼容接口，作为不同供应商之间的最小公共能力面。Runtime 不提供 API 模式切换配置，也不调用 LiteLLM `/responses` 端点；如未来需要 Responses API，应另行评估兼容性并更新本方案。

这意味着：

- 本地 Function Tool、Handoff 与应用侧 Guardrail 统一走 LiteLLM Chat Completions 通道。
- 不使用 OpenAI Hosted Tools、`previousResponseId`、Responses WebSocket 等 Responses-only 能力。
- 即使上游是 OpenAI 模型，也必须通过 LiteLLM 的模型别名访问。
- LiteLLM 故障时 Run 明确失败或进入重试，不允许静默绕过网关直连供应商。
- 模型切换不能只替换字符串，必须同时校验该模型对应的 API 形态与能力集合。

### 4.4 模型别名由 Wex 控制

业务层不保存供应商真实模型名，只保存稳定别名和配置版本：

```text
coding-primary
coding-fast
reasoning-primary
vision-primary
```

LiteLLM `model_name` 与 Wex 别名保持一致，上游部署名仅出现在 LiteLLM 配置中。这样可以在不修改 Agent 定义和历史业务数据的情况下切换部署。

每次 AgentRun 还应记录最终解析结果：

```ts
interface ResolvedModelSnapshot {
  alias: string;
  gateway: "litellm";
  provider?: string;
  upstreamModel?: string;
  configVersion: string;
}
```

## 5. 目标架构

```text
Web
  -> POST /api/agent-runs
  -> GET  /api/agent-runs/:id/events (SSE)
  -> POST /api/agent-runs/:id/cancel
              |
              v
API Server -> PostgreSQL -> Queue/Dispatcher -> Agent Worker
                                               |
                                               v
                                         AgentRuntime
                                      /        |        \
                              AgentFactory  ToolRegistry  EventSink
                                   |           |            |
                              Agents SDK    Sandbox       PostgreSQL
                                /      \
                    ModelProviderFactory  OpenAI Trace
                              |                 |
                        LiteLLM Proxy     Traces Dashboard
                              |
                 OpenAI / Anthropic / Gemini
```

所有模型推理请求只经过 LiteLLM。OpenAI Trace 是独立的观测出站链路，不参与模型路由。所有流式事件先经 `EventSink` 持久化，再由 API 通过 SSE 推送；SSE 断开不取消 Worker 中的 Run，客户端使用事件序号恢复订阅。

## 6. 模块与目录规划

建议逐步演进为：

```text
apps/worker/src/
  agent-runtime/
    agent-runtime.module.ts
    agent-runtime.service.ts
    agent.factory.ts
    tool.registry.ts
    sdk-event.mapper.ts
    run-cancellation.registry.ts

packages/model/src/
  model-catalog.ts
  model-policy.ts
  agents-model-provider.factory.ts
  env.ts

packages/contracts/src/
  agent-run.ts
  agent-event.ts

infra/litellm/
  config.yaml
  README.md
```

职责约束：

- `AgentRuntimeService`：运行 SDK、控制生命周期、映射结果，不决定供应商密钥。
- `AgentFactory`：构建 instructions、tools、guardrails 和 output type。
- `ToolRegistry`：将 Wex Sandbox 能力包装为 SDK Function Tool。
- `ModelCatalog`：按角色返回 Wex 模型策略，不发起模型请求。
- `AgentsModelProviderFactory`：创建唯一指向 LiteLLM 的 Agents SDK `OpenAIProvider`。
- `SdkEventMapper`：将 SDK 事件转为稳定的 Wex `AgentEvent`。
- `EventSink`：负责事件序号、持久化和实时通知。

## 7. 配置设计

### 7.1 Worker 环境变量

```dotenv
# 唯一模型网关
LITELLM_BASE_URL=http://localhost:4000/v1
LITELLM_API_KEY=

# OpenAI Trace，仅用于观测数据导出
OPENAI_TRACE_API_KEY=

# Wex 模型策略
WEX_MODEL_CODING_PRIMARY=coding-primary
WEX_MODEL_CODING_FAST=coding-fast
WEX_MODEL_REASONING_PRIMARY=reasoning-primary
WEX_MODEL_CONFIG_VERSION=2026-08-16.1

# Runtime
AGENT_MAX_TURNS=80
AGENT_REQUEST_TIMEOUT_MS=120000
```

约束：

- `.env.example` 只记录变量名和安全示例，不填写真实密钥。
- 浏览器不得接收 `LITELLM_API_KEY`、`OPENAI_TRACE_API_KEY`、LiteLLM master key 或任何上游供应商密钥。
- Worker 使用受限 LiteLLM virtual key；master key 只用于运维控制面。
- OpenAI 等上游模型供应商密钥只注入 LiteLLM，不能注入 API 或 Worker。
- `OPENAI_TRACE_API_KEY` 是独立的服务端凭据，只允许用于 Trace 导出，不能传给模型 Provider。
- `LITELLM_BASE_URL` 必须带协议并指向 API 根路径，启动时进行格式校验。

### 7.2 LiteLLM 最小配置示例

```yaml
model_list:
  - model_name: coding-primary
    litellm_params:
      model: os.environ/LITELLM_CODING_PRIMARY_MODEL
      api_key: os.environ/LITELLM_CODING_PRIMARY_API_KEY

  - model_name: coding-fast
    litellm_params:
      model: os.environ/LITELLM_CODING_FAST_MODEL
      api_key: os.environ/LITELLM_CODING_FAST_API_KEY

router_settings:
  num_retries: 2
  timeout: 120

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  database_url: os.environ/LITELLM_DATABASE_URL
```

生产环境要求：

- 镜像使用明确版本，禁止使用 `main-latest`。
- 配置中的模型和密钥通过 Secret Manager 注入。
- LiteLLM 使用独立数据库 schema 或独立数据库，不与 Wex migration 混管。
- 多实例路由、限流或共享缓存需要 Redis 时，再显式引入 Redis。
- 先为单个模型别名配置健康检查，不在首版启用跨模型静默 fallback。

## 8. Agents SDK 接入骨架

以下代码仅表达边界，实际实现应按安装版本的类型定义调整。

### 8.1 Provider 工厂

```ts
import {
  OpenAIProvider,
  setTracingExportApiKey,
  type ModelProvider as OpenAIModelProvider,
} from "@openai/agents";

setTracingExportApiKey(process.env.OPENAI_TRACE_API_KEY!);

export class AgentsModelProviderFactory {
  create(): OpenAIModelProvider {
    return new OpenAIProvider({
      apiKey: process.env.LITELLM_API_KEY,
      baseURL: process.env.LITELLM_BASE_URL,
      useResponses: false,
      strictFeatureValidation: true,
    });
  }
}
```

`useResponses: false` 是固定配置，不作为运行时开关暴露；`strictFeatureValidation` 用于在 Chat Completions 通道误用 Responses-only 能力时尽早失败。Provider 的 `baseURL` 必须始终指向 LiteLLM；不要调用全局 `setDefaultOpenAIClient()` 切换到上游供应商，因为这会绕过网关并污染并发 Run。`setTracingExportApiKey()` 只配置 Trace 导出凭据，与 LiteLLM 模型 Provider 完全分离。

### 8.2 Runtime 接口

对外接口保持 SDK 无关：

```ts
interface AgentRuntime {
  run(input: StartAgentRunInput): AsyncIterable<AgentEvent>;
  cancel(runId: string, reason?: string): Promise<void>;
  resume(input: ResumeAgentRunInput): AsyncIterable<AgentEvent>;
  submitApproval(input: SubmitApprovalInput): Promise<void>;
}
```

第一阶段可以先实现 `run()` 和 `cancel()`。尚未具备可靠 Checkpoint 前，`resume()` 必须返回明确的“不支持”错误，不能从头重跑并伪装成恢复。

### 8.3 单次运行

```ts
const provider = providerFactory.create();
const runner = new Runner({ modelProvider: provider });

const agent = agentFactory.createCodingAgent({
  model: model.alias,
  projectId: input.projectId,
});

const result = await runner.run(agent, input.prompt, {
  stream: true,
  maxTurns: input.maxTurns,
  signal: cancellationRegistry.getSignal(input.runId),
  context: input.context,
});

for await (const sdkEvent of result) {
  yield sdkEventMapper.map(input.runId, sdkEvent);
}
```

实现时需要按当前 SDK 的流式返回类型确认最终输出获取方式。任何未识别的 SDK 事件先记录诊断信息，但不能直接原样暴露给 Web，避免形成不可维护的前端契约。

## 9. Agent、Context 与 Tool 设计

### 9.1 Agent 定义

首版只创建一个 `CodingAgent`：

```text
CodingAgent
  |- system instructions
  |- workspace context
  |- filesystem tools
  |- shell tool
  |- build/test tool
  |- input guardrail
  `- output guardrail
```

Agent instructions 保持版本化。每个 AgentRun 保存 `agentVersion` 和 prompt template 版本，便于重现与评估。

### 9.2 Run Context

SDK Context 只携带运行所需服务句柄和身份信息，不保存为模型可见文本：

```ts
interface WexRunContext {
  runId: string;
  projectId: string;
  userId: string;
  workspaceId: string;
  sandbox: Sandbox;
  eventSink: AgentEventSink;
}
```

传给模型的项目说明、文件摘要和用户偏好应通过 instructions 或 input 显式提供，不能假设 Context 会自动进入模型上下文。

### 9.3 Tool 规则

- Tool 参数使用 Zod v4 定义并限制长度、路径和枚举值。
- 文件路径必须解析到 Sandbox workspace 内，拒绝目录穿越。
- Shell Tool 不接受宿主机执行器，只调用 `@wex/sandbox`。
- 写文件、安装依赖、网络访问和危险命令按风险等级触发 Approval。
- Tool 返回内容设置大小上限；超长日志存为 Artifact，只向模型返回摘要与引用。
- 每次 Tool Call 记录开始、结束、耗时、结果状态和脱敏后的参数。
- Tool 失败返回可判断的结构化错误，避免模型从自然语言猜测错误类型。

## 10. 事件与状态映射

Wex 事件契约不能直接等同于 SDK Stream Event。建议最小事件集合：

```ts
type AgentEvent =
  | { type: "run.started"; runId: string; sequence: number }
  | { type: "message.delta"; runId: string; sequence: number; delta: string }
  | { type: "message.completed"; runId: string; sequence: number; messageId: string }
  | { type: "tool.started"; runId: string; sequence: number; toolCallId: string; tool: string }
  | {
      type: "tool.completed";
      runId: string;
      sequence: number;
      toolCallId: string;
      status: "succeeded" | "failed";
    }
  | { type: "approval.requested"; runId: string; sequence: number; approvalId: string }
  | {
      type: "usage.updated";
      runId: string;
      sequence: number;
      inputTokens?: number;
      outputTokens?: number;
    }
  | { type: "run.completed"; runId: string; sequence: number }
  | { type: "run.failed"; runId: string; sequence: number; code: string; retryable: boolean }
  | { type: "run.cancelled"; runId: string; sequence: number };
```

事件处理顺序：

```text
SDK event
  -> map and redact
  -> allocate monotonically increasing sequence
  -> persist in transaction
  -> publish notification
  -> SSE reads persisted event
```

不要把 token delta 当作唯一消息记录。`message.completed` 到达时保存最终规范化消息，delta 仅用于实时展示和调试，可设置较短保留期。

## 11. 会话与恢复

Agents SDK Session 负责一次会话的模型上下文，Wex PostgreSQL 负责业务事实和长期恢复，两者职责不同：

- SDK Session：提供模型下一轮所需历史。
- Wex Session/Message：用户可见会话与审计记录。
- AgentRun/Attempt：一次执行和每次重试。
- Checkpoint：恢复工具状态、审批状态和 Sandbox 引用。

首版建议实现数据库支持的自有 Session Adapter，或在每次 Run 前从 Wex Message 构建受控输入。不要同时让 SDK Session 与业务层各自无条件追加同一条消息，否则会造成上下文重复。

真正的 `resume()` 至少需要持久化：

- 最后一个已确认事件序号。
- SDK 所需的 conversation/session state。
- 未完成 Tool Call 或 Approval。
- Sandbox/workspace 标识和可恢复状态。
- Agent、Tool、Model 配置版本。

## 12. 可靠性与错误处理

### 12.1 超时与取消

- HTTP 请求超时、单个 Tool 超时、整个 Run deadline 分层配置。
- 用户取消通过 `AbortController` 传入 Runner 和 Tool。
- Tool 必须响应取消信号；无法中断的外部进程由 Sandbox 强制终止。
- Worker 收到退出信号时停止接收新任务，并为正在运行的 Run 写入可恢复或失败状态。

### 12.2 重试边界

避免 Worker、Agents SDK、LiteLLM 和上游供应商四层同时重试：

| 层级       | 允许重试的内容                                |
| ---------- | --------------------------------------------- |
| Agents SDK | SDK 明确标记的瞬时模型错误，次数保持较小      |
| LiteLLM    | 同一模型组内的部署级瞬时失败                  |
| Worker     | 整个 Attempt 失败后的业务重试，创建新 Attempt |
| Tool       | 仅幂等 Tool 的网络瞬时错误                    |

非幂等 Tool 不自动重试。模型 fallback 若可能改变行为或能力，必须作为新 Attempt 记录，并更新解析后的模型快照。

### 12.3 错误分类

统一映射为稳定错误码：

```text
MODEL_AUTH_FAILED
MODEL_RATE_LIMITED
MODEL_TIMEOUT
MODEL_CONTEXT_EXCEEDED
MODEL_CAPABILITY_UNSUPPORTED
MODEL_BAD_RESPONSE
TOOL_VALIDATION_FAILED
TOOL_EXECUTION_FAILED
RUN_MAX_TURNS_EXCEEDED
RUN_CANCELLED
INTERNAL_ERROR
```

对外事件只包含安全错误摘要和 `retryable`；供应商响应体、请求头与堆栈保存在受限服务端日志中。

## 13. 可观测性与用量

使用三个互补层级：

| 层级              | 用途                                  | 关联键                                     |
| ----------------- | ------------------------------------- | ------------------------------------------ |
| Wex Event/Log     | 产品状态、审计、SSE 回放              | `runId`、`attemptId`、`projectId`          |
| Agents SDK Trace  | Agent Loop、Handoff、Tool 和模型 Span | `traceId`、`runId`、`attemptId`            |
| LiteLLM Log/Spend | 网关路由、上游延迟、token 与成本      | virtual key、model alias、`runId` metadata |

要求：

- `runId` 是 Wex 与 LiteLLM 之间的主要关联键，`attemptId` 用于区分业务重试。
- 每个 Attempt 创建独立 Trace，并将 `runId`、`attemptId`、`projectId`、`agentVersion` 和模型别名写入 Trace metadata。
- 调用 LiteLLM 时透传允许的关联 metadata，但不发送用户密钥、完整代码或敏感 prompt。
- `usage.updated` 允许 token 缺失，因为部分兼容模型或流式响应不一定返回完整 Usage。
- Wex 账单数据以 LiteLLM/供应商确认的 Usage 为准，SDK Usage 用于实时估算，二者不能直接重复计费。
- OpenAI Trace 导出失败只记录告警，不改变 AgentRun 的业务结果；Wex Event 仍是运行状态的权威来源。
- 生产启用前必须确认 Trace 中 prompt、模型输出、Tool 参数和 Tool 结果的脱敏策略与数据保留期。

## 14. 安全要求

- OpenAI 和其他上游模型密钥只注入 LiteLLM，并由服务端 Secret Manager 管理。
- `OPENAI_TRACE_API_KEY` 使用独立 OpenAI Project 或服务账号创建，只保存在 Worker 的 Secret Manager 中，不得用于模型调用。
- Worker 使用 LiteLLM virtual key，并限制可访问模型、预算、并发和有效期。
- LiteLLM 管理端口、UI 和 master key 不对公网开放。
- Prompt、Tool 参数、文件内容和模型输出进入日志前统一脱敏。
- 任何模型输出都视为不可信输入；写文件、执行命令、渲染 HTML 时再次校验。
- Hosted Tool、MCP Tool 和 Sandbox Tool 分别配置 allowlist，不能因模型切换自动扩权。
- 项目和用户标识从已认证服务端上下文取得，不相信请求 body 中的 owner 字段。
- AgentRun、ToolCall、Approval 和模型路由变化必须可审计。

## 15. 测试策略

### 15.1 单元测试

- 模型角色到别名、API 模式和能力的解析。
- SDK 事件到 Wex 事件的完整映射与未知事件处理。
- 供应商错误到稳定错误码的映射。
- Tool 参数校验、路径约束、超时和取消。
- 日志与事件脱敏。

### 15.2 合约测试

对每个允许上线的模型别名执行相同用例：

| 能力              | 必测场景                                  |
| ----------------- | ----------------------------------------- |
| 基础生成          | 非流式与流式输出                          |
| Tool Calling      | 单 Tool、多 Tool、参数校验失败、Tool 异常 |
| Structured Output | 合法、拒绝、schema 不匹配                 |
| Usage             | 非流式、流式、Usage 缺失                  |
| 错误              | 401、429、超时、上下文超限、上游 5xx      |
| 取消              | 模型生成中取消、Tool 执行中取消           |

合约测试结果形成能力矩阵。模型只有通过对应能力用例，才能被分配给需要该能力的 Agent。

### 15.3 集成测试

- 使用假的 OpenAI-compatible Server 验证 Worker，不依赖真实费用和网络。
- 使用本地 LiteLLM 容器验证鉴权、别名、Streaming 和错误映射。
- 使用单个受控真实模型运行 smoke test，验证端到端事件关联与 Usage。
- 验证 OpenAI Traces Dashboard 能按 `runId` 和 `attemptId` 定位完整 Agent Loop、模型请求与 Tool Span。
- 模拟 Trace 导出失败，确认 AgentRun 仍能正常完成并写入 Wex Event。
- 验证 SSE 断开重连后按 sequence 补发且不重复。

## 16. 分阶段实施

### Phase 1：最小模型链路

- 安装 `@openai/agents` 和 Zod v4。
- 扩展 `@wex/model`，实现模型目录与 Provider 工厂。
- 本地运行 LiteLLM Proxy，配置一个 `coding-fast` 别名。
- Worker 执行一个无 Tool 的流式 AgentRun。
- 配置独立 OpenAI Trace 凭据，并验证 Traces Dashboard 可查询对应 Run。
- 输出标准化事件并完成单元测试。

验收：Runtime 只能通过 LiteLLM 调用模型，切换 LiteLLM 模型别名不需要修改 Agent 定义，且业务层不感知 SDK 类型。

### Phase 2：Coding Tools 与持久化

- 接入 Sandbox 文件、Shell、Build/Test Tool。
- 建立 AgentRun、Attempt、Event、Message、ToolCall 与 Usage schema。
- 事件先持久化再由 SSE 推送。
- 实现取消、超时、错误映射和基础 Approval。

验收：页面关闭后 Run 继续执行，重新打开后可回放事件；危险 Tool 未审批不得执行。

### Phase 3：可靠性与多模型

- 引入队列、幂等消费和 Worker 优雅退出。
- 完成模型能力矩阵与受控 fallback。
- 接入 LiteLLM virtual key、预算、限流和可观测性。
- 建立 Checkpoint，并实现真正的 interrupt/resume。

验收：Worker 重启、网络抖动和上游限流不会产生重复副作用，Run 可追踪到实际模型与成本。

### Phase 4：评估与渐进发布

- 建立固定 Coding Task Eval 集。
- 对模型或 Prompt 变更执行质量、延迟、Tool 成功率与成本回归。
- 按用户或项目灰度模型配置版本。
- 建立失败率、P95 首 token 延迟、总耗时和单位 Run 成本告警。

## 17. 首阶段验收清单

- [ ] Worker 启动时校验必要环境变量，错误信息不包含密钥。
- [ ] 模型 Provider 只配置 LiteLLM `baseURL` 与 virtual key，不配置任何上游供应商密钥。
- [ ] Trace 使用独立 `OPENAI_TRACE_API_KEY`，且该凭据不会进入模型 Provider。
- [ ] Runtime 仅调用 LiteLLM Chat Completions，不提供 Responses 模式配置且不请求 `/responses` 端点。
- [ ] 模型别名与供应商真实模型名解耦。
- [ ] 每个 Run 固化模型解析快照和配置版本。
- [ ] 支持流式文本、最终消息、Usage 缺失和取消。
- [ ] LiteLLM 不可用时返回稳定的可重试错误，不静默直连供应商。
- [ ] 未通过能力测试的模型不能启用 Tool 或 Structured Output。
- [ ] API/Web 不持有任何模型供应商或 LiteLLM 管理密钥。
- [ ] OpenAI Traces Dashboard 可通过 `runId`、`attemptId` 定位 Run，Trace 失败不影响业务状态。
- [ ] 单元测试、LiteLLM 合约测试与真实模型 smoke test 均通过。

## 18. 待确认事项

实施 Phase 1 前需要确定：

1. 首批上游模型供应商及模型别名，不在代码中写死具体供应商模型。
2. LiteLLM 部署位置、数据库和 Secret Manager 方案。
3. 首版是否立即落 AgentRun/Event 表，还是先以 Worker CLI smoke test 验证模型链路。
4. OpenAI Trace 的敏感数据脱敏、访问权限和保留周期。

## 19. 官方资料

- [OpenAI Agents SDK for TypeScript](https://openai.github.io/openai-agents-js/)
- [OpenAI Agents SDK 模型与 Provider](https://openai.github.io/openai-agents-js/guides/models/)
- [OpenAI Agents SDK 配置](https://openai.github.io/openai-agents-js/guides/config/)
- [OpenAI Agents SDK 自定义 Provider 示例](https://github.com/openai/openai-agents-js/blob/main/examples/model-providers/custom-example-provider.ts)
- [OpenAI API 鉴权](https://developers.openai.com/api/reference/overview#authentication)
- [LiteLLM 官方文档](https://docs.litellm.ai/)

> SDK 与 LiteLLM 仍在持续演进。实现时应锁定精确依赖与容器版本，并以对应版本的官方类型定义和兼容性测试结果为准。
