/**
 * REPL 交互层
 * 对应 Claude Code 的 src/screens/REPL.tsx（简化版，不用 Ink）
 *
 * 负责用户输入、消息展示、会话管理
 */
import * as readline from "node:readline";
import chalk from "chalk";
import type { Message, AgentConfig } from "./types.js";
import { agenticLoop } from "./loop.js";
import { buildSystemPrompt } from "./context.js";

export async function startREPL(config: AgentConfig) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // 会话消息历史（跨轮次保持）
  let sessionMessages: Message[] = [];

  console.log(chalk.bold.blue("\n🤖 Wex Agent"));
  console.log(chalk.dim(`Model: ${config.model} | cwd: ${config.cwd}`));
  console.log(chalk.dim('Type your message, or "exit" to quit.\n'));

  // 动态构建 system prompt
  config.systemPrompt = buildSystemPrompt(config.cwd);

  const prompt = () => {
    rl.question(chalk.green("❯ "), async (input) => {
      const trimmed = input.trim();

      if (!trimmed) {
        prompt();
        return;
      }

      // 斜杠命令
      if (trimmed === "exit" || trimmed === "/exit") {
        console.log(chalk.dim("Bye! 👋"));
        rl.close();
        process.exit(0);
      }

      if (trimmed === "/clear") {
        sessionMessages = [];
        config.systemPrompt = buildSystemPrompt(config.cwd);
        console.log(chalk.dim("Session cleared.\n"));
        prompt();
        return;
      }

      if (trimmed === "/cost") {
        // 简单的 token 统计
        console.log(chalk.dim(`Session messages: ${sessionMessages.length}\n`));
        prompt();
        return;
      }

      // 执行 agentic loop
      console.log("");
      try {
        const result = await agenticLoop(config, trimmed, sessionMessages);

        // 更新会话历史
        sessionMessages = result.state.messages;

        // 显示统计
        console.log(
          chalk.dim(
            `  [turns: ${result.state.turnCount} | tokens: ${result.state.totalInputTokens}+${result.state.totalOutputTokens} | reason: ${result.reason}]`
          )
        );
        console.log("");
      } catch (err: unknown) {
        console.error(chalk.red(`Error: ${(err as Error).message}\n`));
      }

      prompt();
    });
  };

  prompt();
}
