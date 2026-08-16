import {
  OpenAIProvider,
  setTracingExportApiKey,
  type ModelProvider as OpenAIModelProvider,
} from "@openai/agents";
import type { ModelEnvironment } from "./env.js";

export class AgentsModelProviderFactory {
  constructor(private readonly environment: ModelEnvironment) {}

  configureTracing(): boolean {
    if (!this.environment.openaiTraceApiKey) {
      return false;
    }
    setTracingExportApiKey(this.environment.openaiTraceApiKey);
    return true;
  }

  create(): OpenAIModelProvider {
    return new OpenAIProvider({
      apiKey: this.environment.litellmApiKey,
      baseURL: this.environment.litellmBaseUrl,
      useResponses: false,
      strictFeatureValidation: true,
    });
  }
}
