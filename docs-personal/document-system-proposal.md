# Wex 文档体系讨论草案

> 状态：核心文档体系和当前模块边界已确认并落地，其余演进建议继续讨论。
>
> 本文位于个人知识库中，用于记录文档体系的讨论与演进理由。正式规则以 `AGENTS.md` 和 `docs/README.md` 为准，不应直接把本文当作项目规范。

## 1. 目标

建立一套能同时帮助人类开发者和 Coding Agent 理解项目的文档体系，使修改代码前可以快速回答：

- 产品当前有哪些模块和功能？
- 一次修改可能影响哪些业务行为？
- 对应页面应该遵守什么设计和交互规范？
- 当前功能在技术上如何实现？
- 哪些内容是现状，哪些只是未来规划？

核心思路是将产品知识分成三个互相引用的视角：业务、设计和技术；协作规则、ADR、开发日记和个人知识库作为独立的仓库治理资料存在。

## 2. 已确认的原则

以下原则已经达成共识，后续讨论以此为基础：

1. 正式的业务、设计和模块技术文档集中放在 `docs/`，不分散复制到代码目录。
2. 代码目录只在职责复杂、容易误判时增加简短 README，作为正式文档的路标，而不是第二份事实来源。
3. 根目录 `ARCHITECTURE.md` 是全仓库唯一的整体架构事实来源，约束所有模块技术文档。
4. 根目录 `DESIGN.md` 是全仓库唯一的设计语言事实来源，约束所有模块设计文档。
5. `docs/design/` 作为正式的设计文档目录，统一承载模块级页面设计和交互规范。
6. 覆盖同一领域边界的业务、设计和技术主文档使用相同英文模块名和文件名，通过双向链接形成闭环；组合页面和横切技术专题按实际范围命名。
7. 不在根目录和 `docs/` 中同时保留另一份整体架构或全局设计文档。
8. 业务文档只描述当前已确认功能和规则，不维护未实现、可能实现或暂不支持的开放功能清单。
9. 文档正文默认使用中文，以降低人类开发者的阅读成本；代码标识、路径、命令、API、数据库对象和第三方产品名保持原文。
10. `AGENTS.md`、`README.md`、`CONTRIBUTING.md`、`ARCHITECTURE.md`、`DESIGN.md` 和 `docs/` 下的文档都可以使用中文正文，不因语言不同而降低其规范效力。
11. 模块文档默认按紧密相关的业务能力合并，不要求每个模块都分别拥有业务、设计和技术文档，也不创建空文档补齐三份结构；当子模块形成独立边界后再拆分。

三类模块文档的具体格式和模板见 [`codex-document-format.md`](codex-document-format.md)。

## 3. 建议目录

```text
/
├── README.md                    # 项目介绍、启动和验证入口
├── AGENTS.md                    # Codex 必须执行的硬规则
├── CONTRIBUTING.md              # 人类开发者和 Agent 的快速协作入口
├── ARCHITECTURE.md              # 全局技术架构与系统边界
├── DESIGN.md                    # 全局设计语言与交互原则
├── docs-personal/               # 个人知识库（含 diary.md），默认不进入 Codex 上下文
│
└── docs/
    ├── README.md                # 文档分类与任务路由
    │
    ├── business/               # 系统要做什么
    │   ├── README.md            # 产品概览、模块地图、核心用户链路
    │   ├── glossary.md          # 统一术语
    │   ├── identity-and-access.md # 身份、Session 与访问边界
    │   ├── projects.md          # Project 模块
    │   └── conversations-and-agent-runs.md # 当前阶段的对话执行链路
    │
    ├── design/                 # 模块页面与交互如何呈现
    │   ├── README.md            # 设计文档导航及 DESIGN.md 入口
    │   ├── identity-and-access.md # 身份与访问模块设计
    │   ├── projects.md          # Project 管理模块设计
    │   └── project-workspace.md # 组合 Projects、Chat 与 Preview 的页面
    │
    ├── technical/              # 各模块如何实现
    │   ├── README.md            # 技术文档导航及 ARCHITECTURE.md 入口
    │   ├── identity-and-access.md # Session、路由保护与 API 授权边界
    │   ├── projects.md          # Project 数据库与 API
    │   ├── conversations-and-agent-runs.md # Message、Run、SSE 与 Worker
    │   ├── supabase.md          # 基础设施专题
    │   ├── model-gateway.md     # Agents SDK 与 LiteLLM 专题
    │   └── architecture-roadmap.md # 跨阶段技术路线专题
    │
    ├── adr/                    # 长期架构决策和取舍
    └── collaboration-guide.md  # 详细协作治理规范
```

