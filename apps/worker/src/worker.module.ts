import { Module } from "@nestjs/common";
import { AgentRuntimeModule } from "./agent-runtime/agent-runtime.module.js";
import { ChatRunProcessorService } from "./chat-runs/chat-run-processor.service.js";
import { DatabaseModule } from "./database/database.module.js";
import { WorkerService } from "./worker.service.js";

@Module({
  imports: [AgentRuntimeModule, DatabaseModule],
  providers: [WorkerService, ChatRunProcessorService],
})
export class WorkerModule {}
