/**
 * ReadFileTool - 文件读取
 * 对应 Claude Code 的 src/tools/FileReadTool/
 */
import { z } from "zod";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import type { Tool, ToolResult, ToolContext } from "../types.js";

const inputSchema = z.object({
  path: z.string().describe("File path to read (relative to cwd)"),
  startLine: z.number().optional().describe("Start line (1-indexed)"),
  endLine: z.number().optional().describe("End line (1-indexed, inclusive)"),
});

type ReadFileInput = z.infer<typeof inputSchema>;

export const ReadFileTool: Tool<ReadFileInput> = {
  name: "read_file",
  description:
    "Read the contents of a file. Supports optional line range. Returns the file content as text.",
  inputSchema,
  isReadOnly: true,

  async call(input: ReadFileInput, context: ToolContext): Promise<ToolResult> {
    try {
      const fullPath = resolve(context.cwd, input.path);
      const stat = statSync(fullPath);

      if (stat.size > 1024 * 1024) {
        return {
          content: `File too large (${(stat.size / 1024 / 1024).toFixed(1)}MB). Use line ranges to read portions.`,
          isError: true,
        };
      }

      let content = readFileSync(fullPath, "utf-8");

      if (input.startLine || input.endLine) {
        const lines = content.split("\n");
        const start = (input.startLine ?? 1) - 1;
        const end = input.endLine ?? lines.length;
        content = lines.slice(start, end).join("\n");
      }

      return { content };
    } catch (err: unknown) {
      return {
        content: `Error reading file: ${(err as Error).message}`,
        isError: true,
      };
    }
  },
};