## 4. 集中式正式知识与代码目录路标

正式文档集中放在 `docs/`，因为一个业务模块通常跨越多个代码目录。例如 Project 可能同时涉及：

```text
apps/web/src/pages/project/
apps/api/src/projects/
apps/api/src/chat/
apps/worker/src/chat-runs/
packages/contracts/
packages/database/
supabase/migrations/
```

如果把完整 Project 文档放在某一个前端目录，Codex 容易误判模块所有权并忽略其他消费者。集中式文档能提供跨应用的完整视角，并避免多个副本逐渐冲突。

代码目录可以在以下情况增加短 README：

- 目录职责容易被名称误解。
- 存在该目录独有的实现约束。
- 目录经常被不同开发者或 Agent 修改。
- 需要快速指向跨目录的业务、设计和技术文档。

局部 README 只作为路标，例如：

```markdown
# Project Page

- 业务：`docs/business/projects.md`
- 设计：`docs/design/project-workspace.md`
- 技术：`docs/technical/projects.md`

本目录负责 Project 页面布局和 Chat / Preview 交互，不定义 Project 权限、持久化和 Agent Run 规则。
```

局部 README 不复制正式规则，也不自动要求每个代码目录都创建一份。

## 5. 三类产品文档

三类产品文档的职责保持稳定：

| 文档      | 回答的问题               | 事实范围                            |
| --------- | ------------------------ | ----------------------------------- |
| Business  | 系统当前应该做什么？     | 功能、规则、权限、不变量和验收      |
| Design    | 用户应该看到和操作什么？ | 页面结构、交互、状态和响应式表现    |
| Technical | 系统当前如何实现？       | 数据、API、事件、边界、一致性和验证 |

根目录 `DESIGN.md` 约束所有模块设计文档；根目录 `ARCHITECTURE.md` 约束所有模块技术文档。业务、设计和技术模块文档的具体字段、章节、模板、写作限制和审查清单统一放在 [`codex-document-format.md`](codex-document-format.md)，本文不重复维护。

三类文档必须保持事实所有权：设计文档不能自行增加业务能力，技术文档不能自行改变产品规则，业务文档不描述页面像素或框架实现。

## 6. 模块名称与边界对齐

模块先按独立用户目标和业务生命周期划分，再用权威数据、状态不变量和修改隔离度校验。页面、代码目录、数据库表、SDK 和基础设施不会因为单独存在就自动成为业务模块。

判断一个概念是否值得成为独立模块时，依次检查：

1. 是否有独立的用户目标和验收标准。
2. 是否拥有自己的权威数据、聚合根或资源授权规则。
3. 是否拥有独立生命周期、状态转换和不变量。
4. 修改它时，是否通常不需要理解另一个模块的内部规则。
5. 它是否是领域概念，而不是页面、代码目录或技术选型。

前三项大多成立时，才建立新的业务模块。同一模块存在多个文档视角时，主文档必须使用相同文件名：

| 模块                         | 业务文档                                   | 设计文档                        | 技术文档                                    |
| ---------------------------- | ------------------------------------------ | ------------------------------- | ------------------------------------------- |
| Identity and Access          | `business/identity-and-access.md`          | `design/identity-and-access.md` | `technical/identity-and-access.md`          |
| Projects                     | `business/projects.md`                     | `design/projects.md`            | `technical/projects.md`                     |
| Conversations and Agent Runs | `business/conversations-and-agent-runs.md` | 由 Project Workspace 组合呈现   | `technical/conversations-and-agent-runs.md` |

以下名称不属于模块主文档：

