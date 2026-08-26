# Technical Documentation

Status: Current
Last verified: 2026-08-26
Read when: 修改技术边界、API、数据库、Worker、模型或基础设施实现
Applies to: `docs/technical/` 中的模块技术文档和技术参考

## Related

- Documentation: `docs/README.md`
- Business: `docs/business/README.md`
- Architecture: `ARCHITECTURE.md`
- ADR: `docs/adr/README.md`

## Purpose

本目录记录当前实现链路、模块边界、稳定契约、一致性规则和经过代码确认的实现缺口。全局边界以根目录 [`ARCHITECTURE.md`](../../ARCHITECTURE.md) 为准；用户行为以 [`../business/README.md`](../business/README.md) 和对应业务文档为准。

技术文档不得把目标架构、预留类型或分阶段计划描述成当前能力。长期且难以逆转的技术取舍应进入 `docs/adr/`。

## Document Map

| Document                                                             | Type            | Read for                                    |
| -------------------------------------------------------------------- | --------------- | ------------------------------------------- |
| [`identity-and-access.md`](identity-and-access.md)                   | Module          | Session、路由保护、API 鉴权和所有权边界     |
| [`projects.md`](projects.md)                                         | Module          | Project API、数据、创建和删除链路           |
| [`conversations-and-agent-runs.md`](conversations-and-agent-runs.md) | Module          | Message、Run、Worker、事件和 SSE            |
| [`supabase.md`](supabase.md)                                         | Technical topic | Supabase 配置、密钥、migration 和数据库验证 |
| [`model-gateway.md`](model-gateway.md)                               | Technical topic | Agents SDK、LiteLLM、Runtime 和模型配置     |
| [`architecture-roadmap.md`](architecture-roadmap.md)                 | Reference       | 未交付 Runtime、队列、Sandbox 和发布方向    |

## Reading Rules

- 修改模块实现时，先读对应 Business 文档，再读模块 Technical 文档。
- 修改 UI 时，同时读取 `DESIGN.md` 和对应 Design 文档。
- 跨应用、Contracts、数据库、认证、Worker 或基础设施变化必须读取 `ARCHITECTURE.md`。
- `Status: Current` 只表示文档已与当前实现核对，不表示其中列出的缺口已经交付。
- `Status: Reference` 表示文档提供演进参考，不是当前实现事实来源。

## Maintenance

- 模块主文档与业务模块使用相同英文文件名和一级标题。
- 基础设施、SDK、网关和路线图按实际技术范围命名，不创建虚构业务模块。
- Contract 变化必须同步生产者和消费者；Schema 变化必须同步 migration 和数据库类型。
- Related 只链接真实存在且与当前技术边界相关的文档。
- 技术文档只摘录稳定语义，不复制完整 DTO、Schema、源码或第三方文档。
