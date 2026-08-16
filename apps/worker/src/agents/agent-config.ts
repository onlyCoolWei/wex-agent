import type { ModelRole } from "@wex/model";

export interface WexAgentConfig {
  id: string;
  name: string;
  version: string;
  modelRole: ModelRole;
  maxTurns: number;
  instructions: readonly string[];
}
