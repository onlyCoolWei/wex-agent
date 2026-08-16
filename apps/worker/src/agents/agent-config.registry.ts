import { Injectable } from "@nestjs/common";
import type { WexAgentConfig } from "./agent-config.js";
import { CODING_AGENT_CONFIG } from "./coding-agent.config.js";
import { MAIN_CHAT_AGENT_CONFIG } from "./main-chat-agent.config.js";

@Injectable()
export class AgentConfigRegistry {
  private readonly configs = new Map<string, WexAgentConfig>([
    [MAIN_CHAT_AGENT_CONFIG.id, MAIN_CHAT_AGENT_CONFIG],
    [CODING_AGENT_CONFIG.id, CODING_AGENT_CONFIG],
  ]);

  get(agentId: string = MAIN_CHAT_AGENT_CONFIG.id): WexAgentConfig {
    const config = this.configs.get(agentId);
    if (!config) {
      throw new Error(`Unknown agent configuration: ${agentId}`);
    }
    return config;
  }
}
