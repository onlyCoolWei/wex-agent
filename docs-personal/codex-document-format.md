# Codex 优先的模块文档格式

> 状态：讨论草案，尚未成为仓库正式规范。
>
> 本文定义业务、设计和技术模块文档应如何为 Coding Agent 提供精确、紧凑、可执行的上下文。目录总方案见 [`document-system-proposal.md`](document-system-proposal.md)。

## 1. 文档目标

模块文档不是宣传材料、开发教程或会议纪要。它的目标是让 Codex 在修改代码前快速确定：

- 当前系统具有什么行为。
- 哪些规则和边界不能被破坏。
- 修改可能影响哪些模块、状态和数据。
- UI 应该呈现成什么样。
- 现有技术链路如何实现该功能。
- 应该从哪些代码入口开始检查。

文档仍需保持人类可维护，但不为完整叙事牺牲检索效率。删除与编码判断无关的产品宣传、教学背景、讨论过程和重复源码。

## 2. 共同约束

### 2.1 统一头部

三类模块文档使用相同的元信息：

```markdown
# <Module Name>

Status: Current
Last verified: YYYY-MM-DD
Read when: <哪些任务需要阅读本文>
Applies to: <覆盖的业务或代码范围>

## Related

- Business: `docs/business/<module>.md`
- Design: `docs/design/<module>.md`
- Technical: `docs/technical/<module>.md`
- Architecture: `ARCHITECTURE.md`
- Design system: `DESIGN.md`
- ADR: `docs/adr/...`
```

字段规则：

- `Status` 表示文档自身状态，而不是功能规划状态。正式模块文档通常为 `Current`；被新文档取代时为 `Deprecated`。
- `Last verified` 表示最后一次与代码、设计和关联文档核对的日期。
- `Read when` 使用任务关键词描述加载条件，帮助 Codex 控制上下文。
- `Applies to` 明确覆盖边界，避免把局部规则扩散到其他模块。
- `Related` 只链接实际存在且相关的事实来源，不创建空文档占位。

同一业务模块的 Business、Design 和 Technical 主文档使用相同英文文件名。页面、弹窗等组合视图按其界面范围命名，可以关联多个业务模块；Supabase、模型网关等横切技术专题按实际技术范围命名。只有形成独立用户目标、权威数据和生命周期的概念才建立业务模块，不能为了文件名对称制造空文档。

当前不要求 `Owner`。在没有稳定负责人的情况下，该字段容易过期并制造错误归属。

### 2.2 当前事实原则

正式模块文档描述当前已经确认的事实，不维护开放式的未来功能清单。

业务文档尤其遵守：

- 只写当前已经存在并需要保持的功能。
- 只写已经明确确认的规则、权限、状态和边界。
- 不写“可能实现什么”“未来还可以做什么”或凭推测列出的缺失功能。
- 不为尚未提出或尚未确认的功能建立“未实现”“暂不支持”清单。
- 某个不存在的能力只有在它构成当前规则的必要边界时才提及，例如“当前回复只接受文本输入”。这描述的是现有输入约束，而不是未来功能列表。

已经批准但尚未交付的需求，应放在明确的需求、计划或 ADR 中；完成后再合入当前业务文档。技术文档可以记录会直接影响当前维护判断的已知实现缺口，但必须基于代码事实，不能扩展成产品路线图。

### 2.3 写作方式

- 使用短段落、列表、表格和小型文本流程图。
- 一条规则只表达一个约束。
- 使用“必须、不得、可以”，避免“尽量、注意、保持优雅”。
- 当前事实、已批准变更和历史决策不得混写。
- 链接权威来源，不复制完整 DTO、Schema、组件源码或第三方文档。
- 代码位置优先指向稳定模块；只有关键入口才精确到文件。
- 模块文档建议控制在 80-180 行；超过约 200 行时优先拆分子领域。
- 文档与代码冲突时，Codex 必须指出冲突，不能自行假设某一方正确。

## 3. 业务模块文档

业务文档回答：**当前什么行为才是正确的，以及一次修改会影响什么。**

### 3.1 必须包含

- 模块目的和用户结果。
- 当前功能清单。
- 核心对象及其权威状态来源。
- 适用条件、业务规则和不变量。
- 当前功能的主流程。
- 失败、重复操作、权限和数据冲突等边界场景。
- 与其他模块的影响关系。
- 验收标准。
- 设计、技术文档和代码入口。

