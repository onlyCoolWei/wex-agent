# Repository Instructions

These instructions apply to every change in this repository. Detailed rationale,
templates, and examples live in `docs/collaboration-guide.md`.

## Before Editing

1. Read `README.md`, this file, and the documents related to the requested domain.
2. Run `git status --short` and preserve all pre-existing user changes.
3. State the requested outcome and acceptance criteria before choosing files to edit.
4. Inspect adjacent code and reuse established modules, types, components, and naming.

If requirements conflict with an existing business or architecture document, do not
silently choose one. Surface the conflict and update the source-of-truth document as
part of the agreed change.

## Business Context

For any change that affects product behavior, read `docs/business/README.md` and
`docs/business/glossary.md` before editing code. Then use the task-to-document routing
table in the business README to read the affected domain documents.

`docs/README.md` explains the document categories. Read only the category relevant to
the task. `docs-personal/` is the user's private knowledge base: do not read, quote,
summarize, modify, format, or use it as product context unless the user explicitly
names a file and asks for that work. The required development diary at
`docs-personal/diary.md` is the only automatic maintenance exception.

- Treat business documents as the source of truth for user-visible rules and
  invariants, not as proof that a planned capability is already implemented.
- Preserve the distinction between **implemented**, **defined but incomplete**, and
  **unsupported** capabilities.
- When behavior changes, update the affected business document in the same change.
- When code, contracts, migrations, and business documents disagree, stop and surface
  the discrepancy instead of silently rewriting one side.
- Use the terms defined in the glossary consistently in code, docs, and handoff notes.
- Prefer an automated check for a rule that can be judged reliably by a script. Do not
  claim a planned CI, lint, dependency, or architecture gate already exists.
- Create or update an ADR only for a durable technical decision; keep ordinary feature
  implementation details in the relevant technical document.

## Change Scope

- Make the smallest complete change that satisfies the request.
- Do not perform unrelated refactors, formatting sweeps, renames, dependency upgrades,
  or configuration changes.
- Do not overwrite or revert changes that were already present in the worktree.
- Do not edit generated output such as `dist/`, `.turbo/`, or dependency directories.
- Never commit secrets. When configuration changes, update `.env.example` with safe
  placeholders and document the setup.
- Add a dependency only when the existing stack cannot reasonably solve the problem;
  explain why it is needed and keep the lockfile consistent.

## Architecture Boundaries

- `apps/web`: presentation and browser interaction. Shared request/response and event
  shapes come from `@wex/contracts`.
- `apps/api`: authentication, validation, business orchestration, persistence access,
  and external REST/SSE boundaries. Do not run long-lived Agent work here.
- `apps/worker`: background Agent execution and runtime integration. Keep transport and
  stable business contracts outside SDK-specific implementation details.
- `packages/contracts`: cross-application DTOs, events, and stable boundary types. Update
  producers and consumers together when a contract changes.
- `packages/database`: database client, generated database types, and persistence-level
  primitives. Schema changes must include a migration and relevant documentation.
- `packages/model`: model-provider configuration and abstractions.
- `packages/sandbox`: sandbox interfaces and implementations; callers must not depend on
  provider-specific details.
- `packages/shared`: only genuinely domain-neutral utilities used by multiple workspaces.
  Do not use it as a miscellaneous dumping ground.

Dependencies should point from applications to packages, not between applications.
Avoid deep imports into another workspace's `src`; use its public exports.

## Implementation Quality

- Keep TypeScript strict: avoid `any`, unsafe assertions, and duplicated boundary types.
- Validate untrusted input at system boundaries and return stable, non-sensitive errors.
- Preserve backward compatibility unless the task explicitly authorizes a breaking
  change. Call out any migration or rollout requirement.
- Cover bug fixes and non-trivial business logic with focused tests when the affected
  workspace has a test setup. Test behavior and failure paths, not implementation detail.
- For UI changes, handle loading, empty, error, disabled, and narrow-screen states where
  applicable. Reuse the existing component and visual conventions.
- Comments explain non-obvious decisions; names and structure should explain the rest.

## Verification

Run checks proportional to the changed surface, using the narrowest relevant command
first:

```bash
pnpm --filter <workspace> typecheck
pnpm --filter @wex/worker test  # when Worker runtime behavior changes
pnpm typecheck                  # for shared or cross-workspace changes
pnpm build                      # for cross-workspace or build/config changes
pnpm check:docs                 # for documentation links, boundaries, and metadata
pnpm exec prettier --check <changed-files>
```

Also perform the relevant manual flow for user-facing behavior. If a check cannot run
because of missing services or credentials, report that explicitly; do not claim it
passed.

## Definition of Done

A change is complete only when:

- acceptance criteria are satisfied without unrelated edits;
- affected contracts, migrations, configuration examples, and docs are synchronized;
- relevant automated checks and manual flows have been run, or limitations reported;
- no secret, generated output, debug code, or accidental worktree change is included;
- the final handoff summarizes behavior, key files, verification, and remaining risk;
- `docs-personal/diary.md` is updated as required below.

## Development Diary

Before sending the final response, update `docs-personal/diary.md` only when the current user turn changed repository files.

- Under today's local `### YYYY-MM-DD` section, with newest dates first, add concise and nonduplicate Chinese result entries in the form `- emoji 描述`.
- Use `✨` for features, `🔧` for fixes or adjustments, `⚡️` for performance, `🌐` for internationalization, `🎊` for milestones, and `🗑️` for removals.
- Ignore read-only turns and changes made only to `docs-personal/diary.md`.
- Update the diary before the final response so the task finishes with a single assistant message.
