# GitHub Copilot Instructions

## Nx

- Always run tasks through `nx` (`pnpm nx run`, `pnpm nx run-many`, `pnpm nx affected`) — never invoke the underlying tooling (tsc, jest, eslint) directly
- NEVER guess CLI flags — check `--help` first when unsure

## Testing

- Do NOT generate, create, or modify test files (`*.spec.ts`, `*.test.ts`, `*.e2e-spec.ts`) unless explicitly asked
- Do NOT write unit tests, integration tests, or e2e tests as part of feature implementation

## Shared Library (`@arc/shared`)

- Any code reusable across microservices MUST go in `libs/shared` — DTOs, interfaces, enums, constants, utilities, modules
- Services import shared contracts via `@arc/shared`; implementation stays in the app
- Before writing new code in an app, check if `@arc/shared` already has it or if it should live there

## Production Safety

- Swagger must NEVER be accessible in production — use `setupSwagger()` from `@arc/shared`
- `prisma migrate dev` and Prisma Studio must NEVER run in production
- Dev-only tools must be gated behind `NODE_ENV !== 'production'`

## Documentation

- ALL documentation files MUST be created in the `docs/` folder at the workspace root
- One file per service or topic, e.g. `docs/audit-service.md`, `docs/auth-service.md`
- Never create `.md` documentation files inside `apps/`, `libs/`, or anywhere else in the workspace
- When updating a service (new fields, endpoints, patterns), update the corresponding `docs/` file in the same change
