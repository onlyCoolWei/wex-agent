import type {
  ConversationListResponse,
  ConversationResponse,
  CreateConversationRequest,
  CreateProjectRequest,
  MessageListResponse,
  ProjectListResponse,
  ProjectResponse,
  SendMessageRequest,
  SendMessageResponse,
} from "@wex/contracts";

const API_BASE_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

function isProjectResponse(value: unknown): value is ProjectResponse {
  if (typeof value !== "object" || value === null) return false;

  const project = value as Record<string, unknown>;
  return (
    typeof project.id === "string" &&
    typeof project.name === "string" &&
    (project.status === "active" || project.status === "archived") &&
    typeof project.createdAt === "string" &&
    typeof project.updatedAt === "string"
  );
}

export async function createProject(input: CreateProjectRequest = {}): Promise<ProjectResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error("创建项目失败");
  }

  const project: unknown = await response.json();
  if (!isProjectResponse(project)) {
    throw new Error("创建项目响应格式无效");
  }

  return project;
}

export async function listProjects(signal?: AbortSignal): Promise<ProjectListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/projects`, { signal });

  if (!response.ok) {
    throw new Error("获取项目列表失败");
  }

  const projects: unknown = await response.json();
  if (!Array.isArray(projects) || !projects.every(isProjectResponse)) {
    throw new Error("项目列表响应格式无效");
  }

  return projects;
}

export async function deleteProject(projectId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("删除项目失败");
  }
}

export async function listConversations(projectId: string): Promise<ConversationListResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/conversations`,
  );
  if (!response.ok) throw new Error("获取会话失败");
  return (await response.json()) as ConversationListResponse;
}

export async function createConversation(
  projectId: string,
  input: CreateConversationRequest = {},
): Promise<ConversationResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/projects/${encodeURIComponent(projectId)}/conversations`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) throw new Error("创建会话失败");
  return (await response.json()) as ConversationResponse;
}

export async function listMessages(conversationId: string): Promise<MessageListResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${encodeURIComponent(conversationId)}/messages`,
  );
  if (!response.ok) throw new Error("获取消息失败");
  return (await response.json()) as MessageListResponse;
}

export async function sendMessage(
  conversationId: string,
  input: SendMessageRequest,
): Promise<SendMessageResponse> {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": input.clientMessageId,
      },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message ?? "发送消息失败");
  }
  return (await response.json()) as SendMessageResponse;
}

export function getAgentRunEventsUrl(runId: string): string {
  return `${API_BASE_URL}/api/agent-runs/${encodeURIComponent(runId)}/events`;
}
