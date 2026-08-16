import { Module } from "@nestjs/common";
import { AgentRuntimeModule } from "./agent-runtime/agent-runtime.module.js";
import { WorkerService } from "./worker.service.js";

@Module({
  imports: [AgentRuntimeModule],
  providers: [WorkerService],
})
export class WorkerModule {}
