# Projects Project 创建、展示与删除技术方案

Status: Current
Last verified: 2026-08-26
Read when: 修改 Project API、数据库 migration、工作台项目列表、创建或删除链路
Applies to: `apps/api/src/projects`、`apps/web/src/pages/workspace-page.tsx`、Contracts 和 Projects migration

## Related

- Business: `docs/business/projects.md`
- Design: `docs/design/workspace-layout.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

> 文档定位：Project 首期实现方案与 API 细节。修改当前业务行为前先读 [`../business/projects.md`](../business/projects.md)，并以实际 Contracts、migration 和代码校准本文中的阶段描述。

## 1. 目标与范围

工作台通过 NestJS API 管理 Supabase 中的 Project：进入页面时加载并展示已有项目；点击“创建项目”时插入记录并使用数据库返回的 ID 跳转到 `/projects/:projectId`；点击项目删除按钮时，必须经过二次确认弹窗，再由 API 永久删除对应记录。

这里的“创建一个 project 的表”应拆成两件事：

1. 使用 Supabase migration **一次性创建** `projects` 表。
2. 用户每次点击按钮时，在 `projects` 表中**新增一条记录**，而不是动态创建新表。

本功能覆盖 Project 数据模型、创建、列表展示和删除链路。项目详情加载、重命名、归档、用户登录和 Agent Workspace 初始化不属于本次实现，但数据模型和接口边界需要为它们保留扩展空间。

## 2. 当前能力评估

结论：项目已具备 Project 创建、列表和删除的基础业务闭环；鉴权与详情数据加载仍待后续补齐。

| 层级            | 当前状态                                     | 判断     |
| --------------- | -------------------------------------------- | -------- |
| Web 创建入口    | 两个按钮共用真实异步创建逻辑                 | 已实现   |
| Web 项目展示    | 加载、错误、空状态和项目网格                 | 已实现   |
| Web 删除交互    | 原生模态 dialog 二次确认、删除中和失败状态   | 已实现   |
| Web API Client  | 集中封装创建、列表和删除请求                 | 已实现   |
| API Server      | NestJS 已启用 `/api` 前缀与 CORS             | 基础可用 |
| Project API     | `POST/GET/DELETE /api/projects`              | 已实现   |
| Supabase Client | `@wex/database` 已创建仅服务端使用的 Client  | 已具备   |
| 环境配置        | 已支持 `SUPABASE_URL`、`SUPABASE_SECRET_KEY` | 已具备   |
| 数据库连通性    | 已有 `health_check()` migration 和健康检查   | 已具备   |
| Project Schema  | migration 定义 projects 表、索引、约束和 RLS | 已实现   |
| 共享契约        | `@wex/contracts` 提供 Project 请求与响应类型 | 已实现   |
| 鉴权与租户隔离  | 没有 AuthModule、Guard 或当前用户上下文      | 缺失     |
| 自动化测试      | Web/API 当前未配置测试脚本                   | 缺失     |

工作台不缓存 Project 事实数据。每次进入页面都通过 `GET /api/projects` 获取数据库快照，创建使用服务端 ID，删除则在服务端确认成功后更新当前列表。

## 3. 目标架构

```text
WorkspacePage
  -> GET | POST | DELETE /api/projects
  -> ProjectsController
  -> ProjectsService
  -> Supabase server client
  -> public.projects
  <- 200 Project[] | 201 Project | 204
  -> 展示列表 | /projects/{project.id} | 移除列表项
```

浏览器不应直接持有 `SUPABASE_SECRET_KEY`。当前仓库已经选择由 API/Worker 使用高权限 Supabase Client，因此第一版继续采用 `Web -> API -> Supabase`，不要在 `apps/web` 中安装或初始化高权限 Supabase Client。

## 4. 数据库设计

新增 migration，例如：

```text
supabase/migrations/<timestamp>_create_projects.sql
```

建议第一版 schema：

```sql
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid null references auth.users(id) on delete cascade,
  name text not null default '未命名项目',
  status text not null default 'active'
    check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_owner_id_created_at_idx
  on public.projects (owner_id, created_at desc);

