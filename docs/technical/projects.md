# Projects Technical Implementation

Status: Current
Last verified: 2026-08-26
Read when: 修改 Project API、数据库 migration、工作台项目列表、创建或删除链路
Applies to: `apps/api/src/projects`、`apps/web/src/pages/workspace-page.tsx`、Contracts 和 Project persistence

## Related

- Business: `docs/business/projects.md`
- Design: `docs/design/projects.md`
- Architecture: `ARCHITECTURE.md`
- Technical topic: `docs/technical/supabase.md`

## Architecture Contract

- 必须遵守根目录 `ARCHITECTURE.md`。
- Web 只通过 API 读写 Project，不直接访问数据库。
- API 负责输入校验、业务编排、持久化映射和稳定错误。
- 跨应用请求与响应类型来自 `@wex/contracts`。
- Schema 变化必须通过 `supabase/migrations/` 完成，并同步数据库类型。

## Current Implementation

```text
WorkspacePage
  -> apps/web/src/lib/api.ts
  -> GET | POST | DELETE /api/projects
  -> ProjectsController
  -> ProjectsService
  -> @wex/database server client
  -> public.projects
```

工作台进入时获取数据库快照。创建使用数据库生成的 Project ID；删除只有在 API 确认成功后才更新本地列表。浏览器不缓存 Project 的权威事实，也不持有高权限 Supabase key。

## Boundaries

| Module    | Responsibility                   | Must not                               |
| --------- | -------------------------------- | -------------------------------------- |
| Web       | 加载、展示、操作反馈和导航       | 生成 Project ID，或复制服务端校验规则  |
| API       | 校验、字段映射、错误语义和持久化 | 接受客户端 `ownerId`，或泄露数据库错误 |
| Contracts | 稳定请求和响应形状               | 引用应用内部或数据库行类型             |
| Database  | Project 结构、约束、索引和 RLS   | 包含页面状态或 HTTP 字段命名           |

## Data

| Field        | Type        | Stable rule                                             |
| ------------ | ----------- | ------------------------------------------------------- |
| `id`         | UUID        | 数据库生成，API 返回后用于路由                          |
| `owner_id`   | UUID/null   | 当前可以为空；授权闭环后必须来自已验证主体              |
| `name`       | text        | 默认“未命名项目”；显式输入去除首尾空格后为 1-100 字符   |
| `status`     | text        | 数据允许 `active` / `archived`；当前产品只操作 `active` |
| `created_at` | timestamptz | 数据库生成；列表按其倒序                                |
| `updated_at` | timestamptz | 数据库生成；当前没有 Project 更新接口                   |

`public.projects` 启用 RLS，但没有向浏览器角色开放直接访问。API 使用 secret/service-role key，因此应用层仍必须显式执行所有权校验。

## Contracts

| Operation | Input            | Output              | Stable errors                     |
| --------- | ---------------- | ------------------- | --------------------------------- |
| List      | none             | `ProjectResponse[]` | database                          |
| Create    | optional `name`  | `ProjectResponse`   | validation, database              |
| Delete    | path `projectId` | `204 No Content`    | invalid UUID, not found, database |

稳定语义：

- `GET /api/projects` 按 `created_at desc` 返回；空列表是 `200` 和 `[]`。
- `POST /api/projects` 的空 body 使用默认名称；成功前 Web 不得导航。
- `DELETE /api/projects/:projectId` 校验 UUID；不存在返回 `404`；成功不返回 body。
- 数据库字段使用 `snake_case`，HTTP JSON 使用 `camelCase`，转换由 API Service 完成。
- 完整类型以 `packages/contracts/src/index.ts` 为准。

## Flows

### Create

```text
user action
  -> Web disables both create entries
  -> POST /api/projects
  -> validate optional name
  -> insert and select persisted row
  -> map ProjectResponse
  -> navigate with returned id
```

### Delete

```text
confirmed user action
  -> DELETE /api/projects/:projectId
  -> validate UUID
  -> delete persisted row
  -> database cascades conversations, messages, runs and events
  -> return 204
  -> Web removes the list item
```

## Consistency

- Project 是下级 Conversation、Message、Run 和 Event 的所有权根。
- 数据库成功前，Web 不得制造已创建或已删除的事实。
- 创建期间两个入口共享同一个 disabled 状态，避免重复请求。
- 删除期间只锁定目标操作；失败时保留 Project 和确认上下文。
- Contract 变化必须同步 API、Web 和数据库映射。
- Project Schema 变化必须同步 migration、`database.types.ts` 和本文。

## Failure Handling

| Failure              | Behavior                               |
| -------------------- | -------------------------------------- |
| 无效创建 body 或名称 | `400`，不访问数据库                    |
| 无效 Project UUID    | `400`                                  |
| 删除目标不存在       | `404`                                  |
| Supabase 操作失败    | 记录服务端上下文，对外返回非敏感 `500` |
| Web 请求或解析失败   | 保留当前页面数据，展示可重试错误       |
| 列表加载失败         | 展示错误状态，不伪装为空列表           |

## Security

- `SUPABASE_SECRET_KEY` 不得进入 Web bundle、浏览器请求或前端环境变量。
- API 不得返回 Supabase key、SQL、内部 Schema 或完整供应商错误。
- 授权闭环后，创建时的 `owner_id` 必须来自已验证主体。
- 授权闭环后，列表和删除必须同时按资源 ID 与当前 User ID 约束。

## Known Implementation Gaps

- API 尚未验证用户身份，也没有按真实 `owner_id` 过滤 Project。
- `owner_id` 当前可以为空，服务端链路只适合单用户开发环境。
- Web 和 API 当前没有该模块的自动化测试脚本。
- Project 页面不先加载 Project 详情；不存在 ID 通过 Conversation 加载错误体现。

## Change Map

| Change          | Also inspect                                                   |
| --------------- | -------------------------------------------------------------- |
| Project field   | migration、`database.types.ts`、Contracts、API 映射和 Web 展示 |
| Create behavior | `projects.service.ts`、`apps/web/src/lib/api.ts` 和工作台导航  |
| Delete behavior | 外键级联、active Run、保留策略和 `delete-project-dialog.tsx`   |
| Ownership       | Auth Guard、Project 查询、所有下级资源查询和 RLS               |
| Status          | 数据约束、列表过滤、允许操作和业务文档                         |

## Verification

```bash
pnpm --filter @wex/api typecheck
pnpm --filter @wex/web typecheck
pnpm typecheck
pnpm build
```

手工验证列表 loading/empty/error/populated、重复创建、创建失败、服务端 ID 导航、取消删除、删除失败、无效 UUID、不存在 Project 和级联删除。