- `design/project-workspace.md` 是组合 Projects、Conversations、Agent Runs 和 Preview 占位的页面文档，可以引用多个业务模块。
- `technical/supabase.md`、`technical/model-gateway.md` 和 `technical/architecture-roadmap.md` 是横切技术专题，按真实技术范围命名。
- Preview 当前没有真实产物、权威数据和独立生命周期，不建立业务主文档；接入真实能力并形成边界后，再决定是否建立 `previews.md`。
- Sandbox 是隔离执行的技术能力边界，不直接等同于用户可见业务模块。

某个视角没有独立规则时可以不创建对应文件，不以几行内容的空文档补齐三份结构。

### 6.1 文档语言与命名规则

模块名采用代码中的英文领域名，避免业务文档、代码目录、API 和数据库对象之间产生额外映射。例如统一使用 `Projects`、`Conversation` 和 `Agent Run`，而不是在不同文档中分别使用“项目”“对话”和其他译名作为模块标识。

文档正文使用中文没有问题。Codex 的修改质量主要取决于规则是否明确、事实是否准确、边界是否完整以及链接是否指向权威来源，而不是正文使用中文还是英文。为了保留稳定的机器检索和代码映射，以下内容保持原文：

- 文件名、目录名和模块标识：`business/projects.md`、`Projects`。
- 代码符号、API 路径、数据库表名、事件名、环境变量和命令。
- 第三方产品名、框架名、协议名和标准缩写，例如 `Supabase`、`SSE`、`REST`。
- 模块文档元信息的字段名，例如 `Status`、`Last verified`、`Read when`、`Applies to` 和 `Related`。

字段值、规则、流程、验收标准和解释使用中文。必要时在首次出现时使用“英文规范名 + 中文解释”，并将稳定术语收录到 `docs/business/glossary.md`。

### 6.2 文档合并与拆分策略

文档拆分跟随业务边界和上下文需求，不按页面区域、数据库表或代码目录机械拆分。初期功能较少且关系紧密的模块可以合并描述，避免创建只有几行内容的文档；随着功能增长，再将形成独立边界的子模块拆出。

合并或拆分时，优先检查以下信号：

- 子模块是否有独立的用户目标和验收标准。
- 是否拥有独立的生命周期、状态、权限或数据模型。
- 是否拥有独立的 API、事件、Worker 或基础设施边界。
- 修改其中一个模块时，是否经常不需要另一个模块的上下文。
- 文档是否已经超过约 150-200 行，导致检索和维护成本明显上升。

当前阶段的处理方式如下：

- `Conversation` 与 `Agent Run` 继续合并在 `conversations-and-agent-runs.md`，因为它们共同组成当前的持久化对话执行链路。
- `Project Workspace` 只作为设计组合视图，不建立同名业务模块；它链接 Projects 与 Conversations and Agent Runs。
- `Preview` 的占位呈现归入 Project Workspace 设计文档，因为当前还没有独立产物、数据、权限或运行生命周期。
- 不要求每个模块都分别创建业务、设计和技术三份文档。某个视角没有独立规则时，可以合并到相邻模块或不单独创建文件。

当子模块需要独立成文档时，原文档保留总览、边界和导航，新增文档承载详细规则；拆分过程中只建立链接，不复制大段正文。

## 7. 三个视角如何形成闭环

同一个功能从三个角度表达：

```text
业务文档
  定义用户结果、规则、权限、不变量和验收
      |
      v
设计文档
  定义页面结构、交互、反馈和响应式表现
      |
      v
技术文档
  定义数据、API、事件、实现边界和验证
      |
      v
代码与测试
  实现并验证上述规则
```

这不是严格的单向关系。技术限制可能影响设计，设计验证可能暴露业务歧义，因此三类文档需要相互链接，但必须保持事实所有权：

- 业务规则由业务文档负责。
- 全局视觉和交互规则由根目录 `DESIGN.md` 负责，模块特有表现由设计文档负责。
- 全局系统边界由根目录 `ARCHITECTURE.md` 负责，模块实现由技术文档负责。
- 一类文档引用另一类时，不复制大段内容，只引用并说明影响。

