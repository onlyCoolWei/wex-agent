import { DEFAULT_MODEL_CONFIG, loadModelEnvironment } from "@wex/model";
import { Module } from "@nestjs/common";
import { AgentConfigRegistry } from "../agents/agent-config.registry.js";
import { AgentFactory } from "./agent.factory.js";
import { AgentRuntimeService } from "./agent-runtime.service.js";
import { RunCancellationRegistry } from "./run-cancellation.registry.js";
import { SdkEventMapper } from "./sdk-event.mapper.js";
import { MODEL_CONFIG, MODEL_ENVIRONMENT } from "./tokens.js";
import { LangfuseTracingService } from "../observability/langfuse-tracing.service.js";

@Module({
  providers: [
    { provide: MODEL_ENVIRONMENT, useFactory: () => loadModelEnvironment() },
    { provide: MODEL_CONFIG, useValue: DEFAULT_MODEL_CONFIG },
    AgentConfigRegistry,
    AgentFactory,
    SdkEventMapper,
    RunCancellationRegistry,
    LangfuseTracingService,
    AgentRuntimeService,
  ],
  exports: [AgentRuntimeService],
})
export class AgentRuntimeModule {}
