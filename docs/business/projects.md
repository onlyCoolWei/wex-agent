# Projects 项目业务规则

Status: Current
Last verified: 2026-08-26
Read when: 修改 Project 创建、列表、打开、删除、归档或所有权行为
Applies to: Workbench 中的 Project 生命周期和下级数据所有权

## Related

- Design: `docs/design/projects.md`
- Technical: `docs/technical/projects.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

Project 是 Wex 中承载一个网站目标及其长期创作上下文的顶层对象。页面交互见 [`../design/projects.md`](../design/projects.md)，技术实现与 API 细节见 [`../technical/projects.md`](../technical/projects.md)。

## 1. 业务目标

- 用户在工作台快速创建或打开一个 Project。
- Project 聚合其 Conversation、Message、Run，以及未来的 Sandbox Workspace 和网站产物。
- 删除 Project 时，用户明确理解其影响并进行二次确认。
- 多用户场景下，Project 及其所有下级数据只能由所有者访问。

## 2. 当前对象模型

| 字段         | 含义             | 当前规则                                                    |
| ------------ | ---------------- | ----------------------------------------------------------- |
| `id`         | Project 稳定标识 | 服务端生成 UUID，路由使用该值                               |
| `owner_id`   | 所有者           | 字段已存在但当前可以为空，服务端尚未闭环                    |
| `name`       | 用户可识别名称   | 省略时为“未命名项目”；显式输入为去除首尾空格后的 1-100 字符 |
| `status`     | 生命周期状态     | 数据支持 `active` / `archived`，产品当前只操作 active       |
| `created_at` | 创建时间         | 服务端生成，用于工作台倒序展示                              |
| `updated_at` | 最近更新时间     | 已存在；对话更新当前不会同步更新 Project 时间               |

## 3. 当前能力

### 已实现

- 工作台加载 Project 列表，并按创建时间从新到旧展示。
- 空列表展示创建第一个 Project 的操作。
- 创建时可省略名称，成功后直接进入 Project 工作区。
- Project 卡片可以打开对应 `/projects/:projectId`。
- 删除需要二次确认，成功后从列表移除。
- 删除是数据库物理删除，并级联删除 Conversation、Message、Run 和 Event。

### 已定义未闭环

- Project 应属于当前用户，但 API 当前未写入和校验真实 `owner_id`。
- Project 页面当前不先查询 Project 详情；一个格式正确但不存在的 ID 最终通过 Conversation 加载错误体现。
- `updated_at` 尚未代表真实的最近创作时间。

### 暂不支持

- 重命名、描述、封面和 Project 设置。
- 归档、恢复、搜索、排序筛选和批量操作。
- 团队共享、成员权限、转移所有权。
- 软删除、回收站和删除恢复。
- Project 复制、模板创建和导入导出。

## 4. 核心流程

### 创建

1. 用户在工作台触发创建。
2. 创建期间禁用重复操作并显示进度。
3. API 校验可选名称并插入 Project。
4. 成功后使用服务端返回的 `id` 进入 Project 工作区。
5. 失败时留在工作台，恢复按钮并显示可操作错误。

### 打开

1. 用户点击 Project 卡片。
2. 页面进入 `/projects/:projectId`。
3. Chat 面板取得该 Project 最近活跃的 Conversation；不存在时创建一个。
4. Preview 保持当前占位状态，不能暗示已有真实网站产物。

### 删除

1. 用户在 Project 卡片触发删除。
2. 确认对话框展示 Project 名称和不可恢复提示。
3. 确认后只禁用目标 Project 的相关操作，避免重复请求。
4. API 返回成功后从列表移除；失败则保留 Project 和对话框上下文供重试。

## 5. 业务不变量

- Project 是 Conversation、Run 和未来产物的所有权根；下级对象的权限必须沿 Project 校验。
- Project ID 由服务端生成，客户端不得自行构造并作为已创建事实。
- 创建成功前不能进入伪造的 Project 路由。
- 删除必须是显式用户命令并经过二次确认，不能由页面离开或生成失败触发。
- 物理删除成功后，其下级对话和运行历史不可恢复；改变此规则需要新的数据保留方案和用户文案。
- `archived` 只是预留数据状态，在归档业务完整定义前不能随意写入或展示为可用功能。
- 多用户上线前，任何 Project 查询和变更必须同时约束 `id` 与已验证的 `owner_id`。

## 6. 修改影响检查

- Project 字段是否同步到 migration、数据库类型、Contracts、API 映射和 Web 展示。
- 删除语义是否影响级联数据、正在执行的 Run、Sandbox 或对象存储产物。
- Project 状态变化是否同步定义允许操作和 UI 状态。
- 工作台加载、空状态、创建中、删除中和错误恢复是否稳定。
- 修改 Project 所有权时，Conversation 等下级查询是否随之收紧。

## 7. 验收基线

- 工作台能准确展示服务端 Project；没有数据时显示明确空状态。
- 连续点击创建不会产生多个意外 Project。
- 创建成功只使用服务端返回 ID 导航；失败不离开工作台。
- 删除前显示目标名称与影响，取消不会改变数据。
- 删除失败保留列表数据并允许重试，成功后相关下级数据不再可访问。
- 完成授权闭环后，用户无法通过猜测 UUID 访问其他用户的 Project。

## 8. 实现定位

- 契约：`packages/contracts/src/index.ts`
- 数据表：`supabase/migrations/20260815010000_create_projects.sql`
- API：`apps/api/src/projects/`
- Web 请求：`apps/web/src/lib/api.ts`
- 工作台：`apps/web/src/pages/workspace-page.tsx`
- 删除确认：`apps/web/src/components/delete-project-dialog.tsx`
