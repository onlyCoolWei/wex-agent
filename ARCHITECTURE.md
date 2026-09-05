# Wex Agent Architecture

Status: Current
Last verified: 2026-08-26
Read when: 修改跨应用契约、数据库、认证、Worker、模型网关、Sandbox 或基础设施边界
Applies to: 全仓库应用、共享 Package 和 Supabase 持久化边界

## Purpose

本文是 Wex Agent 的全局技术架构事实来源。模块技术文档必须遵守本文；本文只定义稳定边界和当前真实链路，不替代模块实施方案或 ADR。

## System Shape

```text
Browser
  -> apps/web
       -> @wex/contracts
       -> apps/api (REST / SSE)

apps/api
  -> packages/database
  -> packages/contracts
  -> Supabase PostgreSQL

apps/worker
  -> packages/database
  -> packages/model
  -> packages/contracts
  -> Agent Runtime / LiteLLM

packages/sandbox
  -> Sandbox interface boundary; API owns Project lifecycle provisioning
```

## Workspace Boundaries

| Workspace            | Responsibility                                                      | Must not own                         |
| -------------------- | ------------------------------------------------------------------- | ------------------------------------ |
| `apps/web`           | 页面、浏览器交互、客户端会话和 SSE 展示                             | 服务端密钥、数据库直写、业务契约副本 |
| `apps/api`           | HTTP、输入校验、业务编排、Project/Conversation 访问和 REST/SSE 边界 | 长时间 Agent 执行、模型 SDK 细节     |
| `apps/worker`        | 领取 queued Run、调用 Agent Runtime、持久化事件和结果               | 对外 HTTP 业务接口、页面状态         |
| `packages/contracts` | 跨应用 DTO、状态类型和事件契约                                      | 应用业务编排和供应商实现             |
| `packages/database`  | Supabase Client、数据库类型和持久化原语                             | 页面或 API 响应映射                  |
| `packages/model`     | 模型别名、Provider 配置和模型适配抽象                               | 业务规则和浏览器调用                 |
| `packages/sandbox`   | Sandbox 能力接口和实现边界                                          | 调用方依赖具体 Sandbox 供应商        |
| `packages/shared`    | 多 workspace 使用的领域无关工具                                     | 业务模块和临时公共代码               |

依赖方向是应用指向 Package；应用之间不得互相 import。跨应用类型进入 `@wex/contracts`，不得在消费者中复制边界类型或深度导入其他 workspace 的 `src`。

## Runtime Flows

### Project

```text
Web -> API -> packages/database -> Supabase PostgreSQL
                                      |
                                      v
                             ProjectResponse
                                      |
                                      v
                              Web navigation/list
```

Project ID 由数据库生成，Web 只能使用服务端返回的 ID。Project 列表、创建和删除都经过 API；Web 不直接使用高权限 Supabase key。

### Conversation and Agent Run

```text
Web -> POST API
    -> persist User Message + Assistant placeholder + queued Run
    -> Worker claims Run
    -> Agent Runtime -> Model Gateway / LiteLLM
    -> persist Agent Events and final Message/Run state
    -> Web reads persisted state and subscribes through SSE
```

PostgreSQL 是 Message、Agent Run 和 Agent Event 的权威来源。SSE 只负责传输已产生的事件，断线或刷新不能改变服务端执行状态。

## Contracts and Persistence

- `packages/contracts` 定义 Project、Conversation、Message、Agent Run、Agent Event、健康检查和错误边界的稳定形状。
- 数据库 migration 位于 `supabase/migrations/`，Schema 变化必须包含 migration、类型同步和相关文档。
- API 负责把持久化模型映射为 Contracts，不让数据库字段直接成为 Web 业务协议。
- `SUPABASE_SECRET_KEY` 只能出现在受控服务端进程；不得进入 Web bundle、浏览器请求或提交记录。

## Security and Current Gaps

- Web 受保护页面要求有效 Supabase Session。
- API 的服务端身份校验和基于 `owner_id` 的数据隔离仍需持续补齐；前端路由保护不能替代服务端授权。
- Sandbox 已接入 API 的 Project 创建/删除生命周期，但文件操作、Agent Tool 和真实网站 Preview 尚未形成运行链路。
- Project Sandbox 当前由 API 进程内登记；非优雅崩溃或重启后的容器恢复与清理仍未实现。

## Change Rules

跨应用 DTO、数据库 Schema、认证边界、Worker 生命周期、模型 Provider 或 Sandbox 接口发生变化时，必须先评估本架构的影响，并同步生产者、消费者、迁移、技术文档和测试。长期且难以逆转的取舍另建 `docs/adr/` 记录原因和后果。

## Related

- Business: `docs/business/README.md`
- Design: `DESIGN.md`
- Technical index: `docs/technical/README.md`
- ADR: `docs/adr/README.md`
