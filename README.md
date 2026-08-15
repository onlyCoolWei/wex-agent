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

详细设计见 [技术栈与架构设计](docs/technical-stack.md)。

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

API 启动后可通过 <http://localhost:3001/api/health/database> 验证 Supabase 连接。首次连接还需要将 `supabase/migrations/` 中的 migration 推送到项目，具体步骤见 [Supabase 接入指南](docs/supabase.md)。

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
- Web 到 API 的健康检查链路
- Supabase 服务端客户端、配置校验与数据库健康检查

暂未接入：

- Drizzle ORM 与 AgentRun 等业务 Schema
- BullMQ / Redis
- Docker Sandbox 实现
- 基于 OpenAI Agents SDK 的 Agent Runtime
- AgentRun、Event 与 Checkpoint 持久化

这些能力会按 `docs/technical-stack.md` 中的阶段规划逐步加入。
