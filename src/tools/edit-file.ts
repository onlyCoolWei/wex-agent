/**
 * EditFileTool - 字符串替换式编辑
 * 对应 Claude Code 的 src/tools/FileEditTool/
 */
import { z } from "zod";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Tool, ToolResult, ToolContext } from "../types.js";

const inputSchema = z.object({
  path: z.string().describe("File path to edit (relative to cwd)"),
  oldStr: z.string().describe("Exact string to find and replace"),
  newStr: z.string().describe("Replacement string"),
});

type EditFileInput = z.infer<typeof inputSchema>;

export const EditFileTool: Tool<EditFileInput> = {
  name: "edit_file",
  description:
    "Edit a file by replacing an exact string match. The oldStr must match exactly one location in the file.",
  inputSchema,
  isReadOnly: false,

  async call(input: EditFileInput, context: ToolContext): Promise<ToolResult> {
    try {
      const fullPath = resolve(context.cwd, input.path);
      const content = readFileSync(fullPath, "utf-8");

      const occurrences = content.split(input.oldStr).length - 1;
      if (occurrences === 0) {
        return {
          content: "oldStr not found in file. Make sure it matches exactly.",
          isError: true,
        };
      }
      if (occurrences > 1) {
        return {
          content: `oldStr found ${occurrences} times. It must match exactly once. Add more context to make it unique.`,
          isError: true,
        };
      }

      const newContent = content.replace(input.oldStr, input.newStr);
      writeFileSync(fullPath, newContent, "utf-8");

      return { content: `Successfully edited ${input.path}` };
    } catch (err: unknown) {
      return {
        content: `Error editing file: ${(err as Error).message}`,
        isError: true,
      };
    }
  },
};
