# 技术文档

Status: Current
Last verified: 2026-08-26
Read when: 修改技术边界、API、数据库、Worker、模型或基础设施实现
Applies to: `docs/technical/` 模块技术文档和实施方案

## Related

- Business: `docs/business/README.md`
- Architecture: `ARCHITECTURE.md`
- ADR: `docs/adr/README.md`

## Purpose

这里记录模块级技术决策、配置和实施方案。全局架构边界以根目录 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为准；技术文档不定义产品目标，修改用户行为前先读 [`../business/README.md`](../business/README.md) 和对应领域文档。

模块主文档与业务模块使用相同文件名；基础设施、网关和路线图按技术专题命名，不为它们创建虚构的业务模块。

| 文档                                                                 | 类型       | 主题                                    |
| -------------------------------------------------------------------- | ---------- | --------------------------------------- |
| [`identity-and-access.md`](identity-and-access.md)                   | 模块主文档 | Session、路由保护和 API 授权边界        |
| [`projects.md`](projects.md)                                         | 模块主文档 | Project API、数据库和创建/删除链路      |
| [`conversations-and-agent-runs.md`](conversations-and-agent-runs.md) | 模块主文档 | 持久化对话、Run、Worker 和 SSE          |
| [`supabase.md`](supabase.md)                                         | 技术专题   | Supabase 配置、migration 和数据库验证   |
| [`model-gateway.md`](model-gateway.md)                               | 技术专题   | Agents SDK、LiteLLM、Runtime 和模型网关 |
| [`architecture-roadmap.md`](architecture-roadmap.md)                 | 技术专题   | 技术路线、阶段方案和未来能力参考        |

这些文档可能包含未来规划。以业务知识库中的能力状态和代码实际行为为准。
