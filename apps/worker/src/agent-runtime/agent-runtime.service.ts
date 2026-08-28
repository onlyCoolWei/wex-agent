import { Agent, Runner, type AgentInputItem } from "@openai/agents";
import type {
  AgentEvent,
  AgentEventType,
  AgentRuntime,
  ResumeAgentRunInput,
  StartAgentRunInput,
  SubmitApprovalInput,
} from "@wex/contracts";
import {
  AgentsModelProviderFactory,
  ModelCatalog,
  type ModelConfig,
  type ModelEnvironment,
} from "@wex/model";
import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AgentConfigRegistry } from "../agents/agent-config.registry.js";
import { AgentFactory, type WexRunContext } from "./agent.factory.js";
import { RunCancellationRegistry } from "./run-cancellation.registry.js";
import { mapRuntimeError } from "./runtime-error.mapper.js";
import { SdkEventMapper } from "./sdk-event.mapper.js";
import { MODEL_CONFIG, MODEL_ENVIRONMENT } from "./tokens.js";
import { LangfuseTracingService } from "../observability/langfuse-tracing.service.js";

@Injectable()
export class AgentRuntimeService implements AgentRuntime {
  private readonly modelCatalog: ModelCatalog;
  private readonly providerFactory: AgentsModelProviderFactory;

  constructor(
    @Inject(MODEL_ENVIRONMENT) environment: ModelEnvironment,
    @Inject(MODEL_CONFIG) private readonly modelConfig: ModelConfig,
    @Inject(AgentConfigRegistry)
    private readonly agentConfigRegistry: AgentConfigRegistry,
    @Inject(AgentFactory)
    private readonly agentFactory: AgentFactory,
    @Inject(SdkEventMapper)
    private readonly eventMapper: SdkEventMapper,
    @Inject(RunCancellationRegistry)
    private readonly cancellationRegistry: RunCancellationRegistry,
    @Inject(LangfuseTracingService)
    private readonly tracing: LangfuseTracingService,
  ) {
    this.modelCatalog = new ModelCatalog(modelConfig);
    this.providerFactory = new AgentsModelProviderFactory(environment);
  }

  async *run(input: StartAgentRunInput): AsyncIterable<AgentEvent> {
    let sequence = 0;
    const event = (type: AgentEventType, payload: unknown = {}): AgentEvent => ({
      id: randomUUID(),
      runId: input.runId,
      sequence: ++sequence,
      type,
      createdAt: new Date().toISOString(),
      payload,
    });
    const agentConfig = this.agentConfigRegistry.get(input.agentId);
    const model = this.modelCatalog.resolve(agentConfig.modelRole);
    const sdkInput: AgentInputItem[] = input.input.map((item) =>
      item.role === "user"
        ? { role: "user", content: item.content }
        : {
            role: "assistant",
            status: "completed",
            content: [{ type: "output_text", text: item.content }],
          },
    );
    const signal = this.cancellationRegistry.create(input.runId);
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      this.cancellationRegistry.cancel(input.runId, "Agent model request timed out");
    }, this.modelConfig.requestTimeoutMs);
    const trace = this.tracing.startRun(input, sdkInput);
    const generation = trace.startGeneration(model.alias, model.configVersion);
    let output = "";
    let usageDetails: Record<string, number> | undefined;
    let generationStatusMessage: string | undefined;
    let traceStatus: "completed" | "failed" | "cancelled" = "failed";

    yield event("run.started", {
      attemptId: input.attemptId,
      model: {
        alias: model.alias,
        gateway: model.gateway,
        configVersion: model.configVersion,
      },
    });

    try {
      const runner = new Runner({
        modelProvider: this.providerFactory.create(),
        tracingDisabled: true,
      });
      const context: WexRunContext = {
        runId: input.runId,
        attemptId: input.attemptId,
        projectId: input.projectId,
        userId: input.userId,
        workspaceId: input.workspaceId,
      };
      const agent: Agent<WexRunContext> = this.agentFactory.create(agentConfig, model.alias);
      const result = await runner.run(agent, sdkInput, {
        stream: true,
        maxTurns: agentConfig.maxTurns,
        signal,
        context,
      });

      for await (const sdkEvent of result) {
        const mapped = this.eventMapper.map(sdkEvent, input.assistantMessageId);
        if (mapped) {
          if (mapped.type === "message.delta") {
            output += (mapped.payload as { delta: string }).delta;
          } else if (mapped.type === "message.completed") {
            output = (mapped.payload as { content: string }).content;
          } else if (mapped.type === "usage.updated") {
            const usage = mapped.payload as { inputTokens: number; outputTokens: number };
            usageDetails = {
              input: usage.inputTokens,
              output: usage.outputTokens,
              total: usage.inputTokens + usage.outputTokens,
            };
          }
          yield event(mapped.type, mapped.payload);
        }
      }
      await result.completed;

      if (timedOut) {
        generationStatusMessage = "MODEL_TIMEOUT";
        yield event("run.failed", {
          code: "MODEL_TIMEOUT",
          retryable: true,
          message: "Model gateway request timed out",
        });
        return;
      }
      if (signal.aborted || result.cancelled) {
        traceStatus = "cancelled";
        yield event("run.cancelled");
        return;
      }

      const content = typeof result.finalOutput === "string" ? result.finalOutput : "";
      output = content;
      yield event("message.completed", {
        messageId: input.assistantMessageId,
        content,
      });
      traceStatus = "completed";
      yield event("run.completed");
    } catch (error) {
      if (timedOut) {
        generationStatusMessage = "MODEL_TIMEOUT";
        yield event("run.failed", {
          code: "MODEL_TIMEOUT",
          retryable: true,
          message: "Model gateway request timed out",
        });
      } else if (signal.aborted) {
        traceStatus = "cancelled";
        yield event("run.cancelled");
      } else {
        const mappedError = mapRuntimeError(error);
        generationStatusMessage = mappedError.code;
        yield event("run.failed", mappedError);
      }
    } finally {
      clearTimeout(timeout);
      this.cancellationRegistry.release(input.runId);
      generation.end(output, usageDetails, generationStatusMessage);
      trace.end(traceStatus, output);
    }
  }

  async cancel(runId: string, reason?: string): Promise<void> {
    this.cancellationRegistry.cancel(runId, reason);
  }

  async *resume(_input: ResumeAgentRunInput): AsyncIterable<AgentEvent> {
    throw new Error("Agent run resume is not supported until checkpoints are implemented");
  }

  async submitApproval(_input: SubmitApprovalInput): Promise<void> {
    throw new Error("Agent approvals are not supported in the Phase 1 runtime");
  }
}
