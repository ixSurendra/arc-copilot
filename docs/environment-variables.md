# Environment Variables

Complete reference of all environment variables used across all deployment modes.

---

## Env Files Summary

| File | Purpose | Committed? | Used By |
|------|---------|------------|---------|
| `.env` | Local development (root) | No | `nx serve` (all services) |
| `.env.example` | Template for `.env` | Yes | Developers |
| `apps/auth-service/.env` | Auth service local config | No | auth-service only |
| `apps/auth-service/.env.example` | Template | Yes | Developers |
| `apps/license-service/.env` | License service local config | No | license-service only |
| `apps/license-service/.env.example` | Template | Yes | Developers |
| `.env.docker` | Docker Compose dev | No | `docker compose up` |
| `.env.docker.example` | Template for `.env.docker` | Yes | Developers |
| `.env.onprem` | On-prem customer env | No | `docker compose -f docker-compose.onprem.yml` |
| `.env.onprem.example` | Template for `.env.onprem` | Yes | Customers |

---

## All Variables by Category

### Database

| Variable | Description | Example | Used By |
|----------|-------------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/ix_db?schema=public` | All services |
| `POSTGRES_PASSWORD` | PostgreSQL password (Docker only) | `postgres` | docker-compose postgres container |

### Authentication (auth-service)

| Variable | Description | Default | Used By |
|----------|-------------|---------|---------|
| `JWT_SECRET` | Secret key for signing JWT tokens | `dev-secret` | auth-service |
| `JWT_EXPIRATION` | Access token lifetime | `15m` | auth-service |
| `JWT_REFRESH_EXPIRATION_DAYS` | Refresh token lifetime in days | `7` | auth-service |

### Redis (license-service)

| Variable | Description | Default | Used By |
|----------|-------------|---------|---------|
| `REDIS_HOST` | Redis server hostname | `localhost` | license-service |
| `REDIS_PORT` | Redis server port | `6379` | license-service |

### On-Prem License

| Variable | Description | Default | Used By |
|----------|-------------|---------|---------|
| `ON_PREM` | Enable on-prem mode | `false` | license-service (AppModule) |
| `ONPREM_LICENSE_PRIVATE_KEY` | Base64-encoded RSA private key (for signing) | - | license-service (cloud only) |
| `ONPREM_LICENSE_PUBLIC_KEY` | Base64-encoded RSA public key (for validation) | - | license-service (on-prem only) |
| `LICENSE_FILE_PATH` | Path to the `.lic` file | `/opt/ix-copilot/license/license.lic` | license-service |

### TCP Inter-Service Communication

| Variable | Description | Default | Used By |
|----------|-------------|---------|---------|
| `USERS_SERVICE_HOST` | Hostname of users-service TCP | `localhost` | auth-service |
| `TENANT_SERVICE_HOST` | Hostname of tenant-service TCP | `localhost` | auth-service, license-service |
| `AUDIT_SERVICE_HOST` | Hostname of audit-service TCP | `localhost` | license-service |

### Application

| Variable | Description | Default | Used By |
|----------|-------------|---------|---------|
| `NODE_ENV` | Runtime environment | `production` (in Dockerfile) | All services |

### Docker Registry (on-prem compose only)

| Variable | Description | Default | Used By |
|----------|-------------|---------|---------|
| `REGISTRY` | Docker registry URL | `ghcr.io/your-org` | docker-compose.onprem.yml |
| `IMAGE_TAG` | Docker image version tag | `latest` | docker-compose.onprem.yml |

---

## Variables by Deployment Mode

### Local Development

Source: `.env` (root) + `apps/<service>/.env`

```env
# .env (root)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ix_db?schema=public

# apps/auth-service/.env
JWT_SECRET=dev-secret
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION_DAYS=7

# apps/license-service/.env
REDIS_HOST=localhost
REDIS_PORT=6379
ON_PREM=false
```

All `*_SERVICE_HOST` variables default to `localhost` (no need to set them).

### Docker Development

Source: `.env.docker`

```env
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/ix_db?schema=public
JWT_SECRET=docker-jwt-secret-change-in-production
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION_DAYS=7
```

Plus `environment:` blocks in `docker-compose.yml` set:

```
USERS_SERVICE_HOST=users-service
TENANT_SERVICE_HOST=tenant-service
AUDIT_SERVICE_HOST=audit-service
REDIS_HOST=redis
ON_PREM=false
```

### On-Prem Production

Source: `.env.onprem`

```env
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgresql://postgres:<password>@postgres:5432/ix_db?schema=public
JWT_SECRET=<strong-secret>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION_DAYS=7
ONPREM_LICENSE_PUBLIC_KEY=<Base64-public-key>
REGISTRY=ghcr.io/your-org
IMAGE_TAG=1.0.0
```

Plus `environment:` blocks in `docker-compose.onprem.yml` set:

```
NODE_ENV=production
ON_PREM=true
USERS_SERVICE_HOST=users-service
TENANT_SERVICE_HOST=tenant-service
AUDIT_SERVICE_HOST=audit-service
REDIS_HOST=redis
LICENSE_FILE_PATH=/opt/ix-copilot/license/license.lic
```

### Cloud Production

Source: Cloud Secrets Manager + task definitions

```
NODE_ENV=production
ON_PREM=false
DATABASE_URL=postgresql://user:pass@rds-endpoint:5432/ix_db
JWT_SECRET=<from-secrets-manager>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION_DAYS=7
REDIS_HOST=my-cluster.cache.amazonaws.com
REDIS_PORT=6379
USERS_SERVICE_HOST=users-service.internal
TENANT_SERVICE_HOST=tenant-service.internal
AUDIT_SERVICE_HOST=audit-service.internal
```

---

## Variable Priority (Docker Compose)

When using Docker Compose, variables are resolved in this order (highest priority first):

1. `environment:` block in compose file (service-specific)
2. `env_file:` values (shared file)
3. Shell environment variables
4. Defaults in application code (`process.env['VAR'] || 'default'`)

This means `environment:` overrides `env_file:`. For example, `ON_PREM: 'true'` in the compose file overrides anything in `.env.onprem`.

---

## Security Rules

| Rule | Reason |
|------|--------|
| Never commit `.env`, `.env.docker`, `.env.onprem` | They contain secrets |
| Never hardcode secrets in `docker-compose.yml` | It's committed to git |
| Use `${VARIABLE}` references in compose files | Values come from gitignored env files |
| `ONPREM_LICENSE_PRIVATE_KEY` only on YOUR server | Anyone with it can forge licenses |
| Customer generates their own `JWT_SECRET` | Different per deployment |
| Use Secrets Manager in cloud | No env files on cloud servers |
