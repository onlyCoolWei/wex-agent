import { LangfuseSpanProcessor } from "@langfuse/otel";
import { NodeSDK } from "@opentelemetry/sdk-node";

let sdk: NodeSDK | undefined;

export function initializeLangfuse(env: NodeJS.ProcessEnv = process.env): void {
  if (sdk) return;
  if (!env.LANGFUSE_PUBLIC_KEY?.trim() || !env.LANGFUSE_SECRET_KEY?.trim()) return;
  sdk = new NodeSDK({
    spanProcessors: [
      new LangfuseSpanProcessor({
        publicKey: env.LANGFUSE_PUBLIC_KEY.trim(),
        secretKey: env.LANGFUSE_SECRET_KEY.trim(),
        baseUrl: env.LANGFUSE_BASE_URL?.trim() || undefined,
        environment:
          env.LANGFUSE_TRACING_ENVIRONMENT?.trim() || env.NODE_ENV?.trim() || "development",
        release: env.LANGFUSE_RELEASE?.trim() || undefined,
        shouldExportSpan: ({ otelSpan }) => otelSpan.name.startsWith("wex-"),
      }),
    ],
  });
  sdk.start();
}

export async function shutdownLangfuse(): Promise<void> {
  const activeSdk = sdk;
  sdk = undefined;
  await activeSdk?.shutdown();
}
