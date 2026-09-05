import { Module } from "@nestjs/common";
import { ProjectSandboxService } from "./project-sandbox.service.js";

@Module({
  exports: [ProjectSandboxService],
  providers: [ProjectSandboxService],
})
export class SandboxModule {}
