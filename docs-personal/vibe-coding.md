你的目标不能只靠“多写文档”实现。文档负责提供上下文，`AGENTS.md` 负责约束 Agent 行为，自动化检查负责阻止低质量代码进入主分支。三层缺一不可。

我建议把仓库治理设计成下面这套结构。

## 一、建立三层防线

| 层级     | 解决的问题                   | 推荐手段                                       |
| -------- | ---------------------------- | ---------------------------------------------- |
| 上下文层 | 大家是否理解业务和架构       | 业务文档、架构文档、术语表、ADR                |
| 执行层   | Agent 修改代码时遵守什么规则 | 根目录和模块级 `AGENTS.md`                     |
| 门禁层   | 不遵守规则的代码能否合并     | lint、类型检查、测试、依赖检查、CI、CODEOWNERS |

最重要的原则是：

> 能自动检查的规则，不要只写在文档里。

例如“不要跨层导入”如果只写进 `AGENTS.md`，迟早会被破坏；应该同时通过 ESLint、dependency-cruiser、Nx module boundaries 或类似工具检查。

## 二、推荐的文档结构

```text
/
├── AGENTS.md
├── README.md
├── CONTRIBUTING.md
├── CODEOWNERS
├── docs/
│   ├── README.md
│   ├── business/
│   │   ├── overview.md
│   │   ├── glossary.md
│   │   ├── core-flows.md
│   │   └── business-rules.md
│   ├── architecture/
│   │   ├── overview.md
│   │   ├── module-boundaries.md
│   │   ├── data-model.md
│   │   └── error-handling.md
│   ├── adr/
│   │   ├── README.md
│   │   └── 0001-example.md
│   ├── development/
│   │   ├── local-setup.md
│   │   ├── testing.md
│   │   └── definition-of-done.md
├── docs-personal/
│   └── diary.md
├── apps/
│   └── api/
│       └── AGENTS.md
└── packages/
    └── some-domain/
        └── AGENTS.md
```

不要一开始就写几十篇文档。先完成这几个高价值文件：

1. `docs/business/overview.md`
2. `docs/business/glossary.md`
3. `docs/architecture/overview.md`
4. `docs/architecture/module-boundaries.md`
5. 根目录 `AGENTS.md`
6. `CONTRIBUTING.md`
7. `docs/development/definition-of-done.md`

## 三、根目录 AGENTS.md 应该写什么

注意文件名通常是复数形式：`AGENTS.md`。

根文件只放全仓库都适用的规则，控制在 Agent 可以快速读完的长度。推荐结构：

```md
# Repository Instructions

## Project Goal

一句话说明产品服务谁、解决什么问题。

## Before Editing

- 先阅读与任务相关的业务和架构文档。
- 搜索现有实现、测试和公共组件，避免重复建设。
- 检查工作区现有修改，不覆盖或回退他人的改动。
- 修改范围必须与当前需求直接相关。

## Architecture Boundaries

- 业务逻辑放在哪一层。
- 数据访问只能从哪一层发起。
- 哪些模块不能互相依赖。
- 公共包允许包含什么，不允许包含什么。
- 禁止绕过已有领域服务直接访问数据库。

## Implementation Rules

- 优先复用现有组件、类型、工具和设计模式。
- 不为单次调用创建抽象。
- 不进行与需求无关的重构。
- 不静默改变公共 API、数据库结构或事件格式。
- 新依赖必须说明现有依赖为什么不能满足需求。
- 禁止通过 any、忽略规则或删除测试绕过检查。

## Testing

- 修复缺陷时先增加可以复现问题的测试。
- 业务规则变更必须有单元测试。
- API 或跨模块契约变更必须有集成测试。
- 提交前运行：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`

## Documentation

出现以下变化时同步更新文档：

- 业务规则
- 公共 API
- 数据模型
- 环境变量
- 模块边界
- 本地开发步骤

## Definition of Done

- 功能符合需求和业务规则。
- 没有无关修改。
- 测试覆盖新增或变更行为。
- lint、类型检查和测试通过。
- 没有遗留调试代码或敏感信息。
- 相关文档已更新。

## Final Response

说明：

