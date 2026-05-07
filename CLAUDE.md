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

- Do NOT generate, create, or modify test files (*.spec.ts, *.test.ts, *.e2e-spec.ts) unless the user explicitly asks for it
- Do NOT write unit tests, integration tests, or e2e tests as part of feature implementation
- You may run existing tests when asked to verify changes

# Shared Library (`@arc/shared`)

- Any code reusable across microservices MUST go in `libs/shared` — DTOs, interfaces, enums, constants, utilities, modules (health, prisma, swagger)
- Services import shared contracts via `@arc/shared`; implementation stays in the app
- Before writing new code in an app, check if `@arc/shared` already has it or if it should live there

# Production Safety

- Swagger must NEVER be accessible in production. Use `setupSwagger()` from `@arc/shared` — it auto-skips in production via dynamic import
- Prisma Studio and `prisma migrate dev` must NEVER run in production. Guard nx targets with `NODE_ENV` checks; use `prisma:migrate:deploy` for production migrations
- Dev-only tools (Swagger, Prisma Studio, debug endpoints) must be gated behind `NODE_ENV !== 'production'`

# Documentation & Architecture Sync

- ALL documentation files (service guides, API references, integration docs, architecture notes) MUST be created in the `docs/` folder at the workspace root
- One file per service or topic, e.g. `docs/audit-service.md`, `docs/auth-service.md`
- Never create `.md` documentation files inside `apps/`, `libs/`, or anywhere else in the workspace
- When updating a service (new fields, endpoints, patterns), update the corresponding `docs/` file in the same change
- **AUTO-UPDATE RULE**: After implementing any feature, enhancement, or architectural change, you MUST update the following files **without asking** — treat this as part of the implementation itself:
  - `CLAUDE.md` — update the quick-reference section if services, patterns, or workflows change
  - `ARCHITECTURE.txt` — update relevant sections (endpoints, TCP commands, DB tables, shared library inventory)
  - `docs/<service>.md` — update or create the corresponding service doc

# NestJS Best Practices

When working on NestJS code, follow the rules in `.agents/skills/nestjs-best-practices/AGENTS.md`.

---

# Project Architecture (Quick Reference)

> For full details (all endpoints, TCP commands, DB schemas, shared library inventory), read `ARCHITECTURE.txt`.

## Overview

ix-copilot is a **multi-tenant SaaS foundation layer** — Nx monorepo, 5 NestJS microservices + 1 BFF + 1 Next.js frontend. Cloud (SaaS) and On-Prem modes via `ON_PREM` env flag.

**Tech**: Node.js 20 | NestJS 11 | Prisma 7.4 | PostgreSQL 15 | Redis 7 | Next.js 16 + React 19 | Nx 22.5 | pnpm

## Services

| Service | TCP | HTTP | Purpose |
|---------|-----|------|---------|
| auth-service | 3001 | 4001 | JWT auth, credentials, MFA, SSO |
| audit-service | 3002 | 4002 | Centralized audit logging |
| tenant-service | 3003 | 4003 | Tenant lifecycle, billing, invoices |
| users-service | 3004 | 4004 | Users, roles, groups, RBAC |
| license-service | 3005 | 4005 | Plans, features, quotas, usage |
| admin-portal | 3006 | 4006 | BFF aggregator for admin-ui |
| admin-ui | — | 3100 | Next.js admin dashboard |

## Key Patterns

- **Dual transport**: Every service runs TCP (inter-service) + HTTP (REST). Bootstrap pattern in each `main.ts`.
- **Inter-service**: `@MessagePattern` for request-response, `@EventPattern` for fire-and-forget (audit). `ClientsModule.register()` + `firstValueFrom(client.send(...))`.
- **Multi-tenancy**: `tenantId` on all entities, `TenantScopeInterceptor` enforces isolation, `SYSTEM_TENANT_ID = 0`.
- **RBAC**: `SuperAdminGuard` (system tenant) / `TenantAdminGuard`. Guard order: JwtAuthGuard → Auth guard → TenantScopeInterceptor → AuditLoggingInterceptor.
- **Shared library** (`@arc/shared`): DTOs, enums, interfaces, guards, interceptors, PrismaModule, HealthModule, MailModule, setupSwagger.
- **DB per service**: Each service owns its Prisma schema at `apps/<service>/prisma/schema.prisma`. 30 tables across 5 DBs.
- **Naming**: DTOs = `Create/Update/Query<Resource>Dto`, TCP = `snake_case`, Enums = `UPPER_SNAKE_CASE`, DB columns = camelCase → UPPER_SNAKE_CASE via `@map`.
- **Email templates**: Handlebars-based, hierarchical fallback (tenant → global tenantId=0 → hardcoded). Branding (TENANT_BRANDINGS) + templates (EMAIL_TEMPLATES) in tenant-service DB. Logs in NOTIFICATION_LOGS (audit-service). See `docs/notification-templates.md`.
- **Correlation ID**: `CorrelationIdMiddleware` (from `@arc/shared`) applied in every service `main.ts`. Reads/generates `x-request-id` UUID, attaches to `req.requestId`, echoes on response header, included in error responses.
- **Rate limiting**: `ThrottlerModule` on admin-portal (entry point only). 20 req/s + 300 req/min per IP. Guard order: ThrottlerGuard → OnPremLicenseGuard → JwtAuthGuard.
- **IDOR protection**: All `:id` endpoints pass `requestingTenantId` (from JWT) through BFF → TCP payload → backend service → repository `findFirst({where:{id,tenantId}})`. SUPER_ADMIN exempt (passes `undefined`).
- **TCP timeout utility**: Use `sendWithTimeout(client, pattern, data, 5000)` from `@arc/shared` instead of raw `firstValueFrom()`. Returns HTTP 504 on timeout. Applied to all 119 TCP calls in admin-portal services. `retryAttempts: 0` in all ClientsModule entries.
- **Helmet**: `app.use(helmet())` in all 6 service + admin-portal `main.ts`. Adds X-Content-Type-Options, X-Frame-Options, HSTS, and other security headers automatically.

