export interface DatabaseConfig {
  url: string;
  ssl: boolean;
}

export function defineDatabaseConfig(config: DatabaseConfig): DatabaseConfig {
  return config;
}
