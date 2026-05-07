# arc-copilot

Foundation layer for **Arc Insights** — multi-tenant BI / embedded analytics platform.

Forked from the `ix-copilot` foundation (an Nx monorepo of NestJS microservices: auth, users, tenant, license, audit + admin-portal BFF + admin-ui Next.js app). The fork strips DMS-specific seed data and replaces it with Arc-Insights modules, permissions, features, plans, and email templates. On-prem first; cloud parity stays viable as a future fork.

## Layout

```
arc-copilot/
├── apps/
│   ├── auth-service/       Authentication, JWT, MFA, SSO providers
│   ├── users-service/      Users, roles, groups, modules, permissions
│   ├── tenant-service/     Tenants, branding, email templates
│   ├── license-service/    Plans, features, on-prem .lic generation
│   ├── audit-service/      Audit log + notification log (append-only)
│   ├── admin-portal/       BFF: HTTP gateway over the 5 services
│   └── admin-ui/           Next.js UI for Super Admin + tenant admins
├── libs/shared/            DTOs, guards, interceptors, mail, on-prem helpers
└── tools/                  Seed scripts, license-key utilities
```

## Status

Phase 0 — fork in progress. See `ARCHITECTURE.txt` for the full system map (carried over from ix-copilot, will be updated as Arc-specific changes land).

## Conventions

- TypeScript strict, NestJS v11, Prisma v7, pnpm + Nx 22.
- Two-gate enforcement at every Arc route: **license feature** (outer) → **permission** (inner).
- Plan ID is a **string name** (`ON_PREM_FULL`, `ON_PREM_CORE`, etc.), not a numeric FK.
- All TCP calls go through `sendWithTimeout(client, pattern, data, 5000)`.
- After implementing a feature, update `CLAUDE.md`, `ARCHITECTURE.txt`, and `docs/<service>.md` without asking.

## Phase 1 build chunks

1. ~~Fork the tree~~ (this commit)
2. Rename `@org/shared` → `@arc/shared`
3. Rename DBs to `arc_*`, reallocate ports (TCP 5001–5006, HTTP 6001–6006)
4. Schema migrations: `dependsOn` columns + Arc enum values
5. Generate fresh RSA license-signing keys
6. Flag-off DMS-specific routes in admin-ui
7. `seed-arc.ts`: modules, permissions, features, plans, branding, email templates, Super Admin
8. Boot test end-to-end
