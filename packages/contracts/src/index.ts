export const AGENT_RUN_STATUSES = [
  "queued",
  "running",
  "waiting_for_approval",
  "interrupted",
  "completed",
  "failed",
  "cancelled",
] as const;

export type AgentRunStatus = (typeof AGENT_RUN_STATUSES)[number];

export interface HealthResponse {
  service: "api" | "worker";
  status: "ok";
  timestamp: string;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  kind: "app" | "package" | "infrastructure";
  status: "ready" | "planned";
}

export interface ArchitectureResponse {
  name: string;
  phase: string;
  nodes: ArchitectureNode[];
}

export interface CreateProjectRequest {
  name?: string;
}

export interface ProjectResponse {
  id: string;
  name: string;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export type ProjectListResponse = ProjectResponse[];

export interface AgentEvent<T = unknown> {
  id: string;
  runId: string;
  sequence: number;
  type: string;
  createdAt: string;
  payload: T;
}