## 8. Codex 建议阅读链路

```text
AGENTS.md
  -> docs/README.md
  -> business/<module>.md
  -> DESIGN.md                [涉及 UI 或全局视觉规则时]
  -> design/<module>.md       [涉及 UI 时]
  -> ARCHITECTURE.md          [跨模块、契约、数据或基础设施变化时]
  -> technical/<module>.md    [涉及实现时]
  -> 相关代码和测试
```

纯模块内部修改不必每次完整重读两份全局长文。建议由 `AGENTS.md` 明确触发条件：

- 任何 UI 新页面、全局组件或视觉语言变化必须阅读 `DESIGN.md`。
- 跨模块、公共契约、数据库、认证、Worker 或基础设施变化必须阅读 `ARCHITECTURE.md`。
- 普通模块功能修改先读对应业务文档，再按影响范围选读模块设计或技术文档。

Codex 不应默认阅读：

- `docs-personal/`。
- 与当前任务无关的模块文档。
- `docs-personal/diary.md` 开发日记全文。
- 仅用于历史参考且已经 Deprecated 的方案。

### 8.1 业务文档读取触发条件

只有可能影响产品行为或业务规则的任务才强制读取对应业务模块文档：

- 新增、修改或删除用户功能。
- 修改权限、状态、数据规则、错误语义或验收标准。
- 修改可能影响用户行为的 API、数据库、事件或 Worker 链路。
- 修改页面流程、交互状态或用户可见的错误处理。
- 修复涉及业务逻辑的 Bug。

纯样式调整、测试、类型、构建配置、格式化、依赖维护和不改变外部行为的内部重构通常不强制读取业务文档。无法判断是否影响产品行为时，按需要读取处理。

### 8.2 上下文体积与目录级文档

采用渐进式加载，不一次性读取整个 `docs/`：

1. 先读取 `AGENTS.md` 和 `docs/README.md`。
2. 通过路由文档定位当前业务模块。
3. 普通单模块任务通常读取一篇业务文档，以及需要时的一篇设计或技术文档。
4. 跨模块任务才扩展读取多个模块文档和全局 `ARCHITECTURE.md` 或 `DESIGN.md`。
5. 模块文档使用 `Read when` 声明读取条件，建议控制在 80-180 行；超过约 200 行时优先拆分。

代码目录中的短 README 用于说明目录职责和正式文档入口。只有目录存在根规则之外的强制约束、特殊验证或安全边界时，才增加局部 `AGENTS.md`。局部规则只写增量内容，不复制根目录规则。

### 8.3 文档自动检查

文档质量分阶段自动检查：

- Markdown 相对链接必须指向存在的文件，移动文件后不得残留旧路径。
- `docs/` 只能包含约定的正式文档分类，`docs-personal/` 不得嵌套到 `docs/`。
- 业务模块入口、模块文档的 `Related` 链接和必要元信息必须保持一致。
- 后续通过 CI 执行链接检查、文档结构检查、模块索引检查和格式检查。

初期可以使用轻量 `scripts/check-docs.mjs` 检查本地链接、允许目录、模块索引和文档元信息，不为此引入复杂文档系统。

## 9. 仓库治理与全局文档

以下内容不强行归入业务、设计或技术三类：

| 文档                          | 职责                            |
| ----------------------------- | ------------------------------- |
| `AGENTS.md`                   | Coding Agent 必须执行的仓库规则 |
| `CONTRIBUTING.md`             | 快速开发和验证入口              |
| `ARCHITECTURE.md`             | 整体技术架构和全局实现约束      |
| `DESIGN.md`                   | 全局视觉语言和交互约束          |
| `docs/README.md`              | 文档分类和任务路由              |
| `docs/collaboration-guide.md` | 详细治理方法和模板              |
| `docs/adr/`                   | 长期技术决策及取舍              |
| `docs-personal/diary.md`      | 已交付结果记录                  |
| `docs-personal/`              | 默认隔离的个人知识库            |

准确描述应是“三个产品文档体系、两份根级全局事实来源，加一组仓库治理文档”。
