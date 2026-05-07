# Setup Guide

Complete guide to set up the ix-copilot platform from a fresh git clone.

---

## Prerequisites

### Required Software

| Tool | Version | Install (macOS) | Verify |
|------|---------|-----------------|--------|
| Node.js | 20+ | `brew install node@20` | `node -v` |
| pnpm | 9+ | `corepack enable pnpm` | `pnpm -v` |
| PostgreSQL | 15+ | `brew install postgresql@15` | `psql --version` |
| Redis | 7+ | `brew install redis` | `redis-cli --version` |

### Optional (for Docker workflow)

| Tool | Version | Install | Verify |
|------|---------|---------|--------|
| Docker | 24+ | [docker.com](https://docker.com) | `docker --version` |
| Docker Compose | 2.20+ | Included with Docker Desktop | `docker compose version` |

---

## Fresh Install (Step-by-Step)

### 1. Clone the Repository

```bash
git clone <repo-url>
cd ix-copilot
```

### 2. Install Dependencies

```bash
pnpm install
```

This reads `pnpm-lock.yaml` and installs all dependencies for all 5 services + the shared library. Takes ~1-2 minutes on first run.

### 3. Configure Environment Files

```bash
# Root .env (shared DATABASE_URL for all services)
cp .env.example .env

# Auth service (JWT secrets)
cp apps/auth-service/.env.example apps/auth-service/.env

# License service (Redis + on-prem config)
cp apps/license-service/.env.example apps/license-service/.env
```

Edit `.env` and set:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ix_db?schema=public
```

### 4. Start PostgreSQL

```bash
# macOS
brew services start postgresql@15

# Verify it's running
pg_isready
```

### 5. Create the Database

```bash
createdb ix_db
```

All 5 services share this single database (each service has its own tables via separate Prisma schemas).

### 6. Generate Prisma Client

```bash
pnpm nx run-many --target=prisma:generate
```

This reads each service's `prisma/schema.prisma` and generates TypeScript types + query engine into `node_modules`. Required before the code can compile.

### 7. Run Database Migrations

```bash
pnpm nx run-many --target=prisma:migrate:deploy
```

This creates all 29 tables in `ix_db` by running the migration files from each service's `prisma/migrations/` folder.

### 8. Start Redis (for license-service)

```bash
# macOS
brew services start redis

# Verify
redis-cli ping
# Should return: PONG
```

### 9. Start All Services

```bash
pnpm nx run-many --target=serve \
  --projects=tenant-service,users-service,audit-service,auth-service,license-service \
  --parallel=5
```

### 10. Verify

Open in browser:

| Service | Swagger UI | Health |
|---------|-----------|--------|
| Auth | http://localhost:4001/api | http://localhost:4001/health |
| Audit | http://localhost:4002/api | http://localhost:4002/health |
| Tenant | http://localhost:4003/api | http://localhost:4003/health |
| Users | http://localhost:4004/api | http://localhost:4004/health |
| License | http://localhost:4005/api | http://localhost:4005/health |

---

## Clean Slate (Reset Everything)

If you need to start completely fresh:

```bash
# 1. Stop services (Ctrl+C in the terminal running nx serve)

# 2. Stop Docker (if running)
docker compose down

# 3. Remove installed dependencies
rm -rf node_modules
rm -rf apps/*/node_modules
rm -rf libs/*/node_modules

# 4. Remove build output
rm -rf dist
rm -rf apps/*/dist

# 5. Remove Nx cache
rm -rf .nx

# 6. Remove generated keys (if any)
rm -rf tools/keys/

# 7. Drop and recreate database
dropdb ix_db
createdb ix_db

# 8. Re-install from scratch
pnpm install
pnpm nx run-many --target=prisma:generate
pnpm nx run-many --target=prisma:migrate:deploy
```

---

## Checking Infrastructure Status

### PostgreSQL

```bash
# Check if running
pg_isready

# Check if database exists
psql -l | grep ix_db

# Connect to database
psql ix_db

# List tables (inside psql)
\dt

# Stop PostgreSQL
brew services stop postgresql@15
```

### Redis

```bash
# Check if running
redis-cli ping

# Stop Redis
brew services stop redis
```

---

## Troubleshooting

### "Cannot find module '@prisma/client'"

Run `pnpm nx run-many --target=prisma:generate`. Prisma client types haven't been generated yet.

### "relation does not exist" (table not found)

Run `pnpm nx run-many --target=prisma:migrate:deploy`. Tables haven't been created yet.

### "ECONNREFUSED 127.0.0.1:5432"

PostgreSQL is not running. Start it with `brew services start postgresql@15`.

### "ECONNREFUSED 127.0.0.1:6379"

Redis is not running. Start it with `brew services start redis`. Only affects license-service.

### Port already in use

Another process is using the port. Find and kill it:

```bash
lsof -i :4003    # Find process using port 4003
kill -9 <PID>    # Kill it
```
