import type { RunStreamEvent } from "@openai/agents";
import {
  AgentsModelProviderFactory,
  DEFAULT_MODEL_CONFIG,
  loadModelEnvironment,
  ModelCatalog,
} from "@wex/model";
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { RunCancellationRegistry } from "./run-cancellation.registry.js";
import { mapRuntimeError } from "./runtime-error.mapper.js";
import { SdkEventMapper } from "./sdk-event.mapper.js";
import { LangfuseTracingService } from "../observability/langfuse-tracing.service.js";

const validModelEnv: NodeJS.ProcessEnv = {
  LITELLM_BASE_URL: "http://localhost:4000/v1",
  LITELLM_API_KEY: "virtual-key",
  LANGFUSE_PUBLIC_KEY: "pk-lf-test",
  LANGFUSE_SECRET_KEY: "sk-lf-test",
};

describe("model environment and catalog", () => {
  it("resolves stable aliases without upstream provider details", () => {
    const model = new ModelCatalog().resolve("chat");

    assert.deepEqual(model, {
      role: "chat",
      alias: "gpt-5.6-luna",
      gateway: "litellm",
      configVersion: "2026-08-16.2",
      capabilities: {
        streaming: true,
        tools: false,
        structuredOutput: false,
      },
    });
  });

  it("rejects gateway URLs that do not point to /v1", () => {
    assert.throws(
      () =>
        loadModelEnvironment({
          ...validModelEnv,
          LITELLM_BASE_URL: "http://localhost:4000",
        }),
      /\/v1 API root/,
    );
  });

  it("keeps Langfuse configuration optional and separate from the model provider", () => {
    const environment = loadModelEnvironment({
      ...validModelEnv,
      LANGFUSE_PUBLIC_KEY: "",
      LANGFUSE_SECRET_KEY: "",
    });
    const factory = new AgentsModelProviderFactory(environment);

    assert.ok(factory.create());
  });
});

describe("model configuration", () => {
  it("keeps gateway timeout outside environment variables", () => {
    assert.equal(DEFAULT_MODEL_CONFIG.requestTimeoutMs, 120_000);
  });
});

describe("SDK event mapping", () => {
  const mapper = new SdkEventMapper();

  it("maps text deltas", () => {
    const sdkEvent = {
      type: "raw_model_stream_event",
      data: { type: "output_text_delta", delta: "hello" },
    } as unknown as RunStreamEvent;

    assert.deepEqual(mapper.map(sdkEvent, "message-1"), {
      type: "message.delta",
      payload: { messageId: "message-1", delta: "hello" },
    });
  });

  it("maps usage and tolerates unknown events", () => {
    const usageEvent = {
      type: "raw_model_stream_event",
      data: {
        type: "response_done",
        response: {
          usage: {
            inputTokens: 12,
            outputTokens: 4,
            inputTokensDetails: { cachedTokens: 5 },
          },
        },
      },
    } as unknown as RunStreamEvent;
    const unknownEvent = {
      type: "agent_updated_stream_event",
    } as RunStreamEvent;

    assert.deepEqual(mapper.map(usageEvent, "message-1"), {
      type: "usage.updated",
      payload: { inputTokens: 12, outputTokens: 4, cachedInputTokens: 5 },
    });
    assert.equal(mapper.map(unknownEvent, "message-1"), undefined);
  });
});

describe("runtime failures and cancellation", () => {
  it("ends tracing spans with the cancellation terminal state", () => {
    const tracing = new LangfuseTracingService();
    const run = tracing.startRun({
      runId: "run-1",
      attemptId: "attempt-1",
      projectId: "project-1",
      conversationId: "conversation-1",
      assistantMessageId: "message-1",
      userId: "user-1",
      workspaceId: "workspace-1",
      input: [],
    });
    assert.doesNotThrow(() => run.end("cancelled"));
  });

  it("records the configured system prompt in the trace input", () => {
    const tracing = new LangfuseTracingService();
    const run = tracing.startRun(
      {
        runId: "run-1",
        attemptId: "attempt-1",
        projectId: "project-1",
        conversationId: "conversation-1",
        assistantMessageId: "message-1",
        userId: "user-1",
        workspaceId: "workspace-1",
        input: [{ role: "user", content: "hello" }],
      },
      undefined,
      "You are Wex.",
    );

    assert.doesNotThrow(() => run.end("completed"));
  });

  it("maps gateway failures to stable safe codes", () => {
    const rateLimit = Object.assign(new Error("provider secret response"), {
      status: 429,
    });
    assert.deepEqual(mapRuntimeError(rateLimit), {
      code: "MODEL_RATE_LIMITED",
      retryable: true,
      message: "Model gateway rate limit exceeded",
    });

    assert.deepEqual(mapRuntimeError(new Error("fetch failed: ECONNREFUSED")), {
      code: "MODEL_BAD_RESPONSE",
      retryable: true,
      message: "Model gateway is unavailable",
    });
  });

  it("aborts and releases active runs", () => {
    const registry = new RunCancellationRegistry();
    const signal = registry.create("run-1");

    assert.equal(registry.cancel("run-1"), true);
    assert.equal(signal.aborted, true);
    registry.release("run-1");
    assert.equal(registry.cancel("run-1"), false);
  });
});
