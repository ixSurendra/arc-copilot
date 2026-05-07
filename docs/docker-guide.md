# Docker Guide

How to build and run the entire platform using Docker Compose for local development.

---

## When to Use Docker vs Local

| Use Local (`nx serve`) when... | Use Docker when... |
|-------------------------------|--------------------|
| Writing code (hot-reload) | Testing production-like build |
| Debugging with breakpoints | Testing all services together |
| Working on a single service | Simulating on-prem setup |
| Fast iteration | Verifying Dockerfile changes |

---

## Files Overview

| File | Purpose | Committed? |
|------|---------|------------|
| `Dockerfile` | Multi-stage build for all services | Yes |
| `.dockerignore` | Files excluded from Docker build | Yes |
| `docker-compose.yml` | Local dev Docker stack | Yes |
| `.env.docker` | Docker environment variables (secrets) | No (gitignored) |
| `.env.docker.example` | Template for `.env.docker` | Yes |

---

## First-Time Setup

### 1. Create Environment File

```bash
cp .env.docker.example .env.docker
```

Edit `.env.docker` and set:

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/arc_db?schema=public
JWT_SECRET=your-docker-jwt-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION_DAYS=7
```

### 2. Build All Images

```bash
docker compose build
```

This runs the multi-stage Dockerfile for each service (takes 3-5 minutes first time).

### 3. Start Everything

```bash
docker compose up -d
```

Starts 8 containers: postgres, redis, migrate (runs and exits), 5 services.

### 4. Verify

```bash
# Check all containers are running
docker compose ps

# Check logs
docker compose logs -f

# Test Swagger
open http://localhost:6003/api
```

---

## How the Dockerfile Works

The Dockerfile has 4 stages, each building on the previous:

### Stage 1: `deps` (Install dependencies)

```
FROM node:20-alpine
├── Enable pnpm via corepack
├── Copy package.json, pnpm-lock.yaml, pnpm-workspace.yaml
├── Copy each service's package.json
├── Copy libs/shared/package.json
└── Run: pnpm install --frozen-lockfile
```

### Stage 2: `source` (Full workspace)

```
FROM deps
└── Copy all source code (COPY . .)
    Used by the "migrate" service to run prisma migrate deploy
```

### Stage 3: `builder` (Compile service)

```
FROM source
├── ARG SERVICE_NAME (passed at build time)
├── Set dummy DATABASE_URL (prisma generate needs it, doesn't connect)
├── Run: prisma generate (creates TypeScript client)
└── Run: nx build (compiles TypeScript to JavaScript)
```

### Stage 4: `production` (Minimal runtime)

```
FROM node:20-alpine (clean image)
├── Copy node_modules from builder
├── Copy compiled dist/ from builder
└── CMD: node dist/main.js
```

Each service is built by passing `SERVICE_NAME` as a build argument:

```bash
docker build --build-arg SERVICE_NAME=tenant-service -t tenant-service .
```

Docker Compose does this automatically via `args:` in `docker-compose.yml`.

---

## Common Commands

### Build & Start

```bash
# Build all images (first time or after Dockerfile changes)
docker compose build

# Start all containers (detached)
docker compose up -d

# Build + start in one command
docker compose up -d --build
```

### View Logs

```bash
# All services
docker compose logs -f

# Single service
docker compose logs -f tenant-service

# Last 50 lines
docker compose logs --tail=50 tenant-service
```

### Stop

```bash
# Stop all containers (keeps data)
docker compose down

# Stop and delete all data (database + Redis)
docker compose down -v
```

### Rebuild After Code Changes

```bash
# Rebuild specific service
docker compose build tenant-service

# Rebuild and restart
docker compose up -d --build tenant-service
```

### Rebuild Everything

```bash
docker compose build --no-cache
docker compose up -d
```

---

## Services in docker-compose.yml

### Infrastructure

| Service | Image | Port | Purpose |
|---------|-------|------|---------|
| postgres | postgres:15-alpine | 5432 | Database (arc_db) |
| redis | redis:7-alpine | 6379 | Cache for license-service |

### Migrate (runs once, then exits)

- Uses the `source` stage of the Dockerfile (has all source code + Prisma CLI)
- Runs `prisma migrate deploy` for all 5 services sequentially
- Other services wait for migrate to complete before starting (`depends_on: condition: service_completed_successfully`)

### Microservices

| Service | HTTP | TCP | Special Config |
|---------|------|-----|----------------|
| tenant-service | 6003 | 5003 | - |
| users-service | 6004 | 5004 | - |
| audit-service | 6002 | 5002 | - |
| auth-service | 6001 | 5001 | TCP hosts for users + tenant, JWT from env |
| license-service | 6005 | 5005 | Redis host, ON_PREM flag, TCP hosts |

---

## Environment Variables in Docker

Variables come from two sources:

### 1. `env_file: .env.docker` (shared by all services)

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/arc_db?schema=public
JWT_SECRET=your-secret
```

### 2. `environment:` block (service-specific overrides)

```yaml
auth-service:
  environment:
    USERS_SERVICE_HOST: users-service      # Docker service name
    TENANT_SERVICE_HOST: tenant-service    # Docker service name
```

Service-specific `environment:` values override `env_file` values.

---

## Docker Networking

Inside Docker Compose, containers connect by **service name**, not `localhost`:

| Local | Docker |
|-------|--------|
| `localhost:5432` | `postgres:5432` |
| `localhost:6379` | `redis:6379` |
| `localhost:5003` (tenant TCP) | `tenant-service:5003` |
| `localhost:5004` (users TCP) | `users-service:5004` |

This is why services have `*_SERVICE_HOST` env vars — they resolve to container names in Docker but default to `localhost` for local development.

---

## Port Conflicts

If you run both local (`nx serve`) and Docker simultaneously, ports will conflict.

**Solution**: Stop one before starting the other:

```bash
# Stop local services first
Ctrl+C in terminal

# Then start Docker
docker compose up -d
```

Or vice versa:

```bash
# Stop Docker first
docker compose down

# Then start local
pnpm nx run-many --target=serve ...
```

---

## Inspecting Containers

```bash
# List running containers
docker compose ps

# Shell into a container
docker compose exec tenant-service sh

# Check container resource usage
docker stats
```

---

## Troubleshooting

### "Cannot connect to the Docker daemon"

Docker Desktop is not running. Start Docker Desktop.

### Migration fails with "connection refused"

The postgres container isn't healthy yet. Wait and retry:

```bash
docker compose down
docker compose up -d
```

### Prisma generate fails during build

The Dockerfile needs a dummy `DATABASE_URL`. Check the builder stage has:

```dockerfile
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
```

### "ENOSPC: no space left on device"

Docker ran out of disk space. Clean up:

```bash
docker system prune -a
```
