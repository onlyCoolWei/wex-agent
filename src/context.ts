/**
 * 上下文构建
 * 对应 Claude Code 的 src/context.ts
 *
 * 动态组装 System Prompt，包含项目信息、工具说明等
 */
import { readFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { resolve } from "node:path";
import { getAllTools } from "./tools/index.js";

/** 尝试读取项目的 AGENT.md（类似 CLAUDE.md） */
function loadProjectMemory(cwd: string): string {
  const candidates = ["AGENT.md", "CLAUDE.md", ".agent/instructions.md"];
  for (const name of candidates) {
    const path = resolve(cwd, name);
    if (existsSync(path)) {
      try {
        return `\n<project_memory>\n${readFileSync(path, "utf-8")}\n</project_memory>`;
      } catch {
        // ignore
      }
    }
  }
  return "";
}

/** 获取 git 状态摘要 */
function getGitContext(cwd: string): string {
  try {
    const branch = execSync("git branch --show-current", {
      cwd,
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    const status = execSync("git status --short", {
      cwd,
      encoding: "utf-8",
      timeout: 3000,
    }).trim();
    const changed = status ? `\nChanged files:\n${status}` : "\nWorking tree clean.";
    return `\n<git_context>\nBranch: ${branch}${changed}\n</git_context>`;
  } catch {
    return "";
  }
}

/** 构建完整的 System Prompt */
export function buildSystemPrompt(cwd: string): string {
  const tools = getAllTools();
  const toolList = tools.map((t) => `- ${t.name}: ${t.description}`).join("\n");

  const projectMemory = loadProjectMemory(cwd);
  const gitContext = getGitContext(cwd);

  return `You are an AI coding agent. You help users with software development tasks by reading, writing, and editing files, running commands, and searching code.

<environment>
Working directory: ${cwd}
Date: ${new Date().toISOString().split("T")[0]}
</environment>

<tools_available>
${toolList}
</tools_available>
${projectMemory}${gitContext}

<guidelines>
- Always read files before editing them to understand the current state
- Use grep/glob to find relevant files before making changes
- Make minimal, targeted edits rather than rewriting entire files
- Verify your changes by reading the file after editing
- If a command fails, analyze the error and try a different approach
- Explain what you're doing and why
</guidelines>`;
}
