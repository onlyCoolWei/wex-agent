import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { CreateProjectRequest, ProjectListResponse, ProjectResponse } from "@wex/contracts";
import type { Database, SupabaseServerClient } from "@wex/database";
import { SUPABASE_CLIENT } from "../database/database.constants.js";

type ProjectInsert = Database["public"]["Tables"]["projects"]["Insert"];
type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];

const PROJECT_COLUMNS = "id, name, status, created_at, updated_at";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);

  constructor(
    @Inject(SUPABASE_CLIENT)
    private readonly supabase: SupabaseServerClient,
  ) {}

  async list(): Promise<ProjectListResponse> {
    const { data, error } = await this.supabase
      .from("projects")
      .select(PROJECT_COLUMNS)
      .order("created_at", { ascending: false });

    if (error) {
      this.logDatabaseError("list", error);
      throw new InternalServerErrorException("获取项目列表失败");
    }

    return data.map((project) => this.mapProject(project));
  }

  async create(body: unknown): Promise<ProjectResponse> {
    const input = this.parseCreateRequest(body);
    const project: ProjectInsert = input.name === undefined ? {} : { name: input.name };
    const { data, error } = await this.supabase
      .from("projects")
      .insert(project)
      .select(PROJECT_COLUMNS)
      .single();

    if (error) {
      this.logDatabaseError("create", error);
      throw new InternalServerErrorException("创建项目失败");
    }

    return this.mapProject(data);
  }

  async remove(projectId: string): Promise<void> {
    if (!UUID_PATTERN.test(projectId)) {
      throw new BadRequestException("项目 ID 格式无效");
    }

    const { data, error } = await this.supabase
      .from("projects")
      .delete()
      .eq("id", projectId)
      .select("id")
      .maybeSingle();

    if (error) {
      this.logDatabaseError("delete", error);
      throw new InternalServerErrorException("删除项目失败");
    }

    if (!data) {
      throw new NotFoundException("项目不存在");
    }
  }

  private parseCreateRequest(body: unknown): CreateProjectRequest {
    if (body === undefined || body === null) return {};
    if (typeof body !== "object" || Array.isArray(body)) {
      throw new BadRequestException("请求体必须是 JSON 对象");
    }

    const { name } = body as { name?: unknown };
    if (name === undefined) return {};
    if (typeof name !== "string") {
      throw new BadRequestException("项目名称必须是字符串");
    }

    const trimmedName = name.trim();
    if (trimmedName.length < 1 || trimmedName.length > 100) {
      throw new BadRequestException("项目名称长度必须为 1 到 100 个字符");
    }

    return { name: trimmedName };
  }

  private mapProject(
    project: Pick<ProjectRow, "id" | "name" | "status" | "created_at" | "updated_at">,
  ): ProjectResponse {
    return {
      id: project.id,
      name: project.name,
      status: project.status,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    };
  }

  private logDatabaseError(
    operation: "create" | "delete" | "list",
    error: { code: string; details: string | null; hint: string | null; message: string },
  ): void {
    this.logger.error(`Failed to ${operation} project`, {
      code: error.code,
      details: error.details,
      hint: error.hint,
      message: error.message,
    });
  }
}
