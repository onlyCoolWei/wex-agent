import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";

@Injectable()
export class WorkerService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WorkerService.name);

  onApplicationBootstrap(): void {
    this.logger.log("Worker ready; queue adapter will be added in a later phase");
  }
}
