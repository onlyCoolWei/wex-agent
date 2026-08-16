import type { WexAgentConfig } from "./agent-config.js";

export const CODING_AGENT_CONFIG = {
  id: "coding",
  name: "Wex Coding Agent",
  version: "2026-08-16.1",
  modelRole: "fast",
  maxTurns: 80,
  instructions: [
    "You are Wex, a coding assistant.",
    "Answer the user's request directly and accurately.",
    "This initial runtime has no tools. Never claim to have changed files or run commands.",
  ],
} as const satisfies WexAgentConfig;
