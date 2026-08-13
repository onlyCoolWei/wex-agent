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

## 当前阶段

已经具备：

- pnpm workspace 与 Turborepo 编排
- React Web、NestJS API、NestJS Worker 独立进程
- 共享 Contracts、Sandbox、Model 和 Database 边界
- Web 到 API 的健康检查链路

暂未接入：

- PostgreSQL / Drizzle
- BullMQ / Redis
- Docker Sandbox 实现
- 基于 OpenAI Agents SDK 的 Agent Runtime
- AgentRun、Event 与 Checkpoint 持久化

这些能力会按 `docs/technical-stack.md` 中的阶段规划逐步加入。
