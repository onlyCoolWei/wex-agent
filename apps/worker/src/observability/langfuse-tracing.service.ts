import { Injectable } from "@nestjs/common";
import { startObservation } from "@langfuse/tracing";
import type { AgentInputItem } from "@openai/agents";
import type { StartAgentRunInput } from "@wex/contracts";
import { shutdownLangfuse } from "./langfuse.js";

type UsageDetails = Record<string, number>;

@Injectable()
export class LangfuseTracingService {
  startRun(
    input: StartAgentRunInput,
    sdkInput?: AgentInputItem[],
    systemPrompt?: string,
  ): {
    startGeneration: (
      model: string,
      modelVersion: string,
    ) => {
      end: (output: string, usageDetails?: UsageDetails, statusMessage?: string) => void;
    };
    end: (status: "completed" | "failed" | "cancelled", output?: string) => void;
  } {
    const traceInput = [
      ...(systemPrompt ? [{ role: "system" as const, content: systemPrompt }] : []),
      ...(sdkInput ?? input.input),
    ];
    const agent = startObservation(
      "wex-agent-run",
      {
        input: traceInput,
        metadata: {
          runId: input.runId,
          attemptId: input.attemptId,
          projectId: input.projectId,
          assistantMessageId: input.assistantMessageId,
          agentId: input.agentId ?? "main-chat",
        },
      },
      { asType: "agent" },
    );
    const traceAttributes = {
      "langfuse.trace.name": "wex-agent-run",
      "langfuse.session.id": input.conversationId,
      "langfuse.user.id": input.userId,
      "langfuse.trace.tags": ["feature:chat", "runtime:worker"],
      "langfuse.trace.metadata.run_id": input.runId,
      "langfuse.trace.metadata.attempt_id": input.attemptId,
      "langfuse.trace.metadata.project_id": input.projectId,
    };
    for (const [key, value] of Object.entries(traceAttributes)) {
      agent.otelSpan.setAttribute(key, value);
    }

    return {
      startGeneration: (model, modelVersion) => {
        const generation = agent.startObservation(
          "wex-generate-response",
          {
            input: traceInput,
            model,
            version: modelVersion,
            metadata: { agentId: input.agentId ?? "main-chat" },
            completionStartTime: new Date(),
          },
          { asType: "generation" },
        );
        for (const [key, value] of Object.entries(traceAttributes)) {
          generation.otelSpan.setAttribute(key, value);
        }
        return {
          end: (output, usageDetails, statusMessage) => {
            generation.update({
              output: { role: "assistant", content: output },
              usageDetails,
              ...(statusMessage ? { statusMessage, level: "ERROR" as const } : {}),
            });
            generation.end();
          },
        };
      },
      end: (status, output = "") => {
        agent.update({
          output: { status, content: output },
          ...(status === "failed" ? { level: "ERROR" as const } : {}),
        });
        agent.otelSpan.setAttribute("langfuse.trace.metadata.status", status);
        agent.end();
      },
    };
  }

  async onApplicationShutdown(): Promise<void> {
    await shutdownLangfuse();
  }
}
