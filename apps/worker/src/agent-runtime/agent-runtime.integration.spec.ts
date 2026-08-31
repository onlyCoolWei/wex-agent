import type { AgentInputItem } from "@openai/agents";
import type { AgentEvent } from "@wex/contracts";
import { DEFAULT_MODEL_CONFIG, type ModelEnvironment } from "@wex/model";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";
import { AgentConfigRegistry } from "../agents/agent-config.registry.js";
import { AgentFactory } from "./agent.factory.js";
import { AgentRuntimeService } from "./agent-runtime.service.js";
import { RunCancellationRegistry } from "./run-cancellation.registry.js";
import { SdkEventMapper } from "./sdk-event.mapper.js";
import { LangfuseTracingService } from "../observability/langfuse-tracing.service.js";

class RecordingTracingService extends LangfuseTracingService {
  readonly statuses: string[] = [];
  readonly inputs: AgentInputItem[][] = [];
  readonly usages: Array<Record<string, number> | undefined> = [];

  override startRun(
    input: Parameters<LangfuseTracingService["startRun"]>[0],
    sdkInput?: AgentInputItem[],
    systemPrompt?: string,
  ) {
    if (sdkInput) {
      this.inputs.push([
        ...(systemPrompt ? [{ role: "system", content: systemPrompt } as AgentInputItem] : []),
        ...sdkInput,
      ]);
    }
    return {
      startGeneration: () => ({
        end: (_output: string, usageDetails?: Record<string, number>) => {
          this.usages.push(usageDetails);
        },
      }),
      end: (status: "completed" | "failed" | "cancelled") => {
        this.statuses.push(status);
      },
    };
  }
}

describe("AgentRuntimeService LiteLLM contract", () => {
  const requests: Array<{ url?: string; authorization?: string }> = [];
  const server = createServer((request, response) => {
    requests.push({
      url: request.url,
      authorization: request.headers.authorization,
    });

    if (request.method !== "POST" || request.url !== "/v1/chat/completions") {
      response.writeHead(404).end();
      return;
    }

    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
    });
    response.write(
      `data: ${JSON.stringify({
        id: "chatcmpl-test",
        object: "chat.completion.chunk",
        created: 1,
        model: "coding-fast",
        choices: [
          { index: 0, delta: { role: "assistant", content: "Hello" }, finish_reason: null },
        ],
      })}\n\n`,
    );
    response.write(
      `data: ${JSON.stringify({
        id: "chatcmpl-test",
        object: "chat.completion.chunk",
        created: 1,
        model: "coding-fast",
        usage: {
          prompt_tokens: 12,
          completion_tokens: 4,
          total_tokens: 16,
          prompt_tokens_details: { cached_tokens: 7 },
        },
        choices: [{ index: 0, delta: {}, finish_reason: "stop" }],
      })}\n\n`,
    );
    response.end("data: [DONE]\n\n");
  });
  let port = 0;

  before(async () => {
    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address();
        if (!address || typeof address === "string") {
          throw new Error("Test server did not bind to a TCP port");
        }
        port = address.port;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  it("uses Chat Completions and emits stable Wex events", async () => {
    const environment: ModelEnvironment = {
      litellmBaseUrl: `http://127.0.0.1:${port}/v1`,
      litellmApiKey: "worker-virtual-key",
    };
    const tracing = new RecordingTracingService();
    const runtime = new AgentRuntimeService(
      environment,
      { ...DEFAULT_MODEL_CONFIG, requestTimeoutMs: 5_000 },
      new AgentConfigRegistry(),
      new AgentFactory(),
      new SdkEventMapper(),
      new RunCancellationRegistry(),
      tracing,
    );
    const events: AgentEvent[] = [];

    for await (const event of runtime.run({
      runId: "run-test",
      attemptId: "attempt-test",
      projectId: "project-test",
      conversationId: "conversation-test",
      assistantMessageId: "message-test",
      userId: "user-test",
      workspaceId: "workspace-test",
      input: [{ role: "user", content: "Say hello" }],
    })) {
      events.push(event);
    }

    assert.equal(requests.length, 1);
    assert.deepEqual(requests[0], {
      url: "/v1/chat/completions",
      authorization: "Bearer worker-virtual-key",
    });
    assert.deepEqual(
      events.map((event) => event.type),
      ["run.started", "message.delta", "usage.updated", "message.completed", "run.completed"],
    );
    assert.equal(
      (events.find((event) => event.type === "message.completed")?.payload as { content: string })
        .content,
      "Hello",
    );
    assert.deepEqual(
      events.map((event) => event.sequence),
      [1, 2, 3, 4, 5],
    );
    assert.deepEqual(tracing.statuses, ["completed"]);
    assert.deepEqual(tracing.usages, [{ input: 5, output: 4, input_cached_tokens: 7, total: 16 }]);
    assert.deepEqual(tracing.inputs, [
      [
        {
          role: "system",
          content: [
            "你是 Wex，一个与用户对话的 AI 助手。",
            "直接、准确地回答用户，并延续当前会话上下文。",
            "当前没有任何工具、文件系统或外部访问能力。",
            "不要声称已经搜索、执行命令、修改文件或完成现实世界操作。",
            "不确定时明确说明不确定，不编造事实或执行结果。",
          ].join("\n"),
        },
        { role: "user", content: "Say hello" },
      ],
    ]);
  });
});
