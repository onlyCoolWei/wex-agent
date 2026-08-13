import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";

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
