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

@Injectable()
export class AgentRuntimeService implements AgentRuntime {
  private readonly modelCatalog: ModelCatalog;
  private readonly providerFactory: AgentsModelProviderFactory;
  private readonly tracingEnabled: boolean;

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
  ) {
    this.modelCatalog = new ModelCatalog(modelConfig);
    this.providerFactory = new AgentsModelProviderFactory(environment);
    this.tracingEnabled = this.providerFactory.configureTracing();
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
    const signal = this.cancellationRegistry.create(input.runId);
    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      this.cancellationRegistry.cancel(input.runId, "Agent model request timed out");
    }, this.modelConfig.requestTimeoutMs);

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
        tracingDisabled: !this.tracingEnabled,
        traceIncludeSensitiveData: false,
        workflowName: "Wex coding agent run",
        groupId: input.runId,
        traceMetadata: {
          runId: input.runId,
          attemptId: input.attemptId,
          projectId: input.projectId,
          conversationId: input.conversationId,
          agentId: agentConfig.id,
          agentVersion: agentConfig.version,
          modelAlias: model.alias,
        },
      });
      const context: WexRunContext = {
        runId: input.runId,
        attemptId: input.attemptId,
        projectId: input.projectId,
        userId: input.userId,
        workspaceId: input.workspaceId,
      };
      const agent: Agent<WexRunContext> = this.agentFactory.create(agentConfig, model.alias);
      const sdkInput: AgentInputItem[] = input.input.map((item) =>
        item.role === "user"
          ? { role: "user", content: item.content }
          : {
              role: "assistant",
              status: "completed",
              content: [{ type: "output_text", text: item.content }],
            },
      );
      const result = await runner.run(agent, sdkInput, {
        stream: true,
        maxTurns: agentConfig.maxTurns,
        signal,
        context,
      });

      for await (const sdkEvent of result) {
        const mapped = this.eventMapper.map(sdkEvent, input.assistantMessageId);
        if (mapped) {
          yield event(mapped.type, mapped.payload);
        }
      }
      await result.completed;

      if (timedOut) {
        yield event("run.failed", {
          code: "MODEL_TIMEOUT",
          retryable: true,
          message: "Model gateway request timed out",
        });
        return;
      }
      if (signal.aborted || result.cancelled) {
        yield event("run.cancelled");
        return;
      }

      const content = typeof result.finalOutput === "string" ? result.finalOutput : "";
      yield event("message.completed", {
        messageId: input.assistantMessageId,
        content,
      });
      yield event("run.completed");
    } catch (error) {
      if (timedOut) {
        yield event("run.failed", {
          code: "MODEL_TIMEOUT",
          retryable: true,
          message: "Model gateway request timed out",
        });
      } else if (signal.aborted) {
        yield event("run.cancelled");
      } else {
        yield event("run.failed", mapRuntimeError(error));
      }
    } finally {
      clearTimeout(timeout);
      this.cancellationRegistry.release(input.runId);
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