## Plans & Features

6 plans: FREE, STARTER, BASIC, BUSINESS, PROFESSIONAL, ENTERPRISE. Tenants store `planId` as string (plan name). `quota.service.ts` resolves via `findPlanByName()`.

**Plan ID contract** — TENANT.PLAN_ID stores the plan NAME (e.g. `"PROFESSIONAL"`), never the numeric Plan.id. All write paths validate this:
- Zod schema in admin-ui (`tenant.schema.ts`) regex `/^[A-Z_]+$/`
- `@Matches` in `UpdateTenantDto`/`CreateTenantDto`
- `tenants.service.ts` calls `get_plan_by_name` TCP on license-service to verify the plan exists before write, and records a `TENANT_PLAN_HISTORY` row (INITIAL/UPGRADE/DOWNGRADE) using the canonical tier order `FREE < STARTER < BASIC < BUSINESS < PROFESSIONAL < ENTERPRISE`
- `tenants.repository.ts::assertPlanIdIsNotNumeric` as a last-mile guard
- License-service `quota.service.ts` keeps a numeric fallback for legacy data and logs WARN when hit — run `tools/fix-tenant-plan-ids.ts` to migrate.

**TCP handlers for plans** (license-service): `get_plan` (by numeric id, used by license-file generation) and `get_plan_by_name` (canonical resolver, used by tenant-service + admin-portal).

Feature keys follow `snake_case` naming for DMS features (`file_upload`, `max_files`, `connectors`, etc.) and `ai_*` for AI features (`ai_monthly_query_quota`, `ai_monthly_doc_quota`, etc.). 47 total features across `dms` and `ai` categories.

DMS usage recording (fire-and-forget): `max_files` (file upload), `max_connectors` (connection create), `ai_monthly_query_quota` (search/Q&A), `ai_monthly_doc_quota` (doc processed).

## Seed Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `tools/seed-align-plans-features.ts` | Create all plans + seed DMS/AI features + assign quotas | `npx tsx tools/seed-align-plans-features.ts` |
| `tools/seed-dms-features.ts` | Seed 16 DMS features + STARTER/PRO/ENTERPRISE quotas | `DATABASE_URL=... npx tsx tools/seed-dms-features.ts` |
| `tools/seed-ai-features.ts` | Seed 14 AI features into registry | `DATABASE_URL=... npx tsx tools/seed-ai-features.ts` |
| `tools/seed-default-templates.ts` | Cloud: seed global branding + email templates (tenantId=0) | `DATABASE_URL=... npx tsx tools/seed-default-templates.ts` |
| `tools/seed-onprem-admin.ts` | On-prem: full setup (tenant, admin, license, branding, templates — 8 steps) | `DATABASE_URL=... npx tsx tools/seed-onprem-admin.ts` |
| `tools/fix-tenant-plan-ids.ts` | One-time data migration — converts legacy numeric `TENANT.PLAN_ID` values to the canonical plan name string (dry-run by default, `--apply` to commit) | `DATABASE_URL=... npx tsx tools/fix-tenant-plan-ids.ts [--apply]` |

## On-Prem External Infrastructure

- **`EXTERNAL_DB=true`**: Skip Docker postgres, customer provides own PostgreSQL. `DATABASE_URL` must point to external host.
- **`EXTERNAL_REDIS=true`**: Skip Docker redis, customer provides own Redis. Set `REDIS_HOST` + `REDIS_PORT`.
- Docker Compose profiles: `managed-db` (postgres), `managed-redis` (redis) — only start when profile is active.
- `setup.sh` reads these flags from `.env` and adapts (skip pull/start, test connectivity, use `--profile` flags).
- Default: both `false` (fully Dockerized, same as before).

## Adding a New Feature

1. Create `apps/<service>/src/<feature>/` (module, controller, service)
2. Add DTOs in `libs/shared/src/lib/dto/<domain>/` → export from `libs/shared/src/index.ts`
3. Add interfaces/enums in shared lib if needed
4. Update Prisma schema if new tables
5. Register module in `app.module.ts`
6. Add proxy in admin-portal if BFF needs it
7. Update `docs/`

## Adding a New Microservice

1. `pnpm nx g @nx/nest:application <name>`
2. Add TCP + HTTP bootstrap, constants in `libs/shared/src/lib/constants/services.ts`
3. Set up Prisma + PrismaModule + HealthModule
4. Add to `docker-compose.yml` + admin-portal ClientProxy if needed
