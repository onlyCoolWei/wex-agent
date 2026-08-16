import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";

@Injectable()
export class WorkerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkerService.name);

  onApplicationBootstrap(): void {
    this.logger.log("Worker ready; LiteLLM-backed Agent Runtime initialized");
  }
}