- 修改了什么
- 为什么这样实现
- 运行了哪些检查
- 哪些检查未运行及原因
- 是否存在迁移、兼容性或部署风险
```

尽量避免这种无法执行的规定：

```md
- 保持代码优雅
- 注意代码质量
- 遵循最佳实践
```

应该改成可以验证的要求：

```md
- controller 不包含业务决策，只负责参数解析、鉴权和响应映射。
- 新增业务规则必须由 domain service 实现并增加单元测试。
- 禁止 packages/domain 导入 apps/*。
```

## 四、模块级 AGENTS.md

大型仓库不适合把所有规则塞进根文件。可以在重要目录增加局部 `AGENTS.md`：

```text
AGENTS.md
apps/api/AGENTS.md
apps/web/AGENTS.md
packages/domain/AGENTS.md
packages/database/AGENTS.md
```

局部文件只描述该模块特有的规则，例如：

```md
# API Module Instructions

- handler 只处理协议层逻辑。
- 所有输入必须经过 schema 校验。
- 业务错误必须映射为已有错误码。
- 不直接返回 ORM entity。
- 新增 endpoint 必须更新 OpenAPI 和契约测试。
```

这样 Agent 进入某个目录时能够获得更精准的约束，也不会被大量无关规则干扰。

## 五、业务文档怎么写才对编码有帮助

业务文档不要写成宣传材料，要写成可以指导决策的事实。

每条核心业务规则建议包含：

```md
## 订单取消

### 适用条件

- 订单状态为 `pending` 或 `confirmed`
- 尚未进入履约阶段

### 不变量

- 已完成订单不能取消
- 退款金额不得超过实付金额
- 同一次取消请求必须幂等

### 异常情况

- 支付成功但支付回调尚未处理
- 部分退款已经发生
- 重复提交取消请求

### 代码位置

- 领域服务：`packages/order/...`
- API：`apps/api/...`
- 测试：`packages/order/...`

### 相关决策

- `docs/adr/0004-order-cancellation.md`
```

其中“不变量、异常情况、代码位置”比长篇业务背景更能降低 Agent 写错代码的概率。

术语表也非常重要。同一个概念如果在产品、数据库和代码里有三个名字，Agent 很容易创建第四个名字。

## 六、用 ADR 控制架构漂移

当团队作出会长期影响代码的决定时，增加一份简短 ADR：

```md
# ADR-0003 使用领域事件处理订单后续动作

## Status

Accepted

## Context

当前订单创建后需要触发库存、通知和审计逻辑。

## Decision

订单模块只发布领域事件，各下游模块独立消费。

## Consequences

- 订单模块不直接依赖通知模块。
- 消费者必须保证幂等。
- 事件结构属于兼容性契约。
```

ADR 记录的是“为什么”，代码通常只能展示“现在是什么”。这可以有效阻止后来的 Agent 把已经解耦的结构重新耦合起来。

## 七、必须配置的自动质量门禁

建议 CI 至少要求：

```text
format check
  → lint
  → typecheck
  → unit tests
  → integration/contract tests
  → build
  → architecture/dependency checks
```

同时配置：

- 主分支禁止直接推送。
- PR 合并前必须通过 CI。
- 至少一名代码所有者审批。
- 禁止通过降低覆盖率、删除测试或添加 ignore 绕过失败。
- 数据库迁移、鉴权、计费等高风险目录使用 `CODEOWNERS`。
- 使用 Renovate 或 Dependabot 管理依赖更新。
- 使用 secret scanning 和依赖漏洞扫描。
- 可行时限制 PR 大小，超大变更必须拆分或说明原因。

`CODEOWNERS` 示例：

```text
/packages/auth/       @security-owner
/packages/billing/    @billing-owner
/database/migrations/ @backend-owner
/.github/workflows/   @platform-owner
```

## 八、给 Vibe Coding 设定标准工作流

每次任务固定经过以下过程：

1. 明确需求、验收条件和不应改变的行为。
2. 阅读相关业务文档和模块规则。
3. 搜索现有实现、公共能力和测试。
4. 只做满足需求所需的最小修改。
5. 给新增或变更行为补测试。
6. 运行局部检查，再运行仓库要求的完整检查。
7. 检查 diff，清除无关格式化、调试代码和临时文件。
8. PR 中说明行为变化、验证结果和风险。

PR 模板可以强制填写：

```md
## Behavior

用户可观察到的变化是什么？

## Scope

修改了哪些模块？明确没有修改什么？

## Verification

运行了哪些测试和检查？

## Risk

是否涉及数据库、权限、兼容性、并发、性能或部署？

## Documentation

更新了哪些文档？不需要更新时说明原因。
```

## 九、文档也需要治理

文档很容易过期，因此每篇重要文档最好包含：

```md
Owner: Team/Person
Status: Active
Last reviewed: 2026-08-25
```

还可以增加这些规则：

- PR 改变业务规则时，业务文档属于同一变更的一部分。
- 文档引用真实代码路径，方便发现漂移。
- 每季度检查关键业务与架构文档。
- 失效文档直接删除或标记废弃，不保留多个互相冲突的版本。
- `docs/README.md` 作为唯一文档索引，说明不同任务应该先读什么。

## 十、推荐落地顺序

第一阶段先完成：

- 根目录 `AGENTS.md`
- 业务概览和术语表
- 架构概览和模块边界
- Definition of Done
- PR 模板

第二阶段补自动化：

- lint、类型检查、测试和构建进入 CI
- 主分支保护
- `CODEOWNERS`
- 架构依赖检查
- secret 和依赖安全扫描

第三阶段再持续完善：

- 核心模块的局部 `AGENTS.md`
- ADR
- 契约测试
- 数据库迁移检查
- 文档有效期和负责人机制

这里最关键的判断标准是：即使某次 Vibe Coding 完全忽略文档，错误修改是否仍会被测试或 CI 挡住。如果答案是否定的，仓库治理还没有形成闭环。
