# Wex Agent 项目 Onboarding

## 项目概述
wex-agent 是一个终端 AI 编程助手，灵感来自 Claude Code 架构。用户可以在终端中通过自然语言与 AI 交互，AI 能够读写文件、执行命令、搜索代码等。

## 技术栈
- 语言：TypeScript（ES2022，ESM 模块）
- 运行时：Node.js
- 包管理：pnpm
- 构建工具：tsup（打包）、tsx（开发运行）
- AI API：DeepSeek（通过 OpenAI SDK 兼容调用，baseURL 为 `https://api.deepseek.com`）
- 参数校验：Zod
- CLI 框架：Commander.js
- 终端美化：chalk、ora
- 代码规范：commitlint + husky（conventional commits）

## 项目结构
```
src/
├── cli.ts        # CLI 入口，解析参数，启动 REPL 或管道模式
├── api.ts        # DeepSeek API 通信层（流式，OpenAI 兼容格式）
├── context.ts    # System Prompt 动态构建（项目信息、git 状态、工具列表）
├── loop.ts       # Agentic Loop 主循环（多轮工具调用）
├── repl.ts       # 交互式 REPL
├── types.ts      # 核心类型定义（Message、Tool、AgentConfig 等）
└── tools/        # 工具实现
    ├── index.ts      # 工具注册表
    ├── bash.ts       # Shell 命令执行
    ├── read-file.ts  # 读取文件
    ├── write-file.ts # 写入文件
    ├── edit-file.ts  # 编辑文件（diff-based）
    ├── grep.ts       # 文本搜索
    └── glob.ts       # 文件匹配
```

## 关键设计
- 消息格式采用 ContentBlock 数组（text / tool_use / tool_result），内部统一格式后转换为 OpenAI API 格式
- 工具系统基于 Zod schema 定义输入，运行时通过简易转换器生成 JSON Schema
- 支持 AGENT.md / CLAUDE.md 作为项目级记忆注入 System Prompt
- 支持管道模式（`--pipe`）和交互式 REPL 两种使用方式

## 开发命令
- `pnpm dev` — 开发运行
- `pnpm build` — 构建到 dist/
- `pnpm typecheck` — 类型检查
- 环境变量 `DEEPSEEK_API_KEY` 必须配置

## 修改代码时的注意事项
- 所有代码修改的摘要需要记录到 `docs/diary.md`
- 保持 ESM 模块风格，import 路径需要带 `.js` 后缀
- 遵循 conventional commits 规范
