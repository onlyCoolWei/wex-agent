import type { ResolvedModelSnapshot } from "@wex/contracts";
import { DEFAULT_MODEL_CONFIG, type ModelConfig } from "./model-config.js";
export type ModelRole = "coding" | "fast" | "reasoning";

export interface ModelDescriptor extends ResolvedModelSnapshot {
  role: ModelRole;
  capabilities: {
    streaming: true;
    tools: false;
    structuredOutput: false;
  };
}

export class ModelCatalog {
  constructor(private readonly config: ModelConfig = DEFAULT_MODEL_CONFIG) {}

  resolve(role: ModelRole): ModelDescriptor {
    return {
      role,
      alias: this.config.aliases[role],
      gateway: "litellm",
      configVersion: this.config.version,
      capabilities: {
        streaming: true,
        tools: false,
        structuredOutput: false,
      },
    };
  }
}
