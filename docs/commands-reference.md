# Commands Reference

Quick-reference cheat sheet for all CLI commands organized by category.

---

## Setup

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all dependencies |
| `cp .env.example .env` | Create root env file |
| `cp apps/auth-service/.env.example apps/auth-service/.env` | Create auth env file |
| `cp apps/license-service/.env.example apps/license-service/.env` | Create license env file |
| `createdb arc_db` | Create the database |
| `pnpm nx run-many --target=prisma:generate` | Generate Prisma client for all services |
| `pnpm nx run-many --target=prisma:migrate:deploy` | Run all migrations |

---

## Local Development

### Serve

| Command | Description |
|---------|-------------|
| `pnpm nx run-many --target=serve --projects=tenant-service,users-service,audit-service,auth-service,license-service --parallel=5` | Start all services |
| `pnpm nx run tenant-service:serve` | Start single service |

### Build

| Command | Description |
|---------|-------------|
| `pnpm nx run-many --target=build` | Build all services |
| `pnpm nx run tenant-service:build` | Build single service |

### Lint

| Command | Description |
|---------|-------------|
| `pnpm nx run-many --target=lint` | Lint all services |
| `pnpm nx run tenant-service:lint` | Lint single service |

---

## Prisma (Database)

### Generate Client

| Command | Description |
|---------|-------------|
| `pnpm nx run-many --target=prisma:generate` | Generate for all services |
| `pnpm nx run tenant-service:prisma:generate` | Generate for single service |

### Migrations

| Command | Description |
|---------|-------------|
| `pnpm nx run-many --target=prisma:migrate:deploy` | Apply all pending migrations |
| `pnpm nx run tenant-service:prisma:migrate:deploy` | Apply migrations for single service |
| `pnpm nx run tenant-service:prisma:migrate:dev -- --name add-field` | Create new migration (dev only) |

### Prisma Studio

| Command | Description |
|---------|-------------|
| `pnpm nx run tenant-service:prisma:studio` | Open visual DB browser (port 5555) |

### Database Reset

| Command | Description |
|---------|-------------|
| `dropdb arc_db && createdb arc_db` | Drop and recreate database |
| `dropdb arc_db && createdb arc_db && pnpm nx run-many --target=prisma:migrate:deploy` | Full reset with migrations |

---

## PostgreSQL

| Command | Description |
|---------|-------------|
| `brew services start postgresql@15` | Start PostgreSQL (macOS) |
| `brew services stop postgresql@15` | Stop PostgreSQL (macOS) |
| `pg_isready` | Check if PostgreSQL is running |
| `psql arc_db` | Connect to database |
| `psql -l \| grep arc_db` | Check if database exists |
| `createdb arc_db` | Create database |
| `dropdb arc_db` | Drop database |

---

## Redis

| Command | Description |
|---------|-------------|
| `brew services start redis` | Start Redis (macOS) |
| `brew services stop redis` | Stop Redis (macOS) |
| `redis-cli ping` | Check if Redis is running |
| `redis-cli` | Connect to Redis CLI |
| `redis-cli FLUSHALL` | Clear all Redis data |

---

## Docker (Local Development)

### Setup

| Command | Description |
|---------|-------------|
| `cp .env.docker.example .env.docker` | Create Docker env file |

### Build

| Command | Description |
|---------|-------------|
| `docker compose build` | Build all images |
| `docker compose build tenant-service` | Build single service image |
| `docker compose build --no-cache` | Build all images from scratch |

### Run

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start all containers (detached) |
| `docker compose up -d --build` | Build + start |
| `docker compose up -d --build tenant-service` | Rebuild + restart single service |

### Logs

| Command | Description |
|---------|-------------|
| `docker compose logs -f` | Tail all logs |
| `docker compose logs -f tenant-service` | Tail single service logs |
| `docker compose logs --tail=50 tenant-service` | Last 50 lines |

### Stop

| Command | Description |
|---------|-------------|
| `docker compose down` | Stop all (keep data) |
| `docker compose down -v` | Stop all + delete data volumes |

### Status

| Command | Description |
|---------|-------------|
| `docker compose ps` | List running containers |
| `docker compose exec tenant-service sh` | Shell into container |
| `docker stats` | Live resource usage |

---

## Docker (On-Prem Deployment)

All on-prem commands use `--env-file .env.onprem -f docker-compose.onprem.yml`:

| Command | Description |
|---------|-------------|
| `docker compose --env-file .env.onprem -f docker-compose.onprem.yml up -d` | Start |
| `docker compose --env-file .env.onprem -f docker-compose.onprem.yml logs -f` | Logs |
| `docker compose --env-file .env.onprem -f docker-compose.onprem.yml down` | Stop |
| `docker compose --env-file .env.onprem -f docker-compose.onprem.yml pull` | Pull latest images |
| `docker compose --env-file .env.onprem -f docker-compose.onprem.yml down -v` | Stop + wipe data |
| `docker compose --env-file .env.onprem -f docker-compose.onprem.yml ps` | Status |
| `docker compose --env-file .env.onprem -f docker-compose.onprem.yml restart` | Restart all |