alter table public.projects enable row level security;

comment on table public.projects is 'Top-level user projects managed by Wex Agent';
```

字段说明：

| 字段         | 说明                                                      |
| ------------ | --------------------------------------------------------- |
| `id`         | 由数据库生成，API 创建成功后返回；前端不再自行生成项目 ID |
| `owner_id`   | 预留 Supabase Auth 用户关系；当前无登录系统时暂为 `null`  |
| `name`       | 第一版由服务端使用默认名称，也允许 API 接收合法名称       |
| `status`     | 使用约束而非 PostgreSQL enum，便于早期迭代                |
| `created_at` | 创建时间，后续项目列表排序使用                            |
| `updated_at` | 最近更新时间；后续更新接口必须同步维护                    |

RLS 开启后暂不创建面向 `anon` 或 `authenticated` 的 policy。API 使用 secret/service-role key，可以执行服务端受控操作；浏览器不能直接读写表。

> 注意：`owner_id = null` 只适合当前本地/单用户 MVP。接入登录后，创建接口必须从已校验的 access token 中取得用户 ID，禁止相信请求 body 传入的 `ownerId`。生产开放前还必须增加鉴权和限流，否则当前公开 API 可被任意调用者批量创建数据。

`updated_at` 第一版创建时由默认值处理。开始支持项目更新时，再增加统一 trigger 或由 Repository/Service 在每次 update 时显式写入，避免为尚不存在的更新流程提前加入隐式数据库行为。

## 5. API 契约

### 5.1 创建项目

```http
POST /api/projects
Content-Type: application/json
```

请求体：

```json
{}
```

可选支持名称：

```json
{
  "name": "未命名项目"
}
```

成功响应：

```http
HTTP/1.1 201 Created
```

```json
{
  "id": "6ca6e06d-4998-4c3f-b59f-c551d8121db6",
  "name": "未命名项目",
  "status": "active",
  "createdAt": "2026-08-15T10:00:00.000Z",
  "updatedAt": "2026-08-15T10:00:00.000Z"
}
```

共享契约建议放入 `packages/contracts/src/index.ts`：

```ts
export interface CreateProjectRequest {
  name?: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}
```

边界规则：

- 空 body 等价于使用默认名称。
- `name` 去除首尾空格后长度为 1 到 100；超出返回 `400`。
- Supabase 插入失败时，API 记录服务端错误详情，对外返回稳定的 `500`，不暴露 key、SQL 或内部 schema。
- 数据库字段使用 `snake_case`，HTTP JSON 使用 `camelCase`，转换在 API Service 内完成。
- 返回必须使用 `.insert(...).select(...).single()`，只有 Supabase 确认插入成功才允许前端跳转。

建议建立独立的 `ProjectsModule`、`ProjectsController` 和 `ProjectsService`，不要继续把业务接口堆叠到 `AppController`。Service 通过已有的 `SUPABASE_CLIENT` token 注入客户端。

第一版暂不要求幂等键，但前端必须在请求期间禁用两个创建按钮。若未来存在网络自动重试或移动端弱网场景，应增加 `client_request_id` 唯一列或 `Idempotency-Key`，避免一次操作产生两个项目。

### 5.2 获取项目列表

```http
GET /api/projects
```

成功返回 `200 OK`，响应为按 `created_at desc` 排序的 `ProjectResponse[]`：

```json
[
  {
    "id": "6ca6e06d-4998-4c3f-b59f-c551d8121db6",
    "name": "未命名项目",
    "status": "active",
    "createdAt": "2026-08-15T10:00:00.000Z",
    "updatedAt": "2026-08-15T10:00:00.000Z"
  }
]
```

边界规则：

- 没有项目时返回空数组和 `200`，不能用 `404` 表示空列表。
- Supabase 查询失败时记录内部详情，对外返回稳定的 `500`。
- 当前单用户 MVP 返回全部项目；接入 Auth 后必须按已认证的 `owner_id` 过滤。

### 5.3 删除项目

```http
DELETE /api/projects/:projectId
```

成功返回 `204 No Content`，不返回 JSON body。

边界规则：

- `projectId` 必须是 UUID，格式错误返回 `400`。
- 目标项目不存在时返回 `404`，不能把未删除任何记录当作成功。
- Supabase 删除失败时返回稳定的 `500`，且不得泄漏内部 schema 或凭据。
- 当前实现为永久硬删除；未来若产品需要回收站，应改用归档或 `deleted_at` 软删除模型。
- 删除属于破坏性操作，Web 必须在真正发送 DELETE 请求前显示二次确认弹窗。

## 6. Web 交互设计

将当前定时器替换为真实异步请求：

```ts
async function createProject(): Promise<ProjectResponse> {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error("创建项目失败");
  }

  return response.json() as Promise<ProjectResponse>;
}
```

页面状态流：

```text
idle
  -> 点击
