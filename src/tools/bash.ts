/**
 * BashTool - Shell 命令执行
 * 对应 Claude Code 的 src/tools/BashTool/
 */
import { z } from "zod";
import { execSync } from "node:child_process";
import type { Tool, ToolResult, ToolContext } from "../types.js";

const inputSchema = z.object({
  command: z.string().describe("The shell command to execute"),
  timeout: z
    .number()
    .default(30000)
    .describe("Timeout in milliseconds"),
});

type BashInput = z.infer<typeof inputSchema>;

export const BashTool: Tool<BashInput> = {
  name: "bash",
  description:
    "Execute a shell command and return its output. Use for running scripts, installing packages, git operations, etc.",
  inputSchema,
  isReadOnly: false,

  async call(input: BashInput, context: ToolContext): Promise<ToolResult> {
    try {
      const output = execSync(input.command, {
        cwd: context.cwd,
        timeout: input.timeout,
        encoding: "utf-8",
        maxBuffer: 1024 * 1024, // 1MB
        stdio: ["pipe", "pipe", "pipe"],
      });
      return { content: output || "(no output)" };
    } catch (err: unknown) {
      const error = err as { stderr?: string; message?: string; status?: number };
      const stderr = error.stderr || error.message || "Unknown error";
      return {
        content: `Exit code: ${error.status ?? 1}\n${stderr}`,
        isError: true,
      };
    }
  },
};