### 3.2 不应包含

- 未提出、未确认或推测中的未来功能。
- “未实现功能大全”或产品愿望清单。
- 页面像素、颜色和组件布局。
- 框架、数据库语法和逐文件实施步骤。
- 从代码接口直接复制的大段类型定义。

### 3.3 模板

```markdown
# Project

Status: Current
Last verified: YYYY-MM-DD
Read when: 修改工作台、Project 生命周期、权限或删除行为
Applies to: Project 及其下级 Conversation、Run 和网站产物

## Related

- Design: `docs/design/projects.md`
- Technical: `docs/technical/projects.md`
- Architecture: `ARCHITECTURE.md`

## Purpose

- 用户围绕一个网站目标持续创作。
- Project 是对话、运行记录和网站产物的所有权根。

## Capabilities

- 创建 Project。
- 查看 Project 列表。
- 打开 Project。
- 永久删除 Project。

## Entities

| Entity       | Meaning              | Authority  |
| ------------ | -------------------- | ---------- |
| Project      | 顶层创作对象         | PostgreSQL |
| Conversation | Project 内的对话容器 | PostgreSQL |

## Rules

- Project ID 必须由服务端生成。
- 用户只能操作自己拥有的 Project。
- 删除必须由用户明确触发并经过确认。

## Invariants

- 创建成功前不能进入伪造的 Project 路由。
- 删除成功前不能从本地列表移除 Project。
- 下级数据必须沿 Project 校验所有权。

## Flows

### Create

1. 用户触发创建。
2. 服务端创建 Project。
3. Web 使用服务端返回的 ID 导航。

### Delete

1. 展示 Project 名称和删除影响。
2. 用户确认。
3. 服务端删除成功后更新列表。

## Edge Cases

| Case           | Expected behavior      |
| -------------- | ---------------------- |
| 重复创建点击   | 只能发起一次有效请求   |
| Project 不存在 | 返回稳定的 Not Found   |
| 删除失败       | 保留列表数据并允许重试 |
| 非所有者访问   | 拒绝且不泄露数据       |

## Impact Map

| Behavior      | Code                                    |
| ------------- | --------------------------------------- |
| 创建和列表 UI | `apps/web/src/pages/workspace-page.tsx` |
| Project API   | `apps/api/src/projects/`                |
| 跨应用契约    | `packages/contracts/`                   |
| 数据结构      | `supabase/migrations/`                  |

## Acceptance

- [ ] 创建成功只使用服务端返回的 ID 导航
- [ ] 重复点击不会创建多个意外 Project
- [ ] 删除失败不会产生错误的本地状态
- [ ] 用户不能访问其他用户的 Project
```

`Capabilities` 只列当前明确存在的功能。新增功能完成后更新该列表；删除功能时同步移除或修改对应规则、流程和验收标准。

## 4. 设计模块文档

设计文档回答：**当前模块应该怎样被用户看到和操作。**

模块设计文档必须遵守根目录 `DESIGN.md`，只记录模块特有的结构、交互和例外。

### 4.1 必须包含

- 用户在该界面的目标。
- 页面或组件覆盖范围。
- 信息层级和稳定布局区域。
- 主操作、次要操作和反馈方式。
- loading、empty、error、disabled 等实际状态。
- 响应式和移动端行为。
- 键盘、焦点、标签和颜色之外的可访问反馈。
- 禁止出现的误导性表现。
- 视觉验收标准和代码入口。

### 4.2 不应包含

- `DESIGN.md` 已经定义的全局字体、颜色、间距和组件规则副本。
- 尚未确认的业务操作。
- API、数据库或 Worker 实现细节。
- 只有装饰价值、无法指导实现的形容词堆叠。

### 4.3 模板

