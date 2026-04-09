/**
 * Agentic Loop - 核心循环层
 * 对应 Claude Code 的 src/query.ts - queryLoop()
 *
 * 核心思想：while(true) 循环，每次迭代 = 思考 → 行动 → 观察
 * 有 tool_use 就继续，没有就终止
 */
import chalk from "chalk";
import type {
  Message,
  ContentBlock,
  LoopState,
  LoopResult,
  AgentConfig,
  ToolContext,
} from "./types.js";
import { callModel } from "./api.js";
import { findToolByName } from "./tools/index.js";

/**
 * 执行工具调用
 * 对应 Claude Code 的 runTools() / StreamingToolExecutor
 */
async function executeTools(
  toolUseBlocks: ContentBlock[],
  context: ToolContext
): Promise<ContentBlock[]> {
  const results: ContentBlock[] = [];

  for (const block of toolUseBlocks) {
    const tool = findToolByName(block.name!);
    if (!tool) {
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: `Unknown tool: ${block.name}`,
        is_error: true,
      });
      continue;
    }

    console.log(chalk.cyan(`  ⚡ ${tool.name}`), chalk.dim(JSON.stringify(block.input).slice(0, 80)));

    try {
      // 校验输入
      const parsed = tool.inputSchema.safeParse(block.input);
      if (!parsed.success) {
        results.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: `Invalid input: ${parsed.error.message}`,
          is_error: true,
        });
        continue;
      }

      // 执行工具
      const result = await tool.call(parsed.data, context);

      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result.content,
        is_error: result.isError,
      });

      // 简短显示结果
      const preview = result.content.slice(0, 120).replace(/\n/g, " ");
      if (result.isError) {
        console.log(chalk.red(`    ✗ ${preview}`));
      } else {
        console.log(chalk.green(`    ✓ ${preview}`));
      }
    } catch (err: unknown) {
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: `Tool execution error: ${(err as Error).message}`,
        is_error: true,
      });
    }
  }

  return results;
}

/**
 * Agentic Loop 主函数
 *
 * 这是整个 agent 的核心：一个 while(true) 循环
 * 每次迭代：
 *   1. 调用 API（带上所有历史消息）
 *   2. 如果 AI 返回 tool_use → 执行工具 → 结果追加到消息 → continue
 *   3. 如果 AI 返回纯文本 → 终止循环
 */
export async function agenticLoop(
  config: AgentConfig,
  userMessage: string,
  existingMessages: Message[] = []
): Promise<LoopResult> {
  const state: LoopState = {
    messages: [
      ...existingMessages,
      { role: "user", content: userMessage },
    ],
    turnCount: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
  };

  const toolContext: ToolContext = { cwd: config.cwd };

  // ─── while(true) Agentic Loop ─────────────────────────
  while (true) {
    state.turnCount++;

    // 安全阀：防止无限循环
    if (state.turnCount > config.maxTurns) {
      console.log(chalk.yellow(`\n⚠ Reached max turns (${config.maxTurns})`));
      return { reason: "max_turns", state };
    }

    // ① 调用 API
    let response;
    try {
      response = await callModel(config, state.messages, (text) => {
        process.stdout.write(text);
      });
    } catch (err: unknown) {
      console.error(chalk.red(`\nAPI Error: ${(err as Error).message}`));
      return { reason: "error", state };
    }

    // 累计 token 用量
    state.totalInputTokens += response.inputTokens;
    state.totalOutputTokens += response.outputTokens;

    // ② 将 assistant 消息追加到历史
    state.messages.push(response.assistantMessage);

    // ③ 判断：有 tool_use 吗？
    if (response.toolUseBlocks.length === 0) {
      // 没有工具调用 → AI 完成了，终止循环
      console.log(""); // 换行
      return { reason: "completed", state };
    }

    // ④ 有 tool_use → 执行工具
    console.log(""); // 流式文本后换行
    const toolResults = await executeTools(response.toolUseBlocks, toolContext);

    // ⑤ 将工具结果追加到消息 → 进入下一轮迭代
    state.messages.push({
      role: "user",
      content: toolResults,
    });

    // continue → 回到 while(true) 顶部
  }
}
