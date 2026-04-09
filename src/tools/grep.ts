/**
 * GrepTool - 文本搜索
 * 对应 Claude Code 的 src/tools/GrepTool/
 */
import { z } from "zod";
import { execSync } from "node:child_process";
import type { Tool, ToolResult, ToolContext } from "../types.js";

const inputSchema = z.object({
  pattern: z.string().describe("Regex pattern to search for"),
  path: z
    .string()
    .default(".")
    .describe("Directory or file to search in"),
  include: z
    .string()
    .optional()
    .describe("File glob pattern to include (e.g. '*.ts')"),
});

type GrepInput = z.infer<typeof inputSchema>;

export const GrepTool: Tool<GrepInput> = {
  name: "grep",
  description:
    "Search for a regex pattern in files. Returns matching lines with file paths and line numbers.",
  inputSchema,
  isReadOnly: true,

  async call(input: GrepInput, context: ToolContext): Promise<ToolResult> {
    try {
      const args = ["-rn", "--color=never"];
      if (input.include) {
        args.push(`--include=${input.include}`);
      }
      args.push(input.pattern, input.path);

      const output = execSync(`grep ${args.join(" ")}`, {
        cwd: context.cwd,
        encoding: "utf-8",
        maxBuffer: 512 * 1024,
        timeout: 10000,
      });

      const lines = output.trim().split("\n");
      if (lines.length > 100) {
        return {
          content: `${lines.slice(0, 100).join("\n")}\n\n... (${lines.length - 100} more matches truncated)`,
        };
      }
      return { content: output.trim() || "No matches found." };
    } catch (err: unknown) {
      const error = err as { status?: number };
      if (error.status === 1) {
        return { content: "No matches found." };
      }
      return {
        content: `Grep error: ${(err as Error).message}`,
        isError: true,
      };
    }
  },
};