```markdown
# Project Workspace Design

Status: Current
Last verified: YYYY-MM-DD
Read when: 修改 Project 页面、Chat、Preview 或响应式布局
Applies to: `/projects/:projectId`

## Related

- Business: `docs/business/projects.md`
- Technical: `docs/technical/projects.md`
- Design system: `DESIGN.md`

## Design Contract

- 必须遵守根目录 `DESIGN.md`。
- 本文只定义 Project 工作区特有设计。
- 设计不得自行增加业务功能。

## User Goal

- 一边描述需求，一边查看网站产物。
- 在 Chat 和 Preview 间保持连续上下文。

## Layout

| Viewport | Layout                    |
| -------- | ------------------------- |
| Desktop  | Chat 与 Preview 双栏      |
| Mobile   | Chat / Preview 单面板切换 |

## Regions

| Region       | Responsibility       | Stable size     |
| ------------ | -------------------- | --------------- |
| Chat header  | 返回、标题和运行状态 | 52px            |
| Message list | 历史与流式回复       | Flexible        |
| Composer     | 输入与发送           | 56-120px        |
| Preview      | 网站运行结果         | Remaining width |

## States

| Area    | State   | Required UI        |
| ------- | ------- | ------------------ |
| Chat    | loading | 固定区域加载状态   |
| Chat    | empty   | 简短提示和建议操作 |
| Chat    | failed  | 错误说明和恢复操作 |
| Preview | idle    | 等待真实生成       |
| Preview | ready   | 展示真实运行结果   |
| Preview | failed  | 错误和有效重试操作 |

## Interactions

- `Enter` 发送，`Shift + Enter` 换行。
- active Run 存在时禁用重复发送。
- 调整 Chat 宽度不得压缩到 320px 以下。
- 移动端切换面板不得丢失输入和连接状态。

## Responsive

- `< 768px` 使用单面板切换。
- `>= 768px` 使用双栏。
- 输入区必须处理底部安全区。
- 页面不得产生横向滚动。

## Accessibility

- 图标按钮必须有可访问名称和 tooltip。
- 面板分隔条必须支持键盘操作。
- 错误和加载状态不能只依赖颜色表达。

## Prohibited

- 不把静态示例描述成用户生成的网站。
- 不展示没有实际功能的操作按钮。
- 不通过隐藏错误制造成功状态。
- 不偏离 `DESIGN.md`，除非本文记录了明确例外及原因。

## Code Map

- Page: `apps/web/src/pages/project/project-page.tsx`
- Chat: `apps/web/src/pages/project/chat-panel.tsx`
- Preview: `apps/web/src/pages/project/preview-panel.tsx`

## Visual Acceptance

- [ ] 桌面和移动端可以完成相同核心任务
- [ ] loading、empty、error、disabled 状态完整
- [ ] 动态内容不会造成布局跳动或重叠
- [ ] 页面符合根目录 `DESIGN.md`
```

## 5. 技术模块文档

技术文档回答：**当前模块如何接入整体架构，以及修改时不能破坏什么。**

模块技术文档必须遵守根目录 `ARCHITECTURE.md`，并与实际代码、契约和 migration 一致。

### 5.1 必须包含

- 继承的整体架构约束。
- 当前实现链路。
- 模块职责和禁止承担的职责。
- 数据、API 和事件的稳定语义。
- 关键状态迁移和一致性规则。
- 失败、并发、重试和幂等处理。
- 权限、密钥和敏感信息边界。
- 经过代码确认的已知实现缺口。
- 变更影响映射。
- 聚焦验证命令和测试入口。

### 5.2 不应包含

- 与当前模块无关的总体架构重复内容。
- 未批准的产品功能路线图。
- 完整复制的 TypeScript 接口、SQL Schema 或第三方文档。
- 已经失效但没有状态说明的历史方案。
- 将目标架构描述成当前实现。

### 5.3 模板

````markdown
# Project Technical Implementation

Status: Current
Last verified: YYYY-MM-DD
Read when: 修改 Project API、数据库、契约或持久化
Applies to: Web、API、Contracts、PostgreSQL

## Related

- Business: `docs/business/projects.md`
- Design: `docs/design/projects.md`
- Architecture: `ARCHITECTURE.md`

## Architecture Contract

- 必须遵守根目录 `ARCHITECTURE.md`。
- Web 不直接访问数据库。
- API 负责鉴权、校验和业务编排。
- 跨应用类型来自 `@wex/contracts`。

## Current Implementation

```text
WorkspacePage
  -> Project API Client
  -> NestJS ProjectsController
  -> ProjectsService
  -> Supabase PostgreSQL
```

## Boundaries

| Module    | Responsibility | Must not            |
| --------- | -------------- | ------------------- |
| Web       | 展示和用户操作 | 复制服务端业务规则  |
| API       | 校验和编排     | 接受客户端 owner ID |
| Contracts | 公共请求响应   | 引用应用内部类型    |
| Database  | 持久化结构     | 包含页面状态        |

