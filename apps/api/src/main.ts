import "reflect-metadata";
import { config } from "dotenv";
import { NestFactory } from "@nestjs/core";
import { fileURLToPath } from "node:url";
import { AppModule } from "./app.module.js";

config({
  path: fileURLToPath(new URL("../../../.env", import.meta.url)),
  quiet: true,
});

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    cors: true,
  });
  const port = Number(process.env.API_PORT ?? 3001);

  app.setGlobalPrefix("api");
  app.enableShutdownHooks();
  await app.listen(port, "0.0.0.0");

  console.log(`[api] listening on http://localhost:${port}/api`);
}

void bootstrap();
