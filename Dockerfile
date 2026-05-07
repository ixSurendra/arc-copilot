# ================================================================
# Multi-stage Dockerfile for ix-copilot NestJS microservices
# Usage:
#   docker build --build-arg SERVICE_NAME=tenant-service -t tenant-service .
#   docker build --build-arg SERVICE_NAME=auth-service -t auth-service .
# ================================================================

# ----------------------------------------------------------------
# Stage 1: Install dependencies (cached layer)
# ----------------------------------------------------------------
FROM node:20-alpine AS deps

RUN corepack enable pnpm

WORKDIR /app

# Copy root workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy all workspace package.json files (pnpm needs workspace structure)
COPY apps/audit-service/package.json   ./apps/audit-service/package.json
COPY apps/auth-service/package.json    ./apps/auth-service/package.json
COPY apps/tenant-service/package.json  ./apps/tenant-service/package.json
COPY apps/users-service/package.json   ./apps/users-service/package.json
COPY apps/license-service/package.json ./apps/license-service/package.json
COPY apps/admin-portal/package.json   ./apps/admin-portal/package.json
COPY apps/admin-ui/package.json       ./apps/admin-ui/package.json
COPY libs/shared/package.json          ./libs/shared/package.json

# Install all dependencies (frozen lockfile ensures reproducible builds)
RUN pnpm install --frozen-lockfile

# ----------------------------------------------------------------
# Stage 2: Source — full workspace with source code
#   Used by the `migrate` service in docker-compose
# ----------------------------------------------------------------
FROM deps AS source

COPY . .

# ----------------------------------------------------------------
# Stage 3: Build a specific service
# ----------------------------------------------------------------
FROM source AS builder

ARG SERVICE_NAME

# Disable Nx daemon, plugin workers, and Nx Cloud — they cannot run inside Docker containers
ENV NX_DAEMON=false
ENV NX_ISOLATE_PLUGINS=false
ENV NX_NO_CLOUD=true

# Dummy DATABASE_URL — prisma generate doesn't connect to DB but the
# config file references this env var so it must be present.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"

# Generate Prisma client (skipped for services without a schema, e.g. admin-portal)
RUN if [ -f apps/${SERVICE_NAME}/prisma/schema.prisma ]; then \
      cd apps/${SERVICE_NAME} && npx prisma generate; \
    else \
      echo "No Prisma schema found — skipping prisma generate"; \
    fi

# Build the service with Nx (webpack bundles to apps/<service>/dist/main.js)
RUN npx nx run ${SERVICE_NAME}:build

# Ensure the generated directory exists (even for services without Prisma, e.g. admin-portal)
RUN mkdir -p apps/${SERVICE_NAME}/generated

# ----------------------------------------------------------------
# Stage 4: Production — minimal runtime image
# ----------------------------------------------------------------
FROM node:20-alpine AS production

ENV NODE_ENV=production
WORKDIR /app

# Copy node_modules from builder stage.
# Each service's Prisma client is generated locally (apps/<service>/generated/prisma)
# and bundled into the webpack output, so no native query engine binary is needed
# (driver adapters mode uses @prisma/adapter-pg instead).
COPY --from=builder /app/node_modules ./node_modules

# Copy the built application
ARG SERVICE_NAME
COPY --from=builder /app/apps/${SERVICE_NAME}/dist ./dist

# Copy the generated Prisma client (webpack externalizes it to apps/<service>/generated/prisma)
COPY --from=builder /app/apps/${SERVICE_NAME}/generated ./apps/${SERVICE_NAME}/generated

CMD ["node", "dist/main.js"]
