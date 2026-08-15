import {
  Controller,
  Get,
  Inject,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  checkSupabaseConnection,
  type SupabaseServerClient,
} from "@wex/database";
import type {
  ArchitectureResponse,
  HealthResponse,
} from "@wex/contracts";
import { SUPABASE_CLIENT } from "./database/database.constants.js";

@Controller()
export class AppController {
  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseServerClient,
  ) {}

  @Get("health")
  getHealth(): HealthResponse {
    return {
      service: "api",
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  }

  @Get("health/database")
  async getDatabaseHealth(): Promise<{
    service: "supabase";
    status: "ok";
    latencyMs: number;
    timestamp: string;
  }> {
    const health = await checkSupabaseConnection(this.supabase);

    if (!health.connected) {
      throw new ServiceUnavailableException({
        service: "supabase",
        status: "error",
        latencyMs: health.latencyMs,
        error: health.error,
        timestamp: new Date().toISOString(),
      });
    }

    return {
      service: "supabase",
      status: "ok",
      latencyMs: health.latencyMs,
      timestamp: new Date().toISOString(),
    };
  }

  @Get("architecture")
  getArchitecture(): ArchitectureResponse {
    return {
      name: "Wex Agent",
      phase: "Monorepo foundation",
      nodes: [
        { id: "web", label: "React Web", kind: "app", status: "ready" },
        { id: "api", label: "NestJS API", kind: "app", status: "ready" },
        { id: "worker", label: "Agent Worker", kind: "app", status: "ready" },
        {
          id: "runtime",
          label: "OpenAI Agent Runtime",
          kind: "package",
          status: "planned",
        },
        {
          id: "sandbox",
          label: "Sandbox",
          kind: "package",
          status: "ready",
        },
        {
          id: "supabase",
          label: "Supabase",
          kind: "infrastructure",
          status: "ready",
        },
        {
          id: "queue",
          label: "BullMQ + Redis",
          kind: "infrastructure",
          status: "planned",
        },
      ],
    };
  }
}
