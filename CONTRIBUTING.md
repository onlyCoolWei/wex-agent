# Contributing to Wex Agent

这是一份面向人类开发者和 Coding Agent 的快速协作入口。详细治理方法、业务文档模板和风险分级见 [`docs/collaboration-guide.md`](docs/collaboration-guide.md)；Codex 修改代码时必须遵守 [`AGENTS.md`](AGENTS.md)。

## 开始前

1. 阅读 [`docs/README.md`](docs/README.md)，按任务选择文档类别。
2. 涉及产品行为时，先读 [`docs/business/README.md`](docs/business/README.md) 和对应领域文档。
3. 运行 `git status --short`，保留工作区中已有的修改。
4. 明确用户结果、验收标准和非目标，再搜索相邻实现和测试。

个人知识库位于根目录 `docs-personal/`。除非用户明确点名，否则不要读取、引用或修改其中内容。

## 修改原则

- 只做满足当前需求的最小完整修改。
- 优先复用已有模块、类型、组件和命名。
- 不进行无关重构、全局格式化、依赖升级或目录重组。
- 不直接修改 `dist/`、`.turbo/` 或依赖目录。
- 公共契约、数据库、配置和权限变化必须同步检查消费者、迁移、文档和兼容性。
- 不使用 `any`、忽略检查或删除测试来绕过问题。

## 按范围验证

```bash
pnpm --filter <workspace> typecheck
pnpm --filter @wex/worker test  # Worker Runtime 或对话执行变化时
pnpm typecheck                  # 共享包或跨 workspace 变化时
pnpm build                      # 构建、配置或跨 workspace 变化时
pnpm check:docs                 # 文档链接、目录边界和模块元信息变化时
pnpm exec prettier --check <changed-files>
```

用户界面还要检查加载、空数据、错误、禁用和窄屏状态。依赖 Supabase、LiteLLM 或其他外部服务但无法验证时，必须在交付说明中明确标注。

## 完成标准

- 用户行为符合业务文档和验收标准。
- 没有无关文件、生成文件、调试代码或敏感信息进入变更。
- 相关契约、migration、配置示例和文档已同步。
- 相关自动化检查和手动流程已运行，未运行项及原因已说明。
- 最终说明包含行为变化、关键文件、验证结果和剩余风险。
- 仓库文件发生变化时，按 `AGENTS.md` 要求更新 `docs-personal/diary.md`。

## 文档分工

| 文件                          | 用途                       |
| ----------------------------- | -------------------------- |
| `AGENTS.md`                   | Codex 必须执行的仓库硬规则 |
| `CONTRIBUTING.md`             | 开发者快速入口和常用检查   |
| `docs/business/`              | 产品事实、业务规则和不变量 |
| `docs/technical/`             | 架构、技术决策和实施方案   |
| `docs/design/`                | 页面流程、状态和布局       |
| `docs/collaboration-guide.md` | 完整协作方法论与治理细节   |
