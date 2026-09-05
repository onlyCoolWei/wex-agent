# Wex Agent

Wex Agent 是一个面向 Coding Agent 产品的 TypeScript Monorepo。当前阶段已建立 Web、API、Worker 与核心 Package 的独立边界，后续功能会在这些边界内逐步完善。

## Workspace

```text
apps/
  web/                  React + Vite 控制台
  api/                  NestJS API Server
  worker/               NestJS Agent Worker

packages/
  contracts/            API DTO 与事件契约
  sandbox/              Sandbox 接口
  database/             数据库配置与后续 Schema
  model/                模型抽象
  shared/               通用常量与工具
```

开发入口见 [CONTRIBUTING.md](CONTRIBUTING.md)，文档入口见 [docs 文档导航](docs/README.md)；总体技术架构见 [ARCHITECTURE.md](ARCHITECTURE.md)，全局设计约束见 [DESIGN.md](DESIGN.md)。

## 协作开发

开始修改仓库前，请先阅读根目录的 [AGENTS.md](AGENTS.md)。涉及产品行为时，先通过 [统一术语表](docs/glossary.md) 对齐语言，再从 [业务知识库](docs/business/README.md) 了解产品、能力状态和对应业务域；文档写法、模块边界、标准开发流程、风险分级与 Code Review 清单见 [协作开发与 Vibe Coding 质量守则](docs/collaboration-guide.md)。

## 开发环境

- Node.js 22+
- pnpm 10+

安装依赖：

```bash
pnpm install
```

配置 Supabase：

```bash
cp .env.example .env
# 编辑 .env，填写 SUPABASE_URL 和 SUPABASE_SECRET_KEY
```

API 启动后可通过 <http://localhost:3001/api/health/database> 验证 Supabase 连接。首次连接还需要将 `supabase/migrations/` 中的 migration 推送到项目，具体步骤见 [Supabase 接入指南](docs/technical/supabase.md)。

启动全部应用：

```bash
pnpm dev
```

默认地址：

- Web: <http://localhost:5173>
- API: <http://localhost:3001/api>
- API Health: <http://localhost:3001/api/health>

也可以单独启动：

```bash
pnpm dev:web
pnpm dev:api
pnpm dev:worker
```

## 验证

```bash
pnpm typecheck
pnpm build
```

## 查看 Monorepo 依赖

常用 Turborepo 操作已经封装为短命令：

```bash
# 查看所有 Package
pnpm deps

# 查看指定 Package 的依赖和任务
pnpm deps @wex/worker

# 生成构建依赖图：.turbo/build-graph.html
pnpm graph

# 预览构建任务及执行顺序，不真正构建
pnpm plan
```

## 当前阶段

已经具备：

- pnpm workspace 与 Turborepo 编排
- React Web、NestJS API、NestJS Worker 独立进程
- 共享 Contracts、Sandbox、Model 和 Database 边界
- Supabase Email/Password、Google OAuth 与 Web 受保护路由
- Project 创建、列表、打开、删除与 Supabase 持久化
- Conversation、Message、AgentRun、AgentEvent 持久化和 SSE 流式对话
- OpenAI Agents SDK + LiteLLM 单一网关的 Worker 执行链路，并通过 Langfuse（OpenTelemetry）记录运行观测
- Project 创建/删除时的本地 Docker Sandbox 生命周期

暂未接入：

- API 身份校验、基于 `owner_id` 的多用户数据隔离与完整 RLS 策略
- BullMQ / Redis 与多 Worker 生产调度
- 文件/命令 Tool 与真实网站 Preview
- AgentRun 的取消、重试、恢复、审批与 Checkpoint
- 文件版本、发布、团队协作与评测体系

当前产品能力和限制以 [业务知识库](docs/business/README.md) 为准，当前架构边界见 [ARCHITECTURE.md](ARCHITECTURE.md)，技术路线参考见 `docs/technical/architecture-roadmap.md`。
