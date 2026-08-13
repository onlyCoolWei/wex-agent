import { Controller, Get } from "@nestjs/common";
import type {
  ArchitectureResponse,
  HealthResponse,
} from "@wex/contracts";

@Controller()
export class AppController {
  @Get("health")
  getHealth(): HealthResponse {
    return {
      service: "api",
      status: "ok",
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
          id: "postgres",
          label: "PostgreSQL",
          kind: "infrastructure",
          status: "planned",
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
