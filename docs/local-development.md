# Local Development

Day-to-day development workflow for working on ix-copilot services locally.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    Local Machine                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ auth-service  │  │ audit-service │  │tenant-service│       │
│  │ TCP:3001      │  │ TCP:3002      │  │ TCP:3003     │       │
│  │ HTTP:4001     │  │ HTTP:4002     │  │ HTTP:4003    │       │
│  └──────┬───────┘  └──────────────┘  └──────────────┘       │
│         │ TCP calls                                          │
│  ┌──────┴───────┐  ┌──────────────┐                         │
│  │ users-service │  │license-service│                         │
│  │ TCP:3004      │  │ TCP:3005      │                         │
│  │ HTTP:4004     │  │ HTTP:4005     │                         │
│  └──────────────┘  └──────┬───────┘                         │
│                           │                                  │
│  ┌────────────────────────┴─────────────────────────┐       │
│  │  PostgreSQL (localhost:5432)  │  Redis (localhost:6379)   │
│  │  Database: ix_db              │                           │
│  └───────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────┘
```

---

## Port Map

| Service | TCP Port | HTTP Port | Swagger UI |
|---------|----------|-----------|------------|
| auth-service | 3001 | 4001 | http://localhost:4001/api |
| audit-service | 3002 | 4002 | http://localhost:4002/api |
| tenant-service | 3003 | 4003 | http://localhost:4003/api |
| users-service | 3004 | 4004 | http://localhost:4004/api |
| license-service | 3005 | 4005 | http://localhost:4005/api |
| PostgreSQL | 5432 | - | - |
| Redis | 6379 | - | - |

---

## Starting Services

### Start All Services (parallel)

```bash
pnpm nx run-many --target=serve \
  --projects=tenant-service,users-service,audit-service,auth-service,license-service \
  --parallel=5
```

All services start with hot-reload. Code changes auto-restart the affected service.

### Start a Single Service

```bash
pnpm nx run tenant-service:serve
```

### Service Dependencies

Some services depend on others via TCP. Start order matters for full functionality:

```
1. tenant-service   (no dependencies)
2. users-service    (no dependencies)
3. audit-service    (no dependencies)
4. auth-service     (depends on: users-service, tenant-service via TCP)
5. license-service  (depends on: tenant-service, audit-service via TCP + Redis)
```

If you start auth-service alone, login won't work because it calls users-service and tenant-service via TCP. Health check and Swagger will still work.

---

## Building

### Build All Services

```bash
pnpm nx run-many --target=build
```

### Build a Single Service

```bash
pnpm nx run tenant-service:build
```

Build output goes to `apps/<service>/dist/`. You don't need to build manually for local development — `serve` handles it automatically.

---

## Linting

### Lint All Services

```bash
pnpm nx run-many --target=lint
```

### Lint a Single Service

```bash
pnpm nx run tenant-service:lint
```

---

## Database Operations

### Generate Prisma Client (after schema changes)

```bash
# All services
pnpm nx run-many --target=prisma:generate

# Single service
pnpm nx run tenant-service:prisma:generate
```

Run this whenever you change a `schema.prisma` file. It generates TypeScript types used by the code.

### Create a New Migration (development only)

```bash
pnpm nx run tenant-service:prisma:migrate:dev -- --name add-user-avatar
```

This:
1. Generates a new migration SQL file in `prisma/migrations/`
2. Applies it to the local database
3. Regenerates the Prisma client

### Apply Existing Migrations

```bash
# All services
pnpm nx run-many --target=prisma:migrate:deploy

# Single service
pnpm nx run tenant-service:prisma:migrate:deploy
```

Use this after pulling code that includes new migrations.

### Open Prisma Studio (visual DB browser)

```bash
pnpm nx run tenant-service:prisma:studio
```

Opens a browser UI at http://localhost:5555 to browse and edit data. Never use in production.

### Reset Database (drop all tables, re-migrate)

```bash
dropdb ix_db && createdb ix_db && pnpm nx run-many --target=prisma:migrate:deploy
```

---

## Code Changes — What to Re-Run

| What You Changed | Action Needed |
|-----------------|---------------|
| TypeScript code (controller, service, etc.) | Nothing — hot-reload auto-restarts |
| `schema.prisma` (add/change field or table) | `prisma:migrate:dev -- --name <name>` then `prisma:generate` |
| `package.json` (add dependency) | `pnpm install` |
| `.env` file | Restart the affected service (Ctrl+C, re-run serve) |
| Shared library (`libs/shared/`) | All dependent services auto-rebuild via hot-reload |
| New service added | `pnpm install` then add to serve command |

---

## Stopping Everything

```bash
# Stop services
Ctrl+C in the terminal running nx serve

# Stop PostgreSQL (macOS)
brew services stop postgresql@15

# Stop Redis (macOS)
brew services stop redis
```

---

## Useful Nx Commands

### See what changed (affected)

```bash
pnpm nx affected --target=build
pnpm nx affected --target=lint
```

### View project dependency graph

```bash
pnpm nx graph
```

Opens a browser UI showing which services depend on which libraries.

### List all available targets for a service

```bash
pnpm nx show project tenant-service
```
