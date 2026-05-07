<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `pnpm nx build`, `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/react:app`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->

# Testing

- Do NOT generate, create, or modify test files (*.spec.ts, *.test.ts, *.e2e-spec.ts) unless explicitly asked
- Do NOT write unit tests, integration tests, or e2e tests as part of feature implementation

# Shared Library (`@org/shared`)

- Any code reusable across microservices MUST go in `libs/shared` — DTOs, interfaces, enums, constants, utilities, modules (health, prisma, swagger)
- Services import shared contracts via `@org/shared`; implementation stays in the app
- Before writing new code in an app, check if `@org/shared` already has it or if it should live there

# Production Safety

- Swagger must NEVER be accessible in production. Use `setupSwagger()` from `@org/shared` — it auto-skips in production via dynamic import
- Prisma Studio and `prisma migrate dev` must NEVER run in production. Guard nx targets with `NODE_ENV` checks; use `prisma:migrate:deploy` for production migrations
- Dev-only tools (Swagger, Prisma Studio, debug endpoints) must be gated behind `NODE_ENV !== 'production'`

# Documentation

- ALL documentation files (service guides, API references, integration docs, architecture notes) MUST be created in the `docs/` folder at the workspace root
- One file per service or topic, e.g. `docs/audit-service.md`, `docs/auth-service.md`
- Never create `.md` documentation files inside `apps/`, `libs/`, or anywhere else in the workspace
- When updating a service (new fields, endpoints, patterns), update the corresponding `docs/` file in the same change

# NestJS Best Practices

When working on NestJS code, follow the rules in `.agents/skills/nestjs-best-practices/AGENTS.md`.