creating（两个按钮同时 disabled）
  -> 成功：navigate(`/projects/${project.id}`)
  -> 失败：回到 idle，并显示可重试错误
```

列表加载状态流：

```text
loading
  -> 成功且有数据：展示项目网格
  -> 成功且为空：展示“创建第一个项目”空状态
  -> 失败：展示可见错误和重新加载按钮
```

删除状态流：

```text
idle
  -> 点击项目删除图标
confirming（二次确认 dialog）
  -> 取消：关闭弹窗，不发送请求
  -> 确认：deleting（禁用关闭、取消和重复确认）
     -> 成功：关闭弹窗并移除对应列表项
     -> 失败：保留弹窗并显示可重试错误
```

实现要求：

- `creating` 在请求开始前设为 `true`，在失败路径恢复为 `false`。
- 成功时直接使用 API 返回的 `id` 跳转，不再调用 `crypto.randomUUID()`。
- 删除人为的 650ms 延迟，loading 时长与真实请求一致。
- 捕获网络错误、非 2xx 响应和不可解析响应。
- 错误提示应通过页面可见且带 `role="alert"` 的区域呈现，不能只写入 console。
- 两个入口共用同一个 handler 和同一份状态，避免重复请求。
- API 基础地址建议集中在 `apps/web/src/lib/api.ts`。开发环境可继续使用 Vite 的 `/api` proxy；部署到不同域名时再读取 `VITE_API_URL` 并统一拼接。
- 项目项点击后进入 `/projects/:projectId`，删除图标必须是独立按钮，不能因为事件冒泡误打开项目。
- 删除确认使用真正的模态 `dialog`，支持 Escape 和遮罩取消，并在删除期间阻止关闭。
- 项目列表的加载失败不能退化为空状态，否则用户会误以为项目已丢失。
- 列表和单项响应都必须做运行时结构校验，不能只依赖 TypeScript 类型断言。

## 7. 实施顺序与文件清单

### 阶段 A：数据库

1. 新增 `create_projects` migration。
2. 执行 `supabase db push --dry-run` 检查变更。
3. 推送 migration 后，在 Supabase Table Editor 或 SQL 中验证表、约束、索引和 RLS。
4. 重新生成 `packages/database/src/database.types.ts`，并让 Supabase Client 使用 `Database` 泛型。若这一项暂缓，业务查询会缺少 schema 静态检查，应登记为技术债。

### 阶段 B：API

1. 在 `@wex/contracts` 增加请求/响应类型。
2. 新建 `apps/api/src/projects/` 模块、Controller 和 Service。
3. 在 `AppModule` 注册 `ProjectsModule`。
4. 实现输入校验、Supabase insert/select/delete、字段映射和异常处理。
5. 列表按创建时间倒序；删除必须区分无效 ID、记录不存在和数据库失败。

NestJS 当前没有安装 `class-validator`/`class-transformer`，也没有全局 `ValidationPipe`。第一版可以在 Service 中做小范围显式校验；如果紧接着会增加更多写接口，则应统一引入 DTO validation 和全局 pipe，避免各接口重复手写。

### 阶段 C：Web

1. 新增集中式 Project API 调用。
2. 替换 `workspace-page.tsx` 中的定时器和浏览器 UUID。
3. 增加失败提示与重试状态。
4. 创建成功后用服务端 ID 跳转。
5. 工作台进入时加载项目，并实现 loading、error、empty 和 populated 四种视图。
6. 项目项支持进入项目页，并提供独立删除按钮与二次确认弹窗。
7. 删除成功后更新本地列表；删除失败时保留弹窗以便重试。

### 阶段 D：验证

1. 执行 `pnpm typecheck` 和 `pnpm build`。
2. 请求 `GET /api/health/database`，确认基础连接正常。
3. 使用 `curl` 调用两次 `POST /api/projects`，确认生成两个不同 ID 和两条记录。
4. 从工作台点击创建，确认 loading、单次插入和正确跳转。
5. 临时断开 API 或使用错误配置，确认页面显示失败提示、按钮恢复可点击、没有跳转。
6. 请求 `GET /api/projects`，确认顺序、空数组语义和字段映射正确。
7. 对无效 UUID 和不存在的 UUID 调用 DELETE，分别确认返回 `400` 和 `404`。
8. 在工作台取消删除，确认没有请求；确认删除后，确认数据库记录和列表项同时消失。

## 8. 验收标准

- 点击任一创建按钮只产生一条 `projects` 记录。
- 项目 ID 由数据库生成，URL ID 与数据库记录 ID 完全一致。
- 请求未结束时两个创建按钮都不可重复触发。
- Supabase 写入失败时不跳转，用户可以看到错误并重试。
- `SUPABASE_SECRET_KEY` 不出现在 Web bundle、浏览器请求或前端环境变量中。
- `projects` 表启用 RLS，且没有对浏览器匿名角色开放直接写权限。
- API 返回对象符合 `@wex/contracts` 中的共享类型。
- 工作台只在列表请求成功且结果为空时展示空状态；有项目时按创建时间倒序展示。
- 项目项可以进入与其 ID 对应的项目页，删除按钮不会触发项目跳转。
- 删除操作必须二次确认；取消不发送请求，确认期间不能重复提交或关闭弹窗。
- 删除成功后记录与列表项消失；失败时保留项目并显示可重试错误。
- typecheck 和 build 通过。

## 9. 后续功能衔接

创建能力完成后，建议按下面顺序继续：

1. `GET /api/projects/:id`：进入项目页时验证记录存在，非法 ID 返回 404，而不是渲染一个空工作区。
2. Supabase Auth：把 `owner_id` 改为必填，通过 API Guard 绑定当前用户，并补充用户级 RLS policy。
3. 重命名、归档和软删除/回收站能力。
4. 创建 Project 后按需初始化 Sandbox Workspace。数据库 Project 创建与耗时的 Sandbox 初始化应保持两个可观测状态，不要放进一个无法恢复的长事务。

## 10. 关键决策摘要

| 决策        | 选择                   | 原因                                             |
| ----------- | ---------------------- | ------------------------------------------------ |
| 写入路径    | Web -> API -> Supabase | 复用现有服务端 Client，避免泄露高权限 key        |
| ID 生成位置 | PostgreSQL/Supabase    | 数据库为记录事实来源，前端只消费返回值           |
| 表创建方式  | versioned migration    | 可审查、可复现、可在不同环境一致部署             |
| RLS         | 创建表时立即启用       | 防止未来误用 anon key 直接暴露数据               |
| 当前 owner  | 暂为 null              | 仓库尚无认证能力；仅限本地/单用户 MVP            |
| 模块边界    | 独立 ProjectsModule    | 符合现有 NestJS 架构规划，便于后续列表和权限扩展 |
| 列表排序    | created_at 降序        | 新创建项目优先，符合工作台最近使用预期           |
| 删除语义    | 二次确认后硬删除       | 满足当前明确删除需求；未来回收站需升级数据模型   |
