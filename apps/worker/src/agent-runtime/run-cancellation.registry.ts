import { Injectable } from "@nestjs/common";

@Injectable()
export class RunCancellationRegistry {
  private readonly controllers = new Map<string, AbortController>();

  create(runId: string): AbortSignal {
    if (this.controllers.has(runId)) {
      throw new Error(`Agent run is already active: ${runId}`);
    }
    const controller = new AbortController();
    this.controllers.set(runId, controller);
    return controller.signal;
  }

  cancel(runId: string, reason = "Agent run cancelled by user"): boolean {
    const controller = this.controllers.get(runId);
    if (!controller) {
      return false;
    }
    controller.abort(new Error(reason));
    return true;
  }

  release(runId: string): void {
    this.controllers.delete(runId);
  }
}
