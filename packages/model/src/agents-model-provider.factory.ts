import { OpenAIProvider, type ModelProvider as OpenAIModelProvider } from "@openai/agents";
import type { ModelEnvironment } from "./env.js";

export class AgentsModelProviderFactory {
  constructor(private readonly environment: ModelEnvironment) {}

  create(): OpenAIModelProvider {
    return new OpenAIProvider({
      apiKey: this.environment.litellmApiKey,
      baseURL: this.environment.litellmBaseUrl,
      useResponses: false,
      strictFeatureValidation: true,
    });
  }
}
