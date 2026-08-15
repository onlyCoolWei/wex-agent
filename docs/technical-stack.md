# Coding Agent 技术栈与架构设计

本文面向类似 Lovable、Claude Code 或 Codex 的 Coding Agent 产品，给出一套适合 TypeScript 团队的技术选型与系统边界。

核心目标不是搭建一个普通的 CRUD 应用，而是构建一个具备长时间运行、实时事件、任务恢复、人工审批和隔离执行能力的 **Agent Runtime Server**。

## 技术栈总览

| 层级              | 推荐技术                           | 主要职责                                  |
| ----------------- | ---------------------------------- | ----------------------------------------- |
| Web               | React、Vite、TypeScript            | Chat、项目管理、文件树、运行状态、Preview |
| UI                | Tailwind CSS、shadcn/ui            | 组件体系与交互界面                        |
| API Server        | NestJS                             | API、认证、业务编排、权限、事件订阅       |
| Agent Runtime     | `@openai/agents` + 自研封装        | Agent Loop、Tool、Context、Runner         |
| Background Worker | NestJS Worker，后续可接 BullMQ     | 执行长时间 Agent Run 与恢复任务           |
| Model Gateway     | LiteLLM                            | 模型路由、兼容层、用量与策略控制          |
| Database          | Supabase PostgreSQL                | 项目、会话、运行状态、事件与审计数据      |
| ORM               | Drizzle ORM                        | Schema、Migration 与类型安全的数据访问    |
| Sandbox           | Docker，预留 Daytona / E2B         | 隔离 Workspace、Shell、Build、Preview     |
| 实时通信          | REST + SSE                         | 命令提交、状态查询与单向事件流            |
| Monorepo          | pnpm workspace + Turborepo（可选） | 应用与共享 Package 管理                   |

## 架构原则

### 1. Agent Run 是核心业务实体

系统不应只保存 Chat Message，还需要记录每一次 Agent 执行及其完整生命周期。Interrupt、Resume、Retry、Replay、Eval 和 Debug 都应围绕 `AgentRun` 展开。

### 2. API 与长任务执行分离

NestJS API Server 负责接收命令、鉴权和查询状态；Worker 负责执行可能持续数分钟甚至更久的 Agent 任务。用户关闭浏览器后，任务仍可继续执行。

### 3. Runtime 与框架解耦

业务模块不应直接依赖 OpenAI Agents SDK 的 `Runner`。SDK 应封装在独立 Runtime 接口之后，避免未来替换或扩展 Runtime 时影响 Controller 和业务逻辑。

### 4. Sandbox 与 Runtime 解耦

Agent 通过统一的 Sandbox 接口访问文件、Shell、构建和 Preview，不直接依赖 Docker、Daytona 或 E2B 的具体 API。

### 5. 事件先持久化，再实时推送

SSE 是事件的传输方式，不应成为唯一事件来源。运行事件应先写入持久化存储，再推送给前端，以支持断线重连、历史回放和调试。

## 前端

### 技术选型

```text
React
Vite
TypeScript
Tailwind CSS
shadcn/ui
```

### 主要功能

- Chat 与消息流
- Project 管理
- File Tree 与文件查看
- Agent Run 状态
- Tool Call 与实时日志
- Approval 请求
- Build / Test 结果
- Preview
- Interrupt、Resume 与 Retry

前端只维护展示所需的临时状态。Agent Run 的权威状态应保存在服务端，页面刷新或重新打开后能够从服务端恢复。

## API Server

### 为什么选择 NestJS

该产品的后端会逐渐形成清晰的业务域，而不是一组简单的 API Routes：

```text
NestJS
  |- AuthModule
  |- ProjectModule
  |- SessionModule
  |- AgentRunModule
  |- AgentModule
  |- SandboxModule
  |- WorkspaceModule
  |- EventModule
  |- ApprovalModule
  |- ModelModule
  `- EvalModule
```

NestJS 的模块、依赖注入、Guard、Interceptor 和生命周期机制适合组织这些边界。但 NestJS 本身并不自动提供持久化的长任务能力，因此生产环境仍应将 Agent 执行放入独立 Worker，并按需要引入任务队列。

### API Server 的职责

- 用户认证与项目权限
- 创建和查询 Project、Session、AgentRun
- 接收 Interrupt、Resume、Retry 和 Approval 命令
- 对外提供 REST API 与 SSE
- 将待执行任务提交给 Worker
- 查询持久化状态，不持有唯一的运行时状态

## Agent Runtime

第一阶段使用：

```text
@openai/agents
```

并在其上封装稳定的业务接口：

```text
AgentRuntime
  |- run()
  |- interrupt()
  |- resume()
  |- submitApproval()
  `- subscribe()
         |
         v
OpenAI Agents SDK
  |- CodingAgent
  |- Tools
  |- Context
  `- Runner
