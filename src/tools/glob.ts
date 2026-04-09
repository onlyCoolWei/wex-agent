/**
 * GlobTool - 文件搜索
 * 对应 Claude Code 的 src/tools/GlobTool/
 */
import { z } from "zod";
import { globSync } from "glob";
import type { Tool, ToolResult, ToolContext } from "../types.js";

const inputSchema = z.object({
  pattern: z.string().describe("Glob pattern to match files (e.g. '**/*.ts')"),
  path: z
    .string()
    .default(".")
    .describe("Base directory to search from"),
});

type GlobInput = z.infer<typeof inputSchema>;

export const GlobTool: Tool<GlobInput> = {
  name: "glob",
  description:
    "Find files matching a glob pattern. Returns a list of matching file paths.",
  inputSchema,
  isReadOnly: true,

  async call(input: GlobInput, context: ToolContext): Promise<ToolResult> {
    try {
      const files = globSync(input.pattern, {
        cwd: context.cwd + "/" + input.path,
        ignore: ["**/node_modules/**", "**/.git/**"],
        nodir: true,
      });

      if (files.length === 0) {
        return { content: "No files matched the pattern." };
      }

      const result = files.sort().join("\n");
      if (files.length > 200) {
        return {
          content: `${files.slice(0, 200).join("\n")}\n\n... (${files.length - 200} more files)`,
        };
      }
      return { content: `${files.length} files found:\n${result}` };
    } catch (err: unknown) {
      return {
        content: `Glob error: ${(err as Error).message}`,
        isError: true,
      };
    }
  },
};
