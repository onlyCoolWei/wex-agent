import type { RunStreamEvent } from "@openai/agents";
import type { AgentEventType, MessageDeltaPayload, UsageUpdatedPayload } from "@wex/contracts";
import { Injectable } from "@nestjs/common";

export interface MappedSdkEvent {
  type: AgentEventType;
  payload: MessageDeltaPayload | UsageUpdatedPayload;
}

@Injectable()
export class SdkEventMapper {
  map(event: RunStreamEvent, messageId: string): MappedSdkEvent | undefined {
    if (event.type !== "raw_model_stream_event") {
      return undefined;
    }

    if (event.data.type === "output_text_delta") {
      return {
        type: "message.delta",
        payload: { messageId, delta: event.data.delta },
      };
    }

    if (event.data.type === "response_done") {
      const usage = event.data.response.usage as unknown as Record<string, unknown>;
      const inputTokens = this.numberValue(usage, "inputTokens", "input_tokens");
      const outputTokens = this.numberValue(usage, "outputTokens", "output_tokens");
      const cachedInputTokens = this.readCachedInputTokens(usage);
      return {
        type: "usage.updated",
        payload: {
          inputTokens,
          outputTokens,
          ...(cachedInputTokens !== undefined ? { cachedInputTokens } : {}),
        },
      };
    }

    return undefined;
  }

  private numberValue(value: Record<string, unknown>, ...keys: string[]): number | undefined {
    for (const key of keys) {
      if (typeof value[key] === "number") return value[key];
    }
    return undefined;
  }

  private readCachedInputTokens(usage: Record<string, unknown>): number | undefined {
    const direct = this.numberValue(usage, "cachedInputTokens", "cached_input_tokens");
    if (direct !== undefined) return direct;

    for (const key of [
      "inputTokensDetails",
      "input_tokens_details",
      "promptTokensDetails",
      "prompt_tokens_details",
    ]) {
      const details = usage[key];
      if (details && typeof details === "object" && !Array.isArray(details)) {
        const cached = this.numberValue(
          details as Record<string, unknown>,
          "cachedTokens",
          "cached_tokens",
        );
        if (cached !== undefined) return cached;
      }
    }
    return undefined;
  }
}
