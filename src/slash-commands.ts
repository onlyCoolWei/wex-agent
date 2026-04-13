/**
 * 斜杠命令系统
 * 类似 Claude Code 的 /command 菜单
 *
 * 定义所有可用的斜杠命令，以及交互式选择菜单
 */
import chalk from "chalk";
import type { Message, AgentConfig } from "./types.js";
import { buildSystemPrompt } from "./context.js";

// ─── 斜杠命令定义 ───────────────────────────────────────
export interface SlashCommand {
  /** 命令名（不含 /） */
  name: string;
  /** 命令描述 */
  description: string;
  /** 执行函数，返回 true 表示退出 REPL */
  execute(ctx: SlashCommandContext): Promise<boolean>;
}

export interface SlashCommandContext {
  config: AgentConfig;
  getMessages(): Message[];
  setMessages(msgs: Message[]): void;
}

export const slashCommands: SlashCommand[] = [
  {
    name: "clear",
    description: "清除当前会话历史",
    async execute(ctx) {
      ctx.setMessages([]);
      ctx.config.systemPrompt = buildSystemPrompt(ctx.config.cwd);
      console.log(chalk.dim("Session cleared.\n"));
      return false;
    },
  },
  {
    name: "cost",
    description: "显示当前会话的 token 统计",
    async execute(ctx) {
      console.log(chalk.dim(`Session messages: ${ctx.getMessages().length}\n`));
      return false;
    },
  },
  {
    name: "exit",
    description: "退出 Wex Agent",
    async execute() {
      console.log(chalk.dim("Bye! 👋"));
      return true;
    },
  },
];

// ─── 交互式选择菜单 ─────────────────────────────────────

/**
 * 显示斜杠命令选择菜单
 * 用户可以用上下箭头选择，Enter 确认，Esc/Ctrl+C 取消
 * 支持输入过滤：输入 /cl 会过滤出 /clear
 */
export function showSlashMenu(
  filter: string = ""
): Promise<SlashCommand | null> {
  return new Promise((resolve) => {
    const filtered = slashCommands.filter((cmd) =>
      cmd.name.startsWith(filter)
    );

    if (filtered.length === 0) {
      resolve(null);
      return;
    }

    let selectedIndex = 0;
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;

    // 计算列宽
    const maxNameLen = Math.max(...filtered.map((c) => c.name.length));

    function render() {
      // 清除之前渲染的菜单行
      for (let i = 0; i < filtered.length; i++) {
        process.stdout.write("\x1b[2K"); // 清除当前行
        if (i < filtered.length - 1) {
          process.stdout.write("\x1b[1B"); // 下移一行
        }
      }
      // 回到起始位置
      if (filtered.length > 1) {
        process.stdout.write(`\x1b[${filtered.length - 1}A`);
      }

      for (let i = 0; i < filtered.length; i++) {
        const cmd = filtered[i];
        const name = `/${cmd.name}`.padEnd(maxNameLen + 2);
        if (i === selectedIndex) {
          process.stdout.write(
            `  ${chalk.bold.cyan(name)} ${chalk.bold(cmd.description)}`
          );
        } else {
          process.stdout.write(
            `  ${chalk.cyan(name)} ${chalk.dim(cmd.description)}`
          );
        }
        if (i < filtered.length - 1) {
          process.stdout.write("\n");
        }
      }

      // 光标回到第一行
      if (filtered.length > 1) {
        process.stdout.write(`\x1b[${filtered.length - 1}A`);
      }
      // 移到行首
      process.stdout.write("\r");
    }

    function cleanup() {
      // 清除菜单区域
      for (let i = 0; i < filtered.length; i++) {
        process.stdout.write("\x1b[2K"); // 清除当前行
        if (i < filtered.length - 1) {
          process.stdout.write("\x1b[1B"); // 下移
        }
      }
      // 回到起始位置
      if (filtered.length > 1) {
        process.stdout.write(`\x1b[${filtered.length - 1}A`);
      }
      process.stdout.write("\r");

      stdin.removeListener("data", onKey);
      if (!wasRaw) {
        stdin.setRawMode(false);
      }
    }

    function onKey(data: Buffer) {
      const key = data.toString();

      // Esc 或 Ctrl+C → 取消
      if (key === "\x1b" || key === "\x03") {
        cleanup();
        resolve(null);
        return;
      }

      // Enter → 确认选择
      if (key === "\r" || key === "\n") {
        cleanup();
        resolve(filtered[selectedIndex]);
        return;
      }

      // 上箭头
      if (key === "\x1b[A") {
        selectedIndex =
          (selectedIndex - 1 + filtered.length) % filtered.length;
        render();
        return;
      }

      // 下箭头
      if (key === "\x1b[B") {
        selectedIndex = (selectedIndex + 1) % filtered.length;
        render();
        return;
      }
    }

    stdin.setRawMode(true);
    stdin.resume();

    // 初始渲染
    render();

    stdin.on("data", onKey);
  });
}