---

## Docker Images (Build & Push)

### Build for Registry

| Command | Description |
|---------|-------------|
| `docker compose build` | Build all service images |
| `docker build --target source -t <registry>/ix-copilot/migrate:<tag> .` | Build migrate image |

### Tag

| Command | Description |
|---------|-------------|
| `docker tag ix-copilot-tenant-service <registry>/ix-copilot/tenant-service:<tag>` | Tag tenant |
| `docker tag ix-copilot-users-service <registry>/ix-copilot/users-service:<tag>` | Tag users |
| `docker tag ix-copilot-audit-service <registry>/ix-copilot/audit-service:<tag>` | Tag audit |
| `docker tag ix-copilot-auth-service <registry>/ix-copilot/auth-service:<tag>` | Tag auth |
| `docker tag ix-copilot-license-service <registry>/ix-copilot/license-service:<tag>` | Tag license |

### Push

| Command | Description |
|---------|-------------|
| `docker push <registry>/ix-copilot/tenant-service:<tag>` | Push tenant |
| `docker push <registry>/ix-copilot/users-service:<tag>` | Push users |
| `docker push <registry>/ix-copilot/audit-service:<tag>` | Push audit |
| `docker push <registry>/ix-copilot/auth-service:<tag>` | Push auth |
| `docker push <registry>/ix-copilot/license-service:<tag>` | Push license |
| `docker push <registry>/ix-copilot/migrate:<tag>` | Push migrate |

### Air-Gapped Export

| Command | Description |
|---------|-------------|
| `docker save <images...> -o ix-copilot-images.tar` | Export images to tar |
| `docker load -i ix-copilot-images.tar` | Import images from tar |

---

## License Keys

| Command | Description |
|---------|-------------|
| `npx tsx tools/generate-license-keys.ts` | Generate RSA key pair |
| `rm tools/keys/private.pem tools/keys/public.pem` | Delete keys (before regenerating) |

### Generate License (from database -- recommended)

```bash
# Reads tenant's plan and features from DB, generates signed license.lic,
# and stores TENANT_LICENSE record in DB
DATABASE_URL=postgresql://... npx tsx tools/generate-license-file.ts <TENANT_ID>
```

| Env Var / Arg | Required | Description |
|---------------|----------|-------------|
| `TENANT_ID` | Yes | CLI arg, env var, or from `delivery-package/.env` |
| `DATABASE_URL` | Yes | PostgreSQL connection string (env var or `delivery-package/.env`) |

### Generate License (via curl -- alternative)

```bash
curl -X POST http://localhost:6005/on-prem/license \
  -H "Content-Type: application/json" \
  -d '{"tenantId": 8, "cycle":"ANNUALLY"}' \
  -o license.lic
```

### Check License Status

```bash
curl http://localhost:6005/on-prem/license/status
```

---

## Nx Utilities

| Command | Description |
|---------|-------------|
| `pnpm nx graph` | Open project dependency graph in browser |
| `pnpm nx show project tenant-service` | Show all targets for a project |
| `pnpm nx affected --target=build` | Build only changed projects |
| `pnpm nx affected --target=lint` | Lint only changed projects |
| `pnpm nx run-many --target=build` | Build all projects |

---

## Clean Slate (Full Reset)

```bash
# Stop everything
docker compose down
brew services stop postgresql@15
brew services stop redis

# Remove all build artifacts and dependencies
rm -rf node_modules apps/*/node_modules libs/*/node_modules
rm -rf dist apps/*/dist
rm -rf .nx
rm -rf tools/keys/

# Drop database
dropdb arc_db

# Re-install
pnpm install
createdb arc_db
pnpm nx run-many --target=prisma:generate
pnpm nx run-many --target=prisma:migrate:deploy
```

---

## Port Reference

| Service / Tool | Port |
|---------------|------|
| auth-service (TCP) | 5001 |
| auth-service (HTTP) | 6001 |
| audit-service (TCP) | 5002 |
| audit-service (HTTP) | 6002 |
| tenant-service (TCP) | 5003 |
| tenant-service (HTTP) | 6003 |
| users-service (TCP) | 5004 |
| users-service (HTTP) | 6004 |
| license-service (TCP) | 5005 |
| license-service (HTTP) | 6005 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| Prisma Studio | 5555 |

---

## Health Checks

| URL | Service |
|-----|---------|
| http://localhost:6001/health | auth-service |
| http://localhost:6002/health | audit-service |
| http://localhost:6003/health | tenant-service |
| http://localhost:6004/health | users-service |
| http://localhost:6005/health | license-service |

---

## Swagger UI

| URL | Service |
|-----|---------|
| http://localhost:6001/api | auth-service |
| http://localhost:6002/api | audit-service |
| http://localhost:6003/api | tenant-service |
| http://localhost:6004/api | users-service |
| http://localhost:6005/api | license-service |

Swagger is only available when `NODE_ENV !== 'production'`.
