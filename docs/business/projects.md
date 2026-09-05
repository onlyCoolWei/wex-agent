# Projects

Status: Current
Last verified: 2026-08-26
Read when: 修改 Project 创建、列表、打开、删除、归档或所有权行为
Applies to: Workbench 中的 Project 生命周期和下级数据所有权

## Related

- Design: `docs/design/projects.md`
- Technical: `docs/technical/projects.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

- 用户在工作台创建或打开承载网站目标的 Project。
- Project 保存长期创作上下文，并作为下级业务对象的所有权根。
- 用户在明确理解影响后，可以永久删除 Project。

## Capabilities

- 按创建时间从新到旧查看 Project 列表。
- 在空工作台创建第一个 Project。
- 使用可选名称创建 Project，并在成功后进入 Project 工作区。
- 从 Project 卡片打开对应工作区。
- 经二次确认后永久删除 Project 及其下级对话数据。
- 创建 Project 时自动创建关联的 Sandbox Workspace。
- 永久删除 Project 时自动释放关联的 Sandbox Workspace。

## Entities

| Field        | Meaning              | Authority and rule                                                      |
| ------------ | -------------------- | ----------------------------------------------------------------------- |
| `id`         | Project 稳定标识     | PostgreSQL；服务端生成 UUID，路由使用该值                               |
| `owner_id`   | 所有者               | PostgreSQL；字段当前可以为空，服务端授权尚未闭环                        |
| `name`       | 用户可识别名称       | PostgreSQL；省略时为“未命名项目”，显式输入为去除首尾空格后的 1-100 字符 |
| `status`     | Project 生命周期状态 | PostgreSQL；数据支持 `active` / `archived`，产品当前只操作 `active`     |
| `created_at` | 创建时间             | PostgreSQL；服务端生成，用于工作台倒序展示                              |
| `updated_at` | 最近更新时间         | PostgreSQL；对话更新当前不会同步更新时间                                |

## Rules

- Project ID 必须由服务端生成。
- 创建成功后，Web 必须使用服务端返回的 Project ID 导航。
- Project 列表必须以服务端数据为准，并按 `created_at` 倒序展示。
- 删除必须由用户明确触发，并展示 Project 名称和不可恢复影响。
- 删除成功后才能从本地列表移除 Project。
- Project 及其所有下级对象只能由所有者访问。

## Invariants

- Project 是 Conversation、Message、Run 和网站产物的所有权根；下级权限必须沿 Project 校验。
- Project 是 Sandbox Workspace 的生命周期所有权根；Sandbox 失败时 Project 创建必须回滚。
- 创建成功前不得进入伪造的 Project 路由。
- 删除不得由页面离开或生成失败隐式触发。
- 物理删除成功后，Conversation、Message、Run 和 Event 不可恢复。
- `archived` 只是预留数据状态；归档规则完整定义前不得写入或展示为可用功能。
- 多用户上线前，Project 查询和变更必须同时约束 `id` 与已验证的 `owner_id`。

## Flows

### Create

1. 用户在工作台触发创建。
2. 创建期间禁用重复操作并显示进度。
3. API 校验可选名称并插入 Project。
4. Web 使用服务端返回的 `id` 进入 Project 工作区。
5. API 创建关联 Sandbox Workspace；失败时回滚 Project。
6. 失败时留在工作台，恢复操作并展示可执行错误。

### Open

1. 用户选择 Project 卡片。
2. Web 进入 `/projects/:projectId`。
3. Chat 取得该 Project 最近活跃的 Conversation；不存在时创建一个。
4. Preview 保持占位状态，不暗示已经存在网站产物。

### Delete

1. 用户从 Project 卡片触发删除。
2. 确认对话框展示 Project 名称和不可恢复影响。
3. 确认后只禁用目标 Project 的相关操作。
4. API 释放关联 Sandbox Workspace 后删除 Project 及下级数据。
5. 失败时保留 Project 和对话框上下文供重试。

## Boundaries

| Boundary     | Current fact                                                               |
| ------------ | -------------------------------------------------------------------------- |
| 所有权       | API 尚未写入或校验真实 `owner_id`                                          |
| Project 详情 | Project 页面不先查询详情；合法但不存在的 ID 通过 Conversation 加载错误体现 |
| 最近活动     | `updated_at` 尚不代表最近创作时间                                          |
| 生命周期     | 产品当前只操作 `active`，不提供归档和恢复                                  |
| 删除         | 当前只有不可恢复的物理删除，没有回收站                                     |
| 管理能力     | 当前不提供重命名、搜索、筛选、批量操作或团队共享                           |

## Edge Cases

| Case           | Expected behavior                         |
| -------------- | ----------------------------------------- |
| 空列表         | 展示明确空状态和创建入口                  |
| 重复创建点击   | 只能发起一次有效请求                      |
| 创建失败       | 留在工作台，恢复操作并展示错误            |
| Project 不存在 | 展示稳定的 Not Found 语义，不创建伪造状态 |
| 取消删除       | 不改变服务端和本地数据                    |
| 删除失败       | 保留 Project 与确认上下文，并允许重试     |
| 非所有者访问   | 拒绝且不泄露 Project 或下级数据           |

## Impact Map

| Change       | Also inspect                                                            |
| ------------ | ----------------------------------------------------------------------- |
| Project 字段 | migration、database types、Contracts、API 映射和 Web 展示               |
| 创建行为     | `apps/api/src/projects/`、`apps/web/src/lib/api.ts` 和工作台导航        |
| 删除行为     | 级联数据、active Run、数据保留方案、用户文案和外部产物                  |
| Project 状态 | 允许操作、列表查询、空状态和 `apps/web/src/pages/workspace-page.tsx`    |
| 所有权       | Project API、Conversation 等下级查询和 RLS                              |
| 删除确认交互 | `apps/web/src/components/delete-project-dialog.tsx`、禁用状态和错误恢复 |
| 数据结构     | `supabase/migrations/20260815010000_create_projects.sql`                |

## Acceptance

- [ ] 工作台准确展示服务端 Project；没有数据时展示明确空状态
- [ ] 连续点击创建不会产生多个意外 Project
- [ ] 创建成功只使用服务端返回的 ID 导航，失败时不离开工作台
- [ ] 删除前展示目标名称和影响，取消时不改变数据
- [ ] 删除失败保留列表数据并允许重试
- [ ] 删除成功后，相关下级数据不再可访问
- [ ] 服务端授权闭环后，用户不能通过猜测 UUID 访问其他用户的 Project
