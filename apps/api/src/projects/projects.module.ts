import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { SandboxModule } from "../sandbox/sandbox.module.js";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";

@Module({
  controllers: [ProjectsController],
  imports: [DatabaseModule, SandboxModule],
  providers: [ProjectsService],
})
export class ProjectsModule {}
