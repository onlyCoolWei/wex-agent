import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module.js";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: ["log", "error", "warn"],
  });

  app.enableShutdownHooks();
  console.log("[worker] application context started");
}

void bootstrap();
