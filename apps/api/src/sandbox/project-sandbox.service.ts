import { Injectable, Logger, OnApplicationShutdown } from "@nestjs/common";
import { DockerSandbox, type Sandbox } from "@wex/sandbox";

@Injectable()
export class ProjectSandboxService implements OnApplicationShutdown {
  private readonly logger = new Logger(ProjectSandboxService.name);
  private readonly sandboxes = new Map<string, Sandbox>();

  async create(projectId: string): Promise<void> {
    const sandbox = new DockerSandbox();
    try {
      await sandbox.createWorkspace(projectId);
      this.sandboxes.set(projectId, sandbox);
    } catch (error) {
      await sandbox.dispose();
      throw error;
    }
  }

  async dispose(projectId: string): Promise<void> {
    const sandbox = this.sandboxes.get(projectId);
    this.sandboxes.delete(projectId);
    if (sandbox) {
      await sandbox.dispose();
      return;
    }
    await new DockerSandbox().dispose(projectId);
  }

  async onApplicationShutdown(): Promise<void> {
    const sandboxes = [...this.sandboxes.entries()];
    this.sandboxes.clear();
    await Promise.all(
      sandboxes.map(async ([projectId, sandbox]) => {
        try {
          await sandbox.dispose();
        } catch (error) {
          this.logger.warn(`Failed to dispose sandbox for project ${projectId}`, error);
        }
      }),
    );
  }
}
