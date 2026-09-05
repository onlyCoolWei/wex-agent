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
  dispose(projectId?: string): Promise<void>;
}

export type SandboxProvider = "docker" | "daytona" | "e2b";

export interface DockerSandboxOptions {
  image?: string;
  memoryMb?: number;
  cpus?: number;
  pidsLimit?: number;
  defaultTimeoutMs?: number;
  allowNetwork?: boolean;
}

export class DockerSandbox implements Sandbox {
  private workspace?: Workspace;
  private readonly options: DockerSandboxOptions;
  private readonly dockerBinary: string;

  public constructor(options: DockerSandboxOptions = {}, dockerBinary = "docker") {
    this.options = options;
    this.dockerBinary = dockerBinary;
  }

  public async createWorkspace(projectId: string): Promise<Workspace> {
    if (this.workspace) return this.workspace;

    const name = this.containerName(projectId);
    const existingProjectId = await this.inspectProjectId(name);
    if (existingProjectId !== undefined) {
      if (existingProjectId !== projectId) {
        throw new Error(`Sandbox container ${name} belongs to another project`);
      }
      this.workspace = { id: name, root: "/workspace" };
      return this.workspace;
    }

    const args = [
      "run",
      "-d",
      "--rm",
      "--init",
      "--name",
      name,
      "--cpus",
      String(this.options.cpus ?? 1),
      "--memory",
      `${this.options.memoryMb ?? 1024}m`,
      "--pids-limit",
      String(this.options.pidsLimit ?? 128),
      "--label",
      "wex.sandbox=true",
      "--label",
      `wex.project-id=${projectId}`,
    ];
    if (!this.options.allowNetwork) args.push("--network", "none");
    args.push(
      this.options.image ?? "node:22-alpine",
      "sh",
      "-c",
      "mkdir -p /workspace && sleep infinity",
    );

    await this.run(args, 30_000);
    this.workspace = { id: name, root: "/workspace" };
    return this.workspace;
  }

  public async readFile(path: string): Promise<string> {
    const workspace = this.requireWorkspace();
    return (
      await this.run([
        "exec",
        workspace.id,
        "sh",
        "-c",
        `cat -- ${shellQuote(this.resolvePath(path))}`,
      ])
    ).stdout;
  }

  public async writeFile(path: string, content: string): Promise<void> {
    const workspace = this.requireWorkspace();
    const target = this.resolvePath(path);
    const parent = target.slice(0, target.lastIndexOf("/")) || "/workspace";
    await this.run(
      [
        "exec",
        "-i",
        workspace.id,
        "sh",
        "-c",
        `mkdir -p ${shellQuote(parent)} && cat > ${shellQuote(target)}`,
      ],
      this.timeout(),
      content,
    );
  }

  public async exec(input: CommandInput): Promise<CommandResult> {
    const workspace = this.requireWorkspace();
    const cwd = this.resolvePath(input.cwd ?? ".");
    return this.run(
      ["exec", workspace.id, "sh", "-c", `cd ${shellQuote(cwd)} && ${input.command}`],
      input.timeoutMs ?? this.timeout(),
    );
  }

  public async dispose(projectId?: string): Promise<void> {
    if (!this.workspace && projectId === undefined) return;
    const id = this.workspace?.id ?? this.containerName(projectId!);
    this.workspace = undefined;
    try {
      await this.run(["rm", "-f", id], 15_000);
    } catch (error) {
      if (error instanceof Error && error.message.includes("No such container")) return;
      throw error;
    }
  }

  private containerName(projectId: string): string {
    const safeProjectId = projectId.replace(/[^a-zA-Z0-9_.-]/g, "-").slice(0, 48) || "project";
    return `wex-sandbox-${safeProjectId}`;
  }

  private async inspectProjectId(name: string): Promise<string | undefined> {
    try {
      const result = await this.run(
        ["container", "inspect", "--format", '{{index .Config.Labels "wex.project-id"}}', name],
        15_000,
      );
      return result.stdout.trim();
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes("No such object") || error.message.includes("No such container"))
      )
        return undefined;
      throw error;
    }
  }

  private requireWorkspace(): Workspace {
    if (!this.workspace) throw new Error("Sandbox workspace has not been created");
    return this.workspace;
  }

  private resolvePath(path: string): string {
    const root = "/workspace";
    const normalized = posixNormalize(`/${path}`);
    if (normalized === "/" || normalized.startsWith("/../") || normalized === "/..") {
      return root;
    }
    return `${root}${normalized}`;
  }

  private timeout(): number {
    return this.options.defaultTimeoutMs ?? 60_000;
  }

  private run(args: string[], timeoutMs = this.timeout(), input?: string): Promise<CommandResult> {
    return new Promise<CommandResult>((resolve, reject) => {
      const child = spawn(this.dockerBinary, args, { stdio: ["pipe", "pipe", "pipe"] });
      let stdout = "";
      let stderr = "";
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error(`Docker command timed out after ${timeoutMs}ms`));
      }, timeoutMs);
      child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
      child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
      child.on("error", (error) => {
        clearTimeout(timer);
        reject(error);
      });
      child.on("close", (exitCode) => {
        clearTimeout(timer);
        resolve({ exitCode: exitCode ?? 1, stdout, stderr });
      });
      if (input !== undefined) child.stdin.end(input);
      else child.stdin.end();
    }).then((result) => {
      if (result.exitCode !== 0)
        throw new Error(result.stderr.trim() || `Docker command failed (${result.exitCode})`);
      return result;
    });
  }
}

import { spawn } from "node:child_process";
import { posix as pathPosix } from "node:path";

const posixNormalize = pathPosix.normalize;

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}
