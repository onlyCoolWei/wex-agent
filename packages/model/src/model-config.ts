import type { ModelRole } from "./model-catalog.js";

export interface ModelConfig {
  version: string;
  aliases: Record<ModelRole, string>;
  requestTimeoutMs: number;
}

export const DEFAULT_MODEL_CONFIG: ModelConfig = {
  version: "2026-08-16.1",
  aliases: {
    coding: "coding-primary",
    fast: "coding-fast",
    reasoning: "reasoning-primary",
  },
  requestTimeoutMs: 120_000,
};
