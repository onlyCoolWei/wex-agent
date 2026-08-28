import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module.js";
import { initializeLangfuse } from "./observability/langfuse.js";

async function bootstrap(): Promise<void> {
  initializeLangfuse();
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["log", "error", "warn"],
  });

  app.enableShutdownHooks();
  console.log("[worker] application context started");
}

void bootstrap();
