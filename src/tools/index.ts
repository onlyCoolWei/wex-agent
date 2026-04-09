/**
 * 工具注册表
 * 对应 Claude Code 的 src/tools.ts - getAllBaseTools()
 *
 * 设计原则：每次调用时组装（非全局缓存），因为工具的 isEnabled 可能随运行时变化
 */
import type { Tool } from "../types.js";
import { ReadFileTool } from "./read-file.js";
import { WriteFileTool } from "./write-file.js";
import { EditFileTool } from "./edit-file.js";
import { BashTool } from "./bash.js";
import { GrepTool } from "./grep.js";
import { GlobTool } from "./glob.js";

/** 获取所有可用工具 */
export function getAllTools(): Tool[] {
  return [ReadFileTool, WriteFileTool, EditFileTool, BashTool, GrepTool, GlobTool];
}

/** 按名称查找工具 */
export function findToolByName(name: string): Tool | undefined {
  return getAllTools().find((t) => t.name === name);
}

/** 将工具列表转为 Anthropic API 格式 */
export function toolsToAPIFormat(tools: Tool[]) {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: zodToJsonSchema(tool.inputSchema),
  }));
}

/**
 * 简易 Zod → JSON Schema 转换
 * 生产环境建议用 zod-to-json-schema 库
 */
function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  // zod 的 _def 包含 schema 定义信息
  const def = (schema as { _def?: { typeName?: string; shape?: () => Record<string, unknown> } })._def;
  if (!def) return { type: "object" };

  if (def.typeName === "ZodObject") {
    const shape = def.shape?.() ?? {};
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      const fieldDef = (value as { _def?: { typeName?: string; description?: string; innerType?: unknown } })._def;
      if (!fieldDef) continue;

      const isOptional = fieldDef.typeName === "ZodOptional" || fieldDef.typeName === "ZodDefault";
      const innerDef = isOptional
        ? (fieldDef.innerType as { _def?: { typeName?: string; description?: string } })?._def
        : fieldDef;

      const prop: Record<string, unknown> = {};
      const typeName = innerDef?.typeName;
      if (typeName === "ZodString") prop.type = "string";
      else if (typeName === "ZodNumber") prop.type = "number";
      else if (typeName === "ZodBoolean") prop.type = "boolean";
      else prop.type = "string";

      if (fieldDef.description) prop.description = fieldDef.description;
      if (innerDef?.description) prop.description = innerDef.description;

      properties[key] = prop;
      if (!isOptional) required.push(key);
    }

    return { type: "object", properties, required };
  }

  return { type: "object" };
}
