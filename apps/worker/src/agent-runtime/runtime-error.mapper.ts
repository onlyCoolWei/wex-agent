import type { RunFailedPayload } from "@wex/contracts";

type ErrorWithStatus = Error & { status?: number; code?: string };

export function mapRuntimeError(error: unknown): RunFailedPayload {
  const candidate = error instanceof Error ? (error as ErrorWithStatus) : undefined;
  const message = candidate?.message || "Agent run failed";
  const normalized = `${candidate?.name ?? ""} ${candidate?.code ?? ""} ${message}`.toLowerCase();

  if (candidate?.status === 401 || candidate?.status === 403) {
    return failure("MODEL_AUTH_FAILED", false, "Model gateway authentication failed");
  }
  if (candidate?.status === 429 || normalized.includes("rate limit")) {
    return failure("MODEL_RATE_LIMITED", true, "Model gateway rate limit exceeded");
  }
  if (normalized.includes("maxturn") || normalized.includes("max turn")) {
    return failure("RUN_MAX_TURNS_EXCEEDED", false, "Agent run exceeded its turn limit");
  }
  if (normalized.includes("timeout") || normalized.includes("timed out")) {
    return failure("MODEL_TIMEOUT", true, "Model gateway request timed out");
  }
  if (
    normalized.includes("connection") ||
    normalized.includes("fetch failed") ||
    normalized.includes("econnrefused") ||
    normalized.includes("enotfound")
  ) {
    return failure("MODEL_BAD_RESPONSE", true, "Model gateway is unavailable");
  }
  if (normalized.includes("context") && normalized.includes("length")) {
    return failure("MODEL_CONTEXT_EXCEEDED", false, "Model context limit exceeded");
  }
  if (normalized.includes("unsupported") || normalized.includes("not supported")) {
    return failure(
      "MODEL_CAPABILITY_UNSUPPORTED",
      false,
      "The selected model does not support a required capability",
    );
  }
  if (candidate?.status !== undefined && candidate.status >= 500) {
    return failure("MODEL_BAD_RESPONSE", true, "Model gateway returned an invalid response");
  }

  return failure("INTERNAL_ERROR", false, "Agent run failed unexpectedly");
}

function failure(code: string, retryable: boolean, message: string): RunFailedPayload {
  return { code, retryable, message };
}
