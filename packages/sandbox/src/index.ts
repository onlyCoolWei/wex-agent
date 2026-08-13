export interface CommandInput {
  command: string;
  cwd?: string;
  timeoutMs?: number;
}

export interface CommandResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface Workspace {
  id: string;
  root: string;
}

export interface Sandbox {
  createWorkspace(projectId: string): Promise<Workspace>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  exec(input: CommandInput): Promise<CommandResult>;
  dispose(): Promise<void>;
}

export type SandboxProvider = "docker" | "daytona" | "e2b";
