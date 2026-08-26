# Supabase Identity and Persistence

Status: Current
Last verified: 2026-08-26
Read when: 修改 Supabase Auth、服务端密钥、数据库 Client、migration、类型生成或 RLS
Applies to: `packages/database`、API/Worker 服务端配置、Web Auth 配置和 `supabase/migrations`

## Related

- Business: `docs/business/identity-and-access.md`
- Technical module: `docs/technical/identity-and-access.md`
- Architecture: `ARCHITECTURE.md`
- ADR: `docs/adr/README.md`

## Architecture Contract

- 必须遵守根目录 `ARCHITECTURE.md`。
- Web 只使用浏览器安全的 publishable/anon key。
- API 和 Worker 通过 `@wex/database` 创建高权限 Supabase Client。
- Schema 变化必须使用 migration，并同步 `database.types.ts` 和相关模块文档。
- RLS 是纵深防御；高权限 Client 不替代 API 的身份验证和对象授权。

## Current Implementation

```text
apps/web
  -> Supabase Auth with publishable/anon key

apps/api + apps/worker
  -> @wex/database
  -> Supabase server client with secret/service-role key
  -> Auth / PostgreSQL functions and tables
```

`packages/database/src/index.ts` 校验服务端 URL 和 key，并返回带生成 `Database` 泛型的 Supabase Client。API 和 Worker 在各自 NestJS Database Module 中注入该 Client。

## Configuration

| Variable                        | Consumer   | Rule                           |
| ------------------------------- | ---------- | ------------------------------ |
| `SUPABASE_URL`                  | Web/server | 项目 URL；Web 由 Vite 显式注入 |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Web        | 浏览器安全 key                 |
| `VITE_SUPABASE_ANON_KEY`        | Web        | publishable key 的兼容后备名称 |
| `SUPABASE_SECRET_KEY`           | API/Worker | 首选服务端高权限 key           |
| `SUPABASE_SERVICE_ROLE_KEY`     | API/Worker | 旧项目兼容后备；不得进入浏览器 |

从 `.env.example` 创建本地配置：

```bash
cp .env.example .env
```

`.env` 不得提交。Secret/service-role key 会绕过 RLS，只能存在于受控服务端环境。

## Auth Setup

Supabase Dashboard 必须配置：

1. 在 **Authentication -> URL Configuration** 中加入本地回调 `http://localhost:5173/auth/callback`。
2. 启用 Email provider 和邮箱确认。
3. 如使用 Google，启用 Provider 并配置 Google OAuth client ID、secret 和 Supabase callback URL。

当前 Email 流程使用 Supabase 默认确认链接模板 `{{ .ConfirmationURL }}`。修改邮件模板、SMTP 或验证码流程会改变认证行为，必须同步 Business、Design 和 Identity Technical 文档。

## Migrations

当前 migration 按时间顺序负责：

| Migration                                | Responsibility                                   |
| ---------------------------------------- | ------------------------------------------------ |
| `20260815000000_create_health_check.sql` | `health_check()` 数据库连通性函数                |
| `20260815010000_create_projects.sql`     | Projects 表、约束、索引和 RLS                    |
| `20260816020000_create_chat.sql`         | Conversations、Messages、Runs、Events 和事务函数 |

关联远程项目后，先预览再推送：

```bash
supabase link --project-ref <project-ref>
supabase db push --dry-run
supabase db push
```

新增 Schema 必须创建新 migration，不得直接修改已经推送的历史 migration：

```bash
supabase migration new <change_name>
```

## Generated Types

数据库类型位于 `packages/database/src/database.types.ts`。Schema 推送并核对后重新生成：

```bash
supabase gen types typescript --linked > packages/database/src/database.types.ts
```

生成文件只由生成命令更新，不手工编辑。类型变化必须同步所有查询、映射和 Contracts；数据库行类型不能直接成为 HTTP 契约。

## Health Check

启动 API 后请求：

```bash
curl http://localhost:3001/api/health/database
```

成功响应包含 `service: "supabase"`、`status: "ok"`、延迟和时间戳。该检查证明 API 能调用数据库函数，不证明业务表、RLS、Auth 或所有权规则正确。

## Failure Handling

| Failure                         | Likely cause or action                         |
| ------------------------------- | ---------------------------------------------- |
| `Missing SUPABASE_URL`          | 根 `.env` 缺失或未填写项目 URL                 |
| `Missing SUPABASE_SECRET_KEY`   | 未填写 secret 或兼容 service-role key          |
| `Invalid SUPABASE_URL`          | URL 非法或不属于 HTTP(S)                       |
| `health_check() does not exist` | migration 未推送，或关联了错误项目             |
| `401` / `Invalid API key`       | key 错误、已轮换，或 URL 与 key 不属于同一项目 |
| 浏览器 Auth 配置缺失            | 检查 publishable key 和 Vite 环境注入          |

应用对外错误必须稳定且非敏感；完整 Supabase 错误只记录在受控服务端日志中。

## Security

- 不得提交 `.env`、Supabase secret/service-role key、OAuth secret 或访问 Token。
- 不得以 `VITE_` 前缀暴露服务端 key。
- 浏览器 publishable key 仍必须配合 RLS 和服务端授权使用。
- 高权限 Client 的业务查询必须显式约束对象所有权。
- Migration 中的新函数必须检查执行权限，并只向需要的数据库角色授权。

## Known Implementation Gaps

- API 尚未验证 Supabase Access Token 或按真实 `owner_id` 隔离数据。
- 业务表虽启用 RLS，但当前应用链路依赖绕过 RLS 的高权限 Client。
- 仓库没有自动推送 migration 的 CI；远程变更需要人工预览和执行。

## Change Map

| Change            | Also inspect                                              |
| ----------------- | --------------------------------------------------------- |
| Auth provider     | Web Auth、回调 URL、Session 流程、环境示例和身份文档      |
| Server key        | 部署 secret、轮换流程、API/Worker 启动和日志              |
| Table or column   | migration、generated types、queries、Contracts 和模块文档 |
| Database function | 调用方、事务/幂等语义、grant/revoke 和错误映射            |
| RLS or ownership  | API Auth Guard、所有业务查询、service-role 使用和授权测试 |

## Verification

```bash
supabase db push --dry-run
pnpm --filter @wex/database typecheck
pnpm --filter @wex/api typecheck
pnpm --filter @wex/worker typecheck
pnpm typecheck
```

连接真实 Supabase 项目后，再执行数据库健康检查并验证表约束、函数权限和 RLS。缺少项目或凭据时必须明确报告这些检查未运行。
