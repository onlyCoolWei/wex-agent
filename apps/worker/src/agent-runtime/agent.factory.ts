import { Agent } from "@openai/agents";
import { Injectable } from "@nestjs/common";
import type { WexAgentConfig } from "../agents/agent-config.js";

export interface WexRunContext {
  runId: string;
  attemptId: string;
  projectId: string;
  userId: string;
  workspaceId: string;
}

@Injectable()
export class AgentFactory {
  create(config: WexAgentConfig, model: string): Agent<WexRunContext> {
    return new Agent<WexRunContext>({
      name: config.name,
      model,
      instructions: config.instructions.join("\n"),
    });
  }
}
