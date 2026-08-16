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
    const runtime = new AgentRuntimeService(
      environment,
      { ...DEFAULT_MODEL_CONFIG, requestTimeoutMs: 5_000 },
      new AgentConfigRegistry(),
      new AgentFactory(),
      new SdkEventMapper(),
      new RunCancellationRegistry(),
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
  });
});
