import { Module } from "@nestjs/common";
import { DatabaseModule } from "../database/database.module.js";
import { ProjectsController } from "./projects.controller.js";
import { ProjectsService } from "./projects.service.js";

@Module({
  controllers: [ProjectsController],
  imports: [DatabaseModule],
  providers: [ProjectsService],
})
export class ProjectsModule {}