```

Controller、Worker 和业务模块不应到处直接调用 `Runner`。统一通过应用自己的接口访问：

```ts
interface AgentRuntime {
  run(input: RunInput): AsyncIterable<AgentEvent>;
  interrupt(runId: string): Promise<void>;
  resume(runId: string): AsyncIterable<AgentEvent>;
  submitApproval(input: ApprovalInput): Promise<void>;
}
```

这样可以逐步将 Context、Compaction、Retry、Checkpoint 和 Evaluation 沉淀到自有 Runtime，而不与 NestJS Controller 耦合。

### Runtime 内部边界

```text
Agent Runtime
  |- Agent Loop
  |- Context Manager
  |- Session Manager
  |- Tool Registry
  |- Model Provider
  |- Event Publisher
  |- Checkpoint Store
  `- Sandbox Provider
```

## AgentRun 模型

`AgentRun` 是整个系统的核心实体：

```text
AgentRun
  |- id
  |- projectId
  |- sessionId
  |- status
  |- model
  |- input
  |- startedAt
  |- finishedAt
  |- interruptedAt
  `- error
```

它关联运行过程中的其他数据：

```text
AgentRun
  |- Events
  |- Messages
  |- ToolCalls
  |- Approvals
  |- Checkpoints
  |- Artifacts
  `- Evaluations
```

### 建议状态机

```text
queued
  -> running
  -> waiting_for_approval
  -> interrupted
  -> completed
  -> failed
  -> cancelled
```

允许的恢复路径应明确建模，例如：

```text
waiting_for_approval -> running
interrupted          -> running
failed               -> queued (new attempt)
```

不要仅通过一组布尔字段表达运行状态，否则很容易出现 `completed = true` 与 `failed = true` 同时成立的非法状态。

## Worker 与任务队列

### MVP

开发早期可以由单独的 NestJS Worker 进程直接执行任务：

```text
API Server -> Database -> Worker
```

即使暂时不引入队列，也应从第一版开始保持 API 与 Worker 的代码和进程边界。

### 生产阶段

当需要多实例、并发控制、自动重试和故障恢复时，引入：

```text
BullMQ + Redis
```

```text
API Server
  -> Queue
  -> Agent Worker
  -> Agent Runtime
  -> Sandbox
```

队列只负责调度，不应成为 AgentRun 状态的唯一数据源。业务状态仍应持久化到 PostgreSQL。

### 执行要求

- 每个 Run 使用稳定的 `runId`
- Retry 创建明确的 Attempt，避免覆盖历史结果
- Worker 重复消费时应具备幂等保护
- 关键步骤生成 Checkpoint
- 服务重启后能够识别并恢复或终止悬挂任务
- 并发限制至少覆盖用户、项目和 Sandbox Provider 三个维度

## Sandbox 与 Workspace

### 抽象接口

```text
SandboxService
      |
      v
Sandbox Interface
  |- DockerSandbox
  |- DaytonaSandbox
  `- E2BSandbox
```

第一版使用 `DockerSandbox` 即可，但 Runtime 只依赖统一接口：

```ts
interface Sandbox {
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exec(command: Command): Promise<CommandResult>;
  startPreview(input: PreviewInput): Promise<PreviewHandle>;
  dispose(): Promise<void>;
}
```

### Sandbox 职责

- 隔离文件系统与进程
- 限制 CPU、内存、磁盘和执行时间
- 控制网络访问
- 注入最小化的临时凭证
- 收集 stdout、stderr 和退出码
- 管理 Workspace 生命周期
- 暴露受控的 Preview 地址

Sandbox 内运行的代码默认应视为不可信代码。不要直接挂载宿主机 Docker Socket，也不要将长期密钥写入 Workspace。

## 数据库

### 技术选型

```text
NestJS
  -> Drizzle ORM
  -> Supabase PostgreSQL
```

对于 TypeScript 团队，Drizzle 较轻，并能提供良好的 Schema 与类型体验。如果团队已经大量使用 Prisma，则继续使用 Prisma 更合理，没有必要仅为该项目切换 ORM。

### 核心数据表

```text
users
projects
project_members
sessions
messages
agent_runs
agent_run_attempts
agent_events
tool_calls
approvals
checkpoints
artifacts
evaluations
```

大型日志、构建产物、截图和压缩 Workspace 不宜直接存入 PostgreSQL。数据库保存元数据和引用，实际文件放入对象存储，例如 Supabase Storage 或兼容 S3 的服务。

## Model Gateway

模型调用链路：

```text
Agent Runtime
  -> ModelService
  -> OpenAI-compatible API
  -> LiteLLM
  -> Provider / Company Model
