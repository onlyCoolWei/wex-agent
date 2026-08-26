# 文档导航

Status: Current
Last verified: 2026-08-26
Read when: 开始任何需要阅读项目文档的任务，或新增、移动、归类文档
Applies to: `docs/` 正式项目文档的分类、路由和维护边界

## Related

- Repository rules: `../AGENTS.md`
- Contribution entry: `../CONTRIBUTING.md`
- Personal knowledge base: `../docs-personal/README.md`

## Purpose

`docs/` 不是一个需要全部读完的文件夹。开发者先读根目录的 [`CONTRIBUTING.md`](../CONTRIBUTING.md)，Codex 还必须遵守 [`AGENTS.md`](../AGENTS.md)，然后按任务选择对应类别；个人知识库默认不参与代码修改上下文。

## 先读什么

涉及产品行为时，阅读顺序是：

1. 根目录 [`AGENTS.md`](../AGENTS.md)：修改边界、质量要求和强制流程。
2. 根目录 [`CONTRIBUTING.md`](../CONTRIBUTING.md)：开发者快速流程和常用验证命令。
3. [`glossary.md`](glossary.md)：统一 Business、Design、Technical 和代码中的稳定术语。
4. [`business/README.md`](business/README.md)：产品定义、能力状态、领域地图和选读路由。
5. 对应业务领域文档，再按需要阅读技术和设计文档。

## 文档分类

| 目录/文件                                          | 用途                                 | Codex 默认行为                         |
| -------------------------------------------------- | ------------------------------------ | -------------------------------------- |
| [`business/`](business/)                           | 产品事实、业务规则、不变量和验收基线 | 产品行为修改前必须按任务读取           |
| [`glossary.md`](glossary.md)                       | 跨类别稳定术语及概念边界             | 涉及产品、设计或技术概念时读取         |
| [`../CONTRIBUTING.md`](../CONTRIBUTING.md)         | 开发者快速流程和常用检查             | 作为协作入口阅读                       |
| [`../ARCHITECTURE.md`](../ARCHITECTURE.md)         | 全局技术架构和系统边界               | 跨模块、契约、数据或基础设施变化时读取 |
| [`../DESIGN.md`](../DESIGN.md)                     | 全局视觉语言和交互约束               | UI、布局或公共组件变化时读取           |
| [`technical/`](technical/)                         | 架构、数据库、模型网关和实施方案     | 只有涉及对应技术边界时读取             |
| [`design/`](design/)                               | 页面流程、布局、状态和交互细节       | 只有涉及 Web/UI 行为时读取             |
| [`adr/`](adr/)                                     | 长期技术决策及其取舍                 | 涉及架构选择或兼容策略时读取           |
| [`collaboration-guide.md`](collaboration-guide.md) | Vibe Coding、文档维护和评审方法      | 修改代码前按根规则使用                 |

## 个人知识库边界

根目录 `docs-personal/` 是用户的个人知识库，不是项目需求、业务规则或技术规范。除 `docs-personal/diary.md` 按根规则维护外，除非用户明确点名某个个人文档并要求阅读、整理或转化，否则 Codex：

- 不读取其内容来决定代码方案。
- 不把其中的观点当作产品事实或架构决策。
- 不在其中追加业务规则或实现说明。
- 不因为代码任务而自动格式化、重命名或移动其中的文件。

如果个人笔记中的内容后来成为项目正式决策，应由用户明确确认后，提炼成 `business/`、`technical/` 或 `design/` 中的正式文档；不要直接把个人笔记当作规范。

## 维护规则

- 同一业务模块的 Business、Design 和 Technical 主文档使用相同英文文件名和一级标题；文档类别由目录和正文职责表达，不追加 `Design`、`Technical Implementation` 等名称后缀。没有独立内容的视角不创建占位文件。
- 跨 Business、Design 和 Technical 的稳定术语统一维护在 `glossary.md`，不由单一文档类别拥有。
- 页面、弹窗等组合视图按界面范围命名，并在 `Related` 中链接它组合的业务模块，不把页面自动提升为业务域。
- 基础设施、SDK、网关和路线图按技术专题命名，并链接其服务的模块主文档。
- 新增业务事实放入 `business/`，并更新 `business/README.md` 的领域地图。
- 新增架构或实施方案放入 `technical/`，并链接对应业务文档。
- 新增页面流程或视觉交互放入 `design/`，并链接对应业务文档。
- 长期技术决策可以放入未来的 `adr/`，不要塞入个人笔记或业务文档。
- 需要明确归类的新文档，先更新本导航，再开始写正文。
