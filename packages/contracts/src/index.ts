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
  type: AgentEventType;
  createdAt: string;
  payload: T;
}

export const AGENT_EVENT_TYPES = [
  "run.started",
  "message.delta",
  "message.completed",
  "usage.updated",
  "run.completed",
  "run.failed",
  "run.cancelled",
] as const;

export type AgentEventType = (typeof AGENT_EVENT_TYPES)[number];

export interface ResolvedModelSnapshot {
  alias: string;
  gateway: "litellm";
  provider?: string;
  upstreamModel?: string;
  configVersion: string;
}

export interface StartAgentRunInput {
  runId: string;
  attemptId: string;
  projectId: string;
  userId: string;
  workspaceId: string;
  prompt: string;
  agentId?: string;
}

export interface ResumeAgentRunInput {
  runId: string;
}

export interface SubmitApprovalInput {
  runId: string;
  approvalId: string;
  approved: boolean;
}

export type RunStartedPayload = {
  attemptId: string;
  model: ResolvedModelSnapshot;
};

export type MessageDeltaPayload = { delta: string };
export type MessageCompletedPayload = { messageId: string; content: string };
export type UsageUpdatedPayload = {
  inputTokens?: number;
  outputTokens?: number;
};
export type RunFailedPayload = {
  code: string;
  retryable: boolean;
  message: string;
};

export interface AgentRuntime {
  run(input: StartAgentRunInput): AsyncIterable<AgentEvent>;
  cancel(runId: string, reason?: string): Promise<void>;
  resume(input: ResumeAgentRunInput): AsyncIterable<AgentEvent>;
  submitApproval(input: SubmitApprovalInput): Promise<void>;
}
