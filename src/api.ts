/**
 * API 通信层
 *
 * 负责与 DeepSeek API 的流式通信（OpenAI 兼容格式）
 */
import OpenAI from "openai";
import type { Message, ContentBlock, AgentConfig } from "./types.js";
import { toolsToAPIFormat, getAllTools } from "./tools/index.js";

let client: OpenAI | null = null;

function getClient(apiKey: string): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey,
      baseURL: "https://api.deepseek.com",
    });
  }
  return client;
}

export interface APIResponse {
  assistantMessage: Message;
  toolUseBlocks: ContentBlock[];
  inputTokens: number;
  outputTokens: number;
  stopReason: string | null;
}

/**
 * 将内部工具格式转为 OpenAI function calling 格式
 */
function convertTools(tools: ReturnType<typeof toolsToAPIFormat>) {
  return tools.map((t: Record<string, unknown>) => ({
    type: "function" as const,
    function: {
      name: t.name as string,
      description: t.description as string,
      parameters: t.input_schema as Record<string, unknown>,
    },
  }));
}

/**
 * 将内部消息格式转为 OpenAI API 格式
 */
function convertMessages(
  messages: Message[],
  systemPrompt: string
): OpenAI.ChatCompletionMessageParam[] {
  const result: OpenAI.ChatCompletionMessageParam[] = [];

  if (systemPrompt) {
    result.push({ role: "system", content: systemPrompt });
  }

  for (const m of messages) {
    if (m.role === "system") continue;

    if (typeof m.content === "string") {
      result.push({
        role: m.role as "user" | "assistant",
        content: m.content,
      });
      continue;
    }

    // 处理 content block 数组
    if (m.role === "assistant") {
      // assistant 消息可能包含 text + tool_use
      const textParts = m.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("");

      const toolCalls = m.content
        .filter((b) => b.type === "tool_use")
        .map((b) => ({
          id: b.id!,
          type: "function" as const,
          function: {
            name: b.name!,
            arguments: JSON.stringify(b.input),
          },
        }));

      const msg: OpenAI.ChatCompletionAssistantMessageParam = {
        role: "assistant",
        content: textParts || null,
      };
      if (toolCalls.length > 0) {
        msg.tool_calls = toolCalls;
      }
      result.push(msg);
    } else if (m.role === "user") {
      // user 消息可能包含 tool_result
      const toolResults = m.content.filter((b) => b.type === "tool_result");
      if (toolResults.length > 0) {
        for (const tr of toolResults) {
          result.push({
            role: "tool",
            tool_call_id: tr.tool_use_id!,
            content: tr.content || "",
          });
        }
      } else {
        const text = m.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("");
        result.push({ role: "user", content: text });
      }
    }
  }

  return result;
}

/**
 * 调用 DeepSeek API（流式）
 */
export async function callModel(
  config: AgentConfig,
  messages: Message[],
  onText?: (text: string) => void
): Promise<APIResponse> {
  const openai = getClient(config.apiKey);
  const tools = convertTools(toolsToAPIFormat(getAllTools()));
  const apiMessages = convertMessages(messages, config.systemPrompt);

  const stream = await openai.chat.completions.create({
    model: config.model,
    max_tokens: 8192,
    messages: apiMessages,
    tools,
    stream: true,
  });

  // 收集流式响应
  let fullText = "";
  const toolCallsMap = new Map<
    number,
    { id: string; name: string; arguments: string }
  >();

  let inputTokens = 0;
  let outputTokens = 0;
  let finishReason: string | null = null;

  for await (const chunk of stream) {
    const choice = chunk.choices?.[0];
    if (!choice) continue;

    const delta = choice.delta;

    // 文本内容
    if (delta?.content) {
      fullText += delta.content;
      onText?.(delta.content);
    }

    // tool calls（增量拼接）
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index;
        if (!toolCallsMap.has(idx)) {
          toolCallsMap.set(idx, {
            id: tc.id || "",
            name: tc.function?.name || "",
            arguments: "",
          });
        }
        const entry = toolCallsMap.get(idx)!;
        if (tc.id) entry.id = tc.id;
        if (tc.function?.name) entry.name = tc.function.name;
        if (tc.function?.arguments) entry.arguments += tc.function.arguments;
      }
    }

    if (choice.finish_reason) {
      finishReason = choice.finish_reason;
    }

    // usage 信息
    if (chunk.usage) {
      inputTokens = chunk.usage.prompt_tokens || 0;
      outputTokens = chunk.usage.completion_tokens || 0;
    }
  }

  // 构建内部格式的 content blocks
  const contentBlocks: ContentBlock[] = [];
  const toolUseBlocks: ContentBlock[] = [];

  if (fullText) {
    contentBlocks.push({ type: "text", text: fullText });
  }

  for (const [, tc] of toolCallsMap) {
    let parsedInput: Record<string, unknown> = {};
    try {
      parsedInput = JSON.parse(tc.arguments);
    } catch {
      // 解析失败时保留空对象
    }
    const toolBlock: ContentBlock = {
      type: "tool_use",
      id: tc.id,
      name: tc.name,
      input: parsedInput,
    };
    contentBlocks.push(toolBlock);
    toolUseBlocks.push(toolBlock);
  }

  // 映射 stop reason
  let stopReason: string | null = null;
  if (finishReason === "stop") stopReason = "end_turn";
  else if (finishReason === "tool_calls") stopReason = "tool_use";
  else if (finishReason === "length") stopReason = "max_tokens";
  else stopReason = finishReason;

  return {
    assistantMessage: { role: "assistant", content: contentBlocks },
    toolUseBlocks,
    inputTokens,
    outputTokens,
    stopReason,
  };
}
