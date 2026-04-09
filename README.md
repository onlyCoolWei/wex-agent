# Wex Agent

一个终端 AI 编程 Agent，架构参考 Claude Code 的五层设计。

## 架构

```
┌─────────────────────────────────────────┐
│  交互层 (repl.ts)                        │  用户输入 / 消息展示
├─────────────────────────────────────────┤
│  编排层 (cli.ts)                         │  会话管理 / 配置
├─────────────────────────────────────────┤
│  核心循环层 (loop.ts)                     │  Agentic Loop: 思考→行动→观察
├─────────────────────────────────────────┤
│  工具层 (tools/)                         │  read/write/edit/bash/grep/glob
├─────────────────────────────────────────┤
│  通信层 (api.ts)                         │  Anthropic API 流式通信
└─────────────────────────────────────────┘
```

## 快速开始

```bash
# 安装依赖
npm install

# 设置 API Key
export ANTHROPIC_API_KEY=sk-ant-...

# 交互模式
npx tsx src/cli.ts

# 带初始 prompt
npx tsx src/cli.ts "帮我看看这个项目的结构"

# 管道模式
echo "列出当前目录的文件" | npx tsx src/cli.ts -p
```

## 与 Claude Code 的对应关系

| 本项目 | Claude Code | 说明 |
|--------|-------------|------|
| `src/cli.ts` | `src/entrypoints/cli.tsx` + `src/main.tsx` | CLI 入口 |
| `src/repl.ts` | `src/screens/REPL.tsx` | 交互界面 |
| `src/loop.ts` | `src/query.ts` | Agentic Loop |
| `src/api.ts` | `src/services/api/claude.ts` | API 通信 |
| `src/tools/` | `src/tools/` | 工具实现 |
| `src/context.ts` | `src/context.ts` | System Prompt 构建 |
| `src/types.ts` | `src/types/message.ts` + `src/Tool.ts` | 类型定义 |
