# Docker Sandbox MVP

Status: Implemented (package-level smoke path)
Last verified: 2026-09-02
Read when: 实现或验证 Docker Sandbox Provider、文件/命令 Tool 或 Vite smoke 流程
Applies to: `packages/sandbox` 的 Docker MVP，不代表产品 Sandbox 已完成接入

## Related

- [`../technical/architecture-roadmap.md`](architecture-roadmap.md)
- [`../../packages/sandbox/src/index.ts`](../../packages/sandbox/src/index.ts)

## Scope

`@wex/sandbox` now includes a small `DockerSandbox` provider. It creates one
ephemeral container per provider instance, writes files under `/workspace`, runs
commands with timeouts, and applies CPU, memory, PID, and network defaults.

The provider is not yet connected to the Agent Runtime or product Project flow.
The Vite smoke path only validates the sandbox package boundary.

## Run

Docker must be installed and running. From the repository root:

```bash
pnpm --filter @wex/sandbox smoke:vite
```

The smoke script creates a React + Vite project, runs `npm install`, runs
`npm run build`, prints the workspace and build output, and always removes the
container.

## Security defaults

- Network is disabled unless `allowNetwork: true` is explicitly supplied.
- The container is not privileged and does not receive the Docker socket.
- Commands are bounded by a timeout; containers have CPU, memory, and PID limits.
- File paths are constrained to `/workspace`.

This is an MVP isolation boundary, not a VM-grade guarantee for hostile
multi-tenant workloads. Before exposing arbitrary users, add rootless Docker or
a stronger provider, authorization, audit events, output quotas, and a reviewed
network policy.
