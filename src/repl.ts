/**
 * REPL 交互层
 * 对应 Claude Code 的 src/screens/REPL.tsx（简化版，不用 Ink）
 *
 * 负责用户输入、消息展示、会话管理
 * 支持斜杠命令交互式选择菜单
 */
import chalk from "chalk";
import type { Message, AgentConfig } from "./types.js";
import { agenticLoop } from "./loop.js";
import { buildSystemPrompt } from "./context.js";
import {
  slashCommands,
  showSlashMenu,
  type SlashCommandContext,
} from "./slash-commands.js";

/**
 * 判断字符的终端显示宽度
 * CJK 及全角字符占 2 列，其余占 1 列
 */
function charWidth(ch: string): number {
  const code = ch.codePointAt(0)!;
  // CJK Unified Ideographs, CJK Extension A/B, Hangul, Fullwidth forms, etc.
  if (
    (code >= 0x1100 && code <= 0x115f) ||  // Hangul Jamo
    (code >= 0x2e80 && code <= 0x303e) ||  // CJK Radicals, Kangxi, CJK Symbols
    (code >= 0x3040 && code <= 0x33bf) ||  // Hiragana, Katakana, CJK Compat
    (code >= 0x3400 && code <= 0x4dbf) ||  // CJK Extension A
    (code >= 0x4e00 && code <= 0xa4cf) ||  // CJK Unified + Yi
    (code >= 0xac00 && code <= 0xd7af) ||  // Hangul Syllables
    (code >= 0xf900 && code <= 0xfaff) ||  // CJK Compat Ideographs
    (code >= 0xfe30 && code <= 0xfe6f) ||  // CJK Compat Forms
    (code >= 0xff01 && code <= 0xff60) ||  // Fullwidth Forms
    (code >= 0xffe0 && code <= 0xffe6) ||  // Fullwidth Signs
    (code >= 0x20000 && code <= 0x2fa1f)   // CJK Extension B+
  ) {
    return 2;
  }
  return 1;
}

/**
 * 读取一行用户输入（支持 / 触发斜杠命令菜单）
 *
 * 使用 raw mode 逐字符读取，当检测到 / 开头时弹出选择菜单
 */
function readLine(promptStr: string): Promise<string | null> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    let buffer = "";

    process.stdout.write(promptStr);

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    function cleanup() {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
    }

    async function onData(data: string) {
      const key = data;

      // Ctrl+C → 退出
      if (key === "\x03") {
        cleanup();
        console.log(chalk.dim("\nBye! 👋"));
        process.exit(0);
      }

      // Ctrl+D → 退出（空行时）
      if (key === "\x04") {
        if (buffer.length === 0) {
          cleanup();
          console.log(chalk.dim("\nBye! 👋"));
          process.exit(0);
        }
        return;
      }

      // Enter → 提交
      if (key === "\r" || key === "\n") {
        process.stdout.write("\n");
        cleanup();
        resolve(buffer);
        return;
      }

      // Backspace
      if (key === "\x7f" || key === "\b") {
        if (buffer.length > 0) {
          const lastChar = [...buffer].at(-1)!;
          const width = charWidth(lastChar);
          // 按字符（非字节）删除最后一个字符
          buffer = [...buffer].slice(0, -1).join("");
          // 按显示宽度回退光标并擦除
          process.stdout.write("\b".repeat(width) + " ".repeat(width) + "\b".repeat(width));
        }
        return;
      }

      // 忽略其他控制字符和转义序列
      if (key.charCodeAt(0) < 32 || key === "\x1b" || key.startsWith("\x1b[")) {
        return;
      }

      // 普通字符
      buffer += key;
      process.stdout.write(key);

      // 检测：如果当前 buffer 是 "/" 开头，触发斜杠命令菜单
      if (buffer === "/") {
        // 暂停当前输入监听
        stdin.removeListener("data", onData);
        stdin.setRawMode(false);

        // 换行后显示菜单
        process.stdout.write("\n");
        const selected = await showSlashMenu("");

        if (selected) {
          // 清除输入行，显示选中的命令
          process.stdout.write(`\x1b[1A`); // 上移到输入行
          process.stdout.write(`\r\x1b[2K`); // 清除该行
          process.stdout.write(promptStr + chalk.cyan(`/${selected.name}`));
          process.stdout.write("\n");
          cleanup();
          resolve(`/${selected.name}`);
        } else {
          // 取消 → 回到输入行继续编辑
          process.stdout.write(`\x1b[1A`); // 上移到输入行
          process.stdout.write(`\r\x1b[2K`); // 清除该行
          buffer = "";
          process.stdout.write(promptStr);
          stdin.setRawMode(true);
          stdin.resume();
          stdin.on("data", onData);
        }
        return;
      }
    }

    stdin.on("data", onData);
  });
}

export async function startREPL(config: AgentConfig) {
  // 会话消息历史（跨轮次保持）
  let sessionMessages: Message[] = [];

  console.log(chalk.bold.blue("\n🤖 Wex Agent"));
  console.log(chalk.dim(`Model: ${config.model} | cwd: ${config.cwd}`));
  console.log(chalk.dim('Type your message, or "/" for commands.\n'));

  // 动态构建 system prompt
  config.systemPrompt = buildSystemPrompt(config.cwd);

  // 斜杠命令上下文
  const cmdCtx: SlashCommandContext = {
    config,
    getMessages: () => sessionMessages,
    setMessages: (msgs) => {
      sessionMessages = msgs;
    },
  };

  const promptStr = chalk.green("❯ ");

  const loop = async () => {
    while (true) {
      const input = await readLine(promptStr);

      if (input === null) continue;

      const trimmed = input.trim();
      if (!trimmed) continue;

      // 斜杠命令处理
      if (trimmed.startsWith("/")) {
        const cmdName = trimmed.slice(1);
        const cmd = slashCommands.find((c) => c.name === cmdName);
        if (cmd) {
          const shouldExit = await cmd.execute(cmdCtx);
          if (shouldExit) {
            process.exit(0);
          }
          continue;
        } else {
          console.log(chalk.yellow(`Unknown command: ${trimmed}\n`));
          continue;
        }
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
    }
  };

  await loop();
}