## Data

| Field      | Type | Rule                    |
| ---------- | ---- | ----------------------- |
| `id`       | UUID | 服务端生成              |
| `owner_id` | UUID | 来自已验证身份          |
| `name`     | text | 1-100 字符              |
| `status`   | text | 当前允许的 Project 状态 |

## Contracts

| Operation | Input              | Output    | Errors              |
| --------- | ------------------ | --------- | ------------------- |
| Create    | optional name      | Project   | validation/database |
| List      | authenticated user | Project[] | database            |
| Delete    | projectId          | 204       | invalid/not found   |

这里只记录稳定语义，完整类型以 `packages/contracts` 为准。

## Flow

### Delete

```text
DELETE /projects/:id
  -> validate UUID
  -> verify owner
  -> delete Project
  -> database cascades dependent data
  -> return 204
```

## Consistency

- Project 及其下级数据位于同一所有权边界。
- 数据库成功前 Web 不删除本地 Project。
- Contract 变化必须同步所有生产者和消费者。
- Schema 变化必须通过 migration 完成。

## Failure Handling

| Failure          | Behavior                 |
| ---------------- | ------------------------ |
| Invalid UUID     | 400                      |
| Not found        | 404                      |
| Not owner        | 遵守仓库统一资源权限策略 |
| Database failure | 稳定、非敏感的 5xx       |

## Security

- `owner_id` 从认证上下文派生。
- Secret Key 只存在于服务端。
- 查询和删除同时约束资源 ID 与所有权。
- 日志不得包含 Token 或数据库凭据。

## Known Implementation Gaps

- 只记录已经通过代码确认、会影响当前修改判断的实现缺口。
- 不在这里扩展产品功能愿望或路线图。

## Change Map

| Change          | Also inspect                                   |
| --------------- | ---------------------------------------------- |
| Project field   | migration、database types、contracts、API、Web |
| Delete behavior | Conversation、Run、Sandbox、Storage            |
| Ownership       | Auth Guard、所有下级查询、RLS                  |

## Verification

```bash
pnpm --filter @wex/api typecheck
pnpm --filter @wex/web typecheck
pnpm typecheck
pnpm build
```
````

## 6. 三类文档的事实所有权

| 文档      | 唯一负责的事实                         | 不得自行决定                 |
| --------- | -------------------------------------- | ---------------------------- |
| Business  | 当前功能、业务规则、权限、不变量和验收 | 页面视觉、技术选型、未来功能 |
| Design    | 当前页面结构、交互、反馈和响应式表现   | 新业务能力、数据和架构规则   |
| Technical | 当前实现、系统边界、契约、一致性和验证 | 产品范围和未经确认的业务行为 |

当三类文档产生冲突时：

1. 停止扩大代码修改。
2. 确认冲突属于文档过期、实现缺陷还是需求尚未确认。
3. 先修正负责该事实的权威文档。
4. 再同步其他引用文档、代码和测试。

## 7. 控制上下文体积

Codex 不应因为文档存在就全部加载。推荐读取顺序：

```text
识别任务模块
  -> 读取 Business 模块文档
  -> 涉及 UI 时读取 DESIGN.md + Design 模块文档
  -> 涉及实现时读取对应 Technical 模块文档
  -> 跨模块、契约、数据库或基础设施时再读取 ARCHITECTURE.md
  -> 检查相关代码和测试
```

文档头部的 `Read when` 和 `Applies to` 用于帮助 Codex 跳过无关内容。模块文档不应为了“完整”重复全局文档，从而强迫每次任务加载相同背景。

## 8. 审查清单

新增或修改正式模块文档时检查：

- [ ] 文档只描述其负责的事实类型。
- [ ] 业务文档没有推测未来或维护未实现功能清单。
- [ ] 设计文档遵守 `DESIGN.md`，没有自行增加功能。
- [ ] 技术文档遵守 `ARCHITECTURE.md`，并区分当前实现与已批准方案。
- [ ] Rules、Invariants 和 Edge Cases 可以直接指导编码判断。
- [ ] Impact Map 或 Change Map 能帮助定位受影响代码。
- [ ] Related 只指向真实存在且必要的文档。
- [ ] 没有复制可以从代码或权威文档直接取得的大段内容。
- [ ] `Last verified` 与实际核对时间一致。
- [ ] 文档长度适合按任务加载，过长内容已按子领域拆分。
