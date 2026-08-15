import type { CreateProjectRequest, ProjectListResponse, ProjectResponse } from "@wex/contracts";

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
