import type { RunStreamEvent } from "@openai/agents";
import type { AgentEventType, MessageDeltaPayload, UsageUpdatedPayload } from "@wex/contracts";
import { Injectable } from "@nestjs/common";

export interface MappedSdkEvent {
  type: AgentEventType;
  payload: MessageDeltaPayload | UsageUpdatedPayload;
}

@Injectable()
export class SdkEventMapper {
  map(event: RunStreamEvent): MappedSdkEvent | undefined {
    if (event.type !== "raw_model_stream_event") {
      return undefined;
    }

    if (event.data.type === "output_text_delta") {
      return {
        type: "message.delta",
        payload: { delta: event.data.delta },
      };
    }

    if (event.data.type === "response_done") {
      const { inputTokens, outputTokens } = event.data.response.usage;
      return {
        type: "usage.updated",
        payload: { inputTokens, outputTokens },
      };
    }

    return undefined;
  }
}
