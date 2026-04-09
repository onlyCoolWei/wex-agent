/**
 * WriteFileTool - 文件写入
 * 对应 Claude Code 的 src/tools/FileWriteTool/
 */
import { z } from "zod";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import type { Tool, ToolResult, ToolContext } from "../types.js";

const inputSchema = z.object({
  path: z.string().describe("File path to write (relative to cwd)"),
  content: z.string().describe("Content to write to the file"),
});

type WriteFileInput = z.infer<typeof inputSchema>;

export const WriteFileTool: Tool<WriteFileInput> = {
  name: "write_file",
  description:
    "Create or overwrite a file with the given content. Parent directories are created automatically.",
  inputSchema,
  isReadOnly: false,

  async call(input: WriteFileInput, context: ToolContext): Promise<ToolResult> {
    try {
      const fullPath = resolve(context.cwd, input.path);
      mkdirSync(dirname(fullPath), { recursive: true });
      writeFileSync(fullPath, input.content, "utf-8");
      return { content: `Successfully wrote ${input.path}` };
    } catch (err: unknown) {
      return {
        content: `Error writing file: ${(err as Error).message}`,
        isError: true,
      };
    }
  },
};
