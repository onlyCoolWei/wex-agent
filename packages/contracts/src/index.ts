export const AGENT_RUN_STATUSES = [
  "queued",
  "running",
  "cancelling",
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

export type MessageContentV1 = {
  schemaVersion: 1;
  parts: [{ type: "text"; text: string }];
};

export type ConversationStatus = "active" | "archived";

export interface ConversationResponse {
  id: string;
  projectId: string;
  title: string;
  status: ConversationStatus;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateConversationRequest {
  title?: string;
}

export type ConversationListResponse = ConversationResponse[];

export type ChatMessageRole = "user" | "assistant";
export type ChatMessageStatus = "streaming" | "completed" | "failed" | "cancelled";

export interface ChatMessageResponse {
  id: string;
  conversationId: string;
  runId: string | null;
  clientMessageId: string | null;
  role: ChatMessageRole;
  status: ChatMessageStatus;
  content: MessageContentV1;
  position: number;
  error: { code: string; message: string } | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AgentRunResponse {
  id: string;
  conversationId: string;
  userMessageId: string;
  assistantMessageId: string;
  status: AgentRunStatus;
  modelAlias: string;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface MessageListResponse {
  items: ChatMessageResponse[];
  nextBefore: number | null;
  activeRun: AgentRunResponse | null;
}

export interface SendMessageRequest {
  clientMessageId: string;
  content: MessageContentV1;
}

export interface SendMessageResponse {
  userMessage: ChatMessageResponse;
  assistantMessage: ChatMessageResponse;
  run: AgentRunResponse;
  eventsUrl: string;
}

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
  conversationId: string;
  assistantMessageId: string;
  userId: string;
  workspaceId: string;
  input: ConversationInputItem[];
  agentId?: string;
}

export interface ConversationInputItem {
  role: ChatMessageRole;
  content: string;
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

export type MessageDeltaPayload = { messageId: string; delta: string };
export type MessageCompletedPayload = { messageId: string; content: string };
export type UsageUpdatedPayload = {
  inputTokens?: number;
  outputTokens?: number;
  cachedInputTokens?: number;
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
