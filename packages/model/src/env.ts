export interface ModelEnvironment {
  litellmBaseUrl: string;
  litellmApiKey: string;
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parseLiteLlmBaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("LITELLM_BASE_URL must be an absolute HTTP(S) URL");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("LITELLM_BASE_URL must use HTTP or HTTPS");
  }
  if (url.pathname.replace(/\/$/, "") !== "/v1") {
    throw new Error("LITELLM_BASE_URL must point to the LiteLLM /v1 API root");
  }
  return url.toString().replace(/\/$/, "");
}

export function loadModelEnvironment(env: NodeJS.ProcessEnv = process.env): ModelEnvironment {
  return {
    litellmBaseUrl: parseLiteLlmBaseUrl(required(env, "LITELLM_BASE_URL")),
    litellmApiKey: required(env, "LITELLM_API_KEY"),
  };
}
