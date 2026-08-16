import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { randomUUID } from "node:crypto";
import { AgentRuntimeService } from "./agent-runtime/agent-runtime.service.js";
import { WorkerModule } from "./worker.module.js";

async function smoke(): Promise<void> {
  const prompt = process.argv.slice(2).join(" ").trim() || "Reply with: Wex runtime is ready.";
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["error", "warn"],
  });

  try {
    const runtime = app.get(AgentRuntimeService);
    const runId = randomUUID();

    for await (const event of runtime.run({
      runId,
      attemptId: randomUUID(),
      projectId: "smoke-project",
      userId: "smoke-user",
      workspaceId: "smoke-workspace",
      prompt,
      agentId: "coding",
    })) {
      console.log(JSON.stringify(event));
    }
  } finally {
    await app.close();
  }
}

void smoke();
