import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
} from "@nestjs/common";
import type { ProjectListResponse, ProjectResponse } from "@wex/contracts";
import { ProjectsService } from "./projects.service.js";

@Controller("projects")
export class ProjectsController {
  constructor(
    @Inject(ProjectsService)
    private readonly projectsService: ProjectsService,
  ) {}

  @Get()
  list(): Promise<ProjectListResponse> {
    return this.projectsService.list();
  }

  @Post()
  create(@Body() body?: unknown): Promise<ProjectResponse> {
    return this.projectsService.create(body);
  }

  @Delete(":projectId")
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param("projectId") projectId: string): Promise<void> {
    return this.projectsService.remove(projectId);
  }
}
