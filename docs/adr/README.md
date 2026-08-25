# Architecture Decision Records

Status: Current
Last verified: 2026-08-26
Read when: 需要记录或查找长期、难以逆转的架构技术决策
Applies to: `docs/adr/` 中的 Architecture Decision Record

## Related

- Architecture: `../../ARCHITECTURE.md`
- Technical: `../technical/README.md`
- Business: `../business/README.md`

## Purpose

ADR（Architecture Decision Record）只记录会长期影响模块边界、数据兼容、运行方式或安全模型的技术决策，以及做出该决策的原因。

业务规则放在 `docs/business/`，页面流程放在 `docs/design/`，一般实施步骤放在 `docs/technical/`。不要为了普通重构或一次性实现创建 ADR。

## 何时需要 ADR

- 引入或替换跨应用基础设施。
- 改变公共事件、数据库兼容策略或状态模型。
- 改变鉴权、Sandbox、密钥或安全边界。
- 选择会让后续代码长期依赖的第三方框架或运行方式。
- 存在两个合理方案，未来维护者需要知道为什么没有选择另一个。

## 文件命名

```text
docs/adr/0001-short-decision-title.md
```

编号只递增，不复用已经删除的编号。决策被替换时保留旧文件，将状态改为 `Superseded`，并链接新的 ADR。

## 模板

```markdown
# ADR-<number> <decision title>

## Status

Proposed | Accepted | Superseded | Rejected

## Context

需要解决什么问题？有哪些约束、现状和不可忽略的风险？

## Decision

选择什么方案？哪些边界和规则因此成为约束？

## Alternatives

考虑过哪些方案？为什么没有选择？

## Consequences

带来的收益、成本、迁移、兼容性和运维影响是什么？

## Verification

如何通过代码、测试或运行指标确认这个决策被正确实现？

## Related

- 业务文档：
- 技术文档：
- 代码入口：
```
