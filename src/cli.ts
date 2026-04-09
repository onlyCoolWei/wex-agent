#!/usr/bin/env node
/**
 * CLI 入口
 * 对应 Claude Code 的 src/entrypoints/cli.tsx + src/main.tsx
 *
 * 解析命令行参数，初始化配置，启动 REPL 或管道模式
 */
import "dotenv/config";
import { Command } from "commander";
import chalk from "chalk";
import type { AgentConfig } from "./types.js";
import { startREPL } from "./repl.js";
import { agenticLoop } from "./loop.js";
import { buildSystemPrompt } from "./context.js";

const VERSION = "0.1.0";

const program = new Command()
  .name("wex-agent")
  .description("AI coding agent in the terminal")
  .version(VERSION)
  .option("-m, --model <model>", "Model to use", "deepseek-chat")
  .option("-k, --api-key <key>", "DeepSeek API key (or set DEEPSEEK_API_KEY)")
  .option("-p, --pipe", "Pipe mode: read from stdin, output to stdout")
  .option("--max-turns <n>", "Max agentic loop turns", "25")
  .option("--cwd <dir>", "Working directory", process.cwd())
  .argument("[prompt]", "Initial prompt (optional)")
  .action(async (prompt, opts) => {
    const apiKey = opts.apiKey || process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      console.error(
        chalk.red("Error: API key required. Set DEEPSEEK_API_KEY or use --api-key")
      );
      process.exit(1);
    }

    const config: AgentConfig = {
      apiKey,
      model: opts.model,
      maxTurns: parseInt(opts.maxTurns, 10),
      systemPrompt: "", // 由 context.ts 动态构建
      cwd: opts.cwd,
    };

    // 管道模式：读 stdin → 执行 → 输出 → 退出
    if (opts.pipe) {
      config.systemPrompt = buildSystemPrompt(config.cwd);
      const input = prompt || (await readStdin());
      if (!input) {
        console.error("No input provided");
        process.exit(1);
      }
      const result = await agenticLoop(config, input);
      // 输出最后一条 assistant 消息
      const lastMsg = result.state.messages.findLast((m) => m.role === "assistant");
      if (lastMsg && typeof lastMsg.content === "string") {
        console.log(lastMsg.content);
      } else if (lastMsg && Array.isArray(lastMsg.content)) {
        const text = lastMsg.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");
        console.log(text);
      }
      process.exit(0);
    }

    // 交互模式
    if (prompt) {
      // 有初始 prompt → 先执行一轮，再进入 REPL
      config.systemPrompt = buildSystemPrompt(config.cwd);
      console.log(chalk.bold.blue("\n🤖 Wex Agent"));
      console.log(chalk.dim(`Model: ${config.model}\n`));
      const result = await agenticLoop(config, prompt);
      console.log(
        chalk.dim(
          `  [turns: ${result.state.turnCount} | tokens: ${result.state.totalInputTokens}+${result.state.totalOutputTokens}]\n`
        )
      );
      // 继续进入 REPL，保持会话
      // TODO: 传递 result.state.messages 到 REPL
    }

    await startREPL(config);
  });

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8").trim();
}

program.parse();
