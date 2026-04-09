/**
 * 核心类型定义
 * 对应 Claude Code 的 src/types/message.ts + src/Tool.ts
 */
import { z } from "zod";

// ─── 消息类型 ───────────────────────────────────────────
export type Role = "user" | "assistant" | "system";

export interface Message {
  role: Role;
  content: string | ContentBlock[];
}

export interface ContentBlock {
  type: "text" | "tool_use" | "tool_result";
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
  is_error?: boolean;
}

// ─── 工具类型 ───────────────────────────────────────────
export interface ToolResult {
  content: string;
  isError?: boolean;
}

export interface Tool<TInput = unknown> {
  /** 唯一标识 */
  name: string;
  /** 工具描述，注入到 system prompt */
  description: string;
  /** Zod schema 定义输入参数 */
  inputSchema: z.ZodType<TInput, z.ZodTypeDef, unknown>;
  /** 执行函数 */
  call(input: TInput, context: ToolContext): Promise<ToolResult>;
  /** 是否只读 */
  isReadOnly?: boolean;
}

export interface ToolContext {
  cwd: string;
  abortSignal?: AbortSignal;
}

// ─── Agentic Loop 状态 ──────────────────────────────────
export type StopReason =
  | "completed"
  | "aborted"
  | "error"
  | "max_turns";

export interface LoopState {
  messages: Message[];
  turnCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
}

export interface LoopResult {
  reason: StopReason;
  state: LoopState;
}

// ─── 配置 ────────────────────────────────────────────────
export interface AgentConfig {
  apiKey: string;
  model: string;
  maxTurns: number;
  systemPrompt: string;
  cwd: string;
}
