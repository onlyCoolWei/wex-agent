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

const validModelEnv: NodeJS.ProcessEnv = {
  LITELLM_BASE_URL: "http://localhost:4000/v1",
  LITELLM_API_KEY: "virtual-key",
  OPENAI_TRACE_API_KEY: "trace-key",
};

describe("model environment and catalog", () => {
  it("resolves stable aliases without upstream provider details", () => {
    const model = new ModelCatalog().resolve("fast");

    assert.deepEqual(model, {
      role: "fast",
      alias: "coding-fast",
      gateway: "litellm",
      configVersion: "2026-08-16.1",
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

  it("keeps tracing optional and separate from the model provider", () => {
    const environment = loadModelEnvironment({
      ...validModelEnv,
      OPENAI_TRACE_API_KEY: "",
    });
    const factory = new AgentsModelProviderFactory(environment);

    assert.equal(factory.configureTracing(), false);
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
    } as RunStreamEvent;

    assert.deepEqual(mapper.map(sdkEvent), {
      type: "message.delta",
      payload: { delta: "hello" },
    });
  });

  it("maps usage and tolerates unknown events", () => {
    const usageEvent = {
      type: "raw_model_stream_event",
      data: {
        type: "response_done",
        response: { usage: { inputTokens: 12, outputTokens: 4 } },
      },
    } as RunStreamEvent;
    const unknownEvent = {
      type: "agent_updated_stream_event",
    } as RunStreamEvent;

    assert.deepEqual(mapper.map(usageEvent), {
      type: "usage.updated",
      payload: { inputTokens: 12, outputTokens: 4 },
    });
    assert.equal(mapper.map(unknownEvent), undefined);
  });
});

describe("runtime failures and cancellation", () => {
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
