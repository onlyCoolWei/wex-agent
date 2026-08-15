import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export interface SupabaseConfig {
  url: string;
  key: string;
}

export type SupabaseServerClient = SupabaseClient;

export interface SupabaseHealth {
  connected: boolean;
  latencyMs: number;
  error?: string;
}

export function getSupabaseConfigFromEnv(
  env: Record<string, string | undefined>,
): SupabaseConfig {
  const url = env.SUPABASE_URL?.trim();
  const key = (env.SUPABASE_SECRET_KEY ?? env.SUPABASE_SERVICE_ROLE_KEY)?.trim();

  if (!url) {
    throw new Error("Missing SUPABASE_URL environment variable");
  }

  if (!key) {
    throw new Error(
      "Missing SUPABASE_SECRET_KEY environment variable (or legacy SUPABASE_SERVICE_ROLE_KEY)",
    );
  }

  try {
    const parsedUrl = new URL(url);
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("must use http or https");
    }
  } catch (error) {
    const detail = error instanceof Error ? `: ${error.message}` : "";
    throw new Error(`Invalid SUPABASE_URL${detail}`);
  }

  return { url, key };
}

export function createSupabaseServerClient(
  config: SupabaseConfig,
): SupabaseServerClient {
  return createClient(config.url, config.key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function checkSupabaseConnection(
  client: SupabaseServerClient,
): Promise<SupabaseHealth> {
  const startedAt = performance.now();
  const { error } = await client.rpc("health_check");
  const latencyMs = Math.round(performance.now() - startedAt);

  if (error) {
    return { connected: false, latencyMs, error: error.message };
  }

  return { connected: true, latencyMs };
}