```

业务代码不应散落具体模型名称，应通过稳定的逻辑角色选择模型：

```ts
modelService.getModel("coding");
modelService.getModel("fast");
modelService.getModel("reasoning");
modelService.getModel("vision");
```

`ModelService` 负责：

- 逻辑角色到具体模型的映射
- 超时、重试和降级策略
- Token 与费用记录
- Provider 能力差异适配
- 项目或租户级模型策略

模型网关解决的是 Provider 接入与路由问题；Agent Runtime 仍需负责 Tool、Context、Session 和执行状态。

## 前后端通信

### REST：命令与查询

```text
POST /projects
GET  /projects/:id
GET  /projects/:id/files

POST /agent-runs
GET  /agent-runs/:id
POST /agent-runs/:id/interrupt
POST /agent-runs/:id/resume
POST /agent-runs/:id/retry
POST /agent-runs/:id/approvals/:approvalId
```

### SSE：实时事件

```text
GET /agent-runs/:id/events
```

建议统一事件 Envelope：

```ts
interface AgentEvent<T = unknown> {
  id: string;
  runId: string;
  sequence: number;
  type: string;
  createdAt: string;
  payload: T;
}
```

事件类型示例：

```text
run.queued
run.started
message.delta
tool.started
tool.stdout
tool.completed
file.changed
build.started
build.failed
approval.required
run.interrupted
run.completed
run.failed
```

MVP 阶段 SSE 足以承载服务端到浏览器的单向事件流，不必提前引入 WebSocket。客户端命令仍通过 REST 发送。

SSE 需要支持：

- 事件 ID 或单调递增的 Sequence
- `Last-Event-ID` 断线续传
- 心跳与连接超时
- 重连后从数据库补发遗漏事件
- 对 Token Delta 等高频事件进行批量写入或合并，避免数据库写放大

## 整体架构

```text
                         React + Vite
                               |
                          REST + SSE
                               |
                               v
                        NestJS API Server
                     /         |          \
                    v          v           v
              PostgreSQL    Object       Job Queue
                            Storage          |
                                             v
                                      Agent Worker
                                             |
                                             v
                                      Agent Runtime
                                  /          |          \
                                 v           v           v
                          ModelService   Event Store   Sandbox
                               |                         |
                               v                         v
                            LiteLLM                    Docker
                               |                         |
                               v                         v
                            Models                   Workspace
                                                         |
                                               Files / Shell / Build
                                                         |
                                                         v
                                                      Preview
```

MVP 可以省略 Redis 和 BullMQ，但不应省略 `AgentRun` 持久化、事件记录以及 API / Worker 的逻辑边界。

## Monorepo 目录建议

```text
apps/
  |- web/                  # React + Vite
  |- api/                  # NestJS API Server
  `- worker/               # Agent Worker

packages/
  |- agent-runtime/          # 后续基于 OpenAI Agents SDK 新建
  |
  |- sandbox/
  |   |- sandbox.interface.ts
  |   `- docker.sandbox.ts
  |
  |- database/
  |   |- schema/
  |   `- migrations/
  |
  |- model/
  |- contracts/            # API DTO、事件 Schema
  `- shared/
```

后续新建的 `packages/agent-runtime` 不应依赖 NestJS Controller，`packages/sandbox` 不应依赖具体 Agent SDK。依赖方向建议保持为：

```text
apps -> packages

agent-runtime -> sandbox interface / model interface / contracts
sandbox implementation -> sandbox interface
```

## 分阶段实施

### Phase 1：可运行的单机 MVP

- React + Vite 基础界面
- NestJS API
- OpenAI Agents SDK 封装
- PostgreSQL 与 Drizzle
- Docker Sandbox
- REST + SSE
- AgentRun、Event、ToolCall 持久化
- 单独 Worker 进程

### Phase 2：可恢复与可审计

- Interrupt、Resume、Retry
- Approval 流程
- Checkpoint
- SSE 断线续传
- Artifact 对象存储
- 完整状态机与审计日志

### Phase 3：生产调度能力

- BullMQ + Redis
- 多 Worker 与并发限制
- 超时、重试与故障恢复
- 远程 Sandbox Provider
- 模型路由、预算和用量控制

### Phase 4：质量与评测

- Context Compaction
- Memory
- Build / Test / Runtime Verification
- Eval Pipeline
- Trace 与成本分析
- Error Detection -> Auto Repair 闭环

## 最终建议

推荐保留以下技术选型：

```text
React + Vite + TypeScript
NestJS
OpenAI Agents SDK
Drizzle + Supabase PostgreSQL
LiteLLM
Docker Sandbox
REST + SSE
```

同时从第一版就明确三个边界：

1. NestJS API Server 与 Agent Worker 分离。
2. Agent Runtime 不直接依赖 Controller 或具体 Sandbox 实现。
3. SSE 只负责传输，PostgreSQL 中的 AgentRun 与 Event 才是可恢复的状态来源。

这套架构能够先以较低复杂度完成 MVP，也为后续加入 Compaction、Memory、Interrupt、Approval、Retry、Evaluation 和远程 Sandbox 保留清晰的演进路径。
