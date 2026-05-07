# On-Prem Deployment

How to deploy ix-copilot on a customer's own server using pre-built Docker images and a signed license file.

---

## Overview

On-prem deployment means the customer runs the system on **their own infrastructure**. They receive:

- Pre-built Docker images (from your private registry)
- A signed license file (`.lic`)
- A public key (for license validation)
- No source code

The system runs with `ON_PREM=true`, which enables the license module that validates the `.lic` file on every request.

---

## Files Overview

| File | Purpose | Committed? |
|------|---------|------------|
| `docker-compose.onprem.yml` | Production on-prem compose (uses `image:`, not `build:`) | Yes |
| `.env.onprem.example` | Template for customer to fill in | Yes |
| `.env.onprem` | Customer's actual env file (contains secrets) | No (gitignored) |

---

## Vendor Workflow (What You Do)

### 1. One-Time: Generate RSA Keys

```bash
npx ts-node tools/generate-license-keys.ts
```

This creates:

```
tools/keys/
  private.pem   -- KEEP SECRET (your cloud server only)
  public.pem    -- Ship with on-prem deployments
```

And prints Base64 versions for `.env` files. See [License Key Management](./license-key-management.md) for details.

### 2. Build Docker Images

```bash
docker compose -f docker-compose.yml build
```

### 3. Tag Images for Registry

```bash
docker tag ix-copilot-tenant-service  ghcr.io/your-org/ix-copilot/tenant-service:1.0.0
docker tag ix-copilot-users-service   ghcr.io/your-org/ix-copilot/users-service:1.0.0
docker tag ix-copilot-audit-service   ghcr.io/your-org/ix-copilot/audit-service:1.0.0
docker tag ix-copilot-auth-service    ghcr.io/your-org/ix-copilot/auth-service:1.0.0
docker tag ix-copilot-license-service ghcr.io/your-org/ix-copilot/license-service:1.0.0
```

### 4. Build and Tag the Migrate Image

```bash
docker build --target source -t ghcr.io/your-org/ix-copilot/migrate:1.0.0 .
```

### 5. Push All Images

```bash
docker push ghcr.io/your-org/ix-copilot/tenant-service:1.0.0
docker push ghcr.io/your-org/ix-copilot/users-service:1.0.0
docker push ghcr.io/your-org/ix-copilot/audit-service:1.0.0
docker push ghcr.io/your-org/ix-copilot/auth-service:1.0.0
docker push ghcr.io/your-org/ix-copilot/license-service:1.0.0
docker push ghcr.io/your-org/ix-copilot/migrate:1.0.0
```

### 6. Generate License for the Customer

The license generator reads the tenant's plan and features directly from the database:

```bash
# Requires DATABASE_URL pointing to the license-service DB with tenant/plan data
DATABASE_URL=postgresql://... npx tsx tools/generate-license-file.ts <TENANT_ID>
```

This will:
- Validate the tenant exists in the TENANTS table
- Read the tenant's plan and enabled features from PLAN + PLAN_FEATURE_QUOTA + FEATURE_REGISTRY
- Generate a signed `license/license.lic` (1-year validity)
- Store a TENANT_LICENSE record in the DB (visible in admin portal)

**Alternative** -- via license-service API (requires running service with private key):

```bash
curl -X POST http://localhost:6005/on-prem/license \
  -H "Content-Type: application/json" \
  -d '{"tenantId": 8, "cycle": "ANNUALLY"}' \
  -o license/license.lic
```

---

## Deployment Package

Create a zip/tar containing:

```
ix-copilot-onprem/
  docker-compose.onprem.yml     # Compose file (from repo)
  .env.onprem.example           # Template (from repo)
  license/
    license.lic                  # Customer's signed license
```

Provide separately:

- **Public key** (Base64 string for `ONPREM_LICENSE_PUBLIC_KEY`)
- **Registry credentials** (or export images as `.tar` files for air-gapped networks)

---

## Customer Setup (What They Do)

### 1. Prerequisites

- Linux server with Docker and Docker Compose installed
- Network access to your Docker registry (or pre-loaded images)

### 2. Extract Deployment Package

```bash
tar -xzf ix-copilot-onprem.tar.gz
cd ix-copilot-onprem
```

### 3. Configure Environment

```bash
cp .env.onprem.example .env.onprem
```

Edit `.env.onprem`:

```env
POSTGRES_PASSWORD=<strong-password>
DATABASE_URL=postgresql://postgres:<same-password>@postgres:5432/arc_db?schema=public
JWT_SECRET=<generate-with: openssl rand -base64 64>
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION_DAYS=7
ONPREM_LICENSE_PUBLIC_KEY=<Base64-string-provided-by-vendor>
REGISTRY=ghcr.io/your-org
IMAGE_TAG=1.0.0
```

### 4. Place License File

The license file should already be in `license/license.lic`. Verify it exists:

```bash
ls license/license.lic
```

### 5. Login to Registry (if private)

```bash
docker login ghcr.io
```

### 6. Start the System

```bash
docker compose --env-file .env.onprem -f docker-compose.onprem.yml up -d
```

### 7. Verify

```bash
# Check all containers are running
docker compose --env-file .env.onprem -f docker-compose.onprem.yml ps

# Check logs
docker compose --env-file .env.onprem -f docker-compose.onprem.yml logs -f

# Verify license status
curl http://localhost:6005/on-prem/license/status
```

Expected license response:

```json
{
  "status": "VALID",
  "isValid": true,
  "tenantId": "abc-123-...",
  "expiresAt": "2027-03-04T00:00:00.000Z",
  "daysRemaining": 365,
  "message": "License is valid. Expires in 365 day(s)."
}
```

---

## Customer Operations

### View Logs

```bash
docker compose --env-file .env.onprem -f docker-compose.onprem.yml logs -f
docker compose --env-file .env.onprem -f docker-compose.onprem.yml logs -f license-service
```

### Stop the System

```bash
docker compose --env-file .env.onprem -f docker-compose.onprem.yml down
```

### Restart

```bash
docker compose --env-file .env.onprem -f docker-compose.onprem.yml restart
```

---

## Customer Updates

When you release a new version:

### 1. You Push New Images

```bash
docker push ghcr.io/your-org/ix-copilot/tenant-service:1.1.0
# ... all services
```

### 2. Customer Updates Version

Edit `.env.onprem`:

```env
IMAGE_TAG=1.1.0
```

### 3. Customer Pulls & Restarts

```bash
docker compose --env-file .env.onprem -f docker-compose.onprem.yml pull
docker compose --env-file .env.onprem -f docker-compose.onprem.yml up -d
```

The migrate service runs automatically on startup, applying any new database migrations.

---

## Air-Gapped Deployment (No Internet)

For customers without internet access, export images as tar files:

### You (vendor):

```bash
docker save ghcr.io/your-org/ix-copilot/tenant-service:1.0.0 \
            ghcr.io/your-org/ix-copilot/users-service:1.0.0 \
            ghcr.io/your-org/ix-copilot/audit-service:1.0.0 \
            ghcr.io/your-org/ix-copilot/auth-service:1.0.0 \
            ghcr.io/your-org/ix-copilot/license-service:1.0.0 \
            ghcr.io/your-org/ix-copilot/migrate:1.0.0 \
            -o ix-copilot-images-1.0.0.tar
```

### Customer:

```bash
docker load -i ix-copilot-images-1.0.0.tar
docker compose --env-file .env.onprem -f docker-compose.onprem.yml up -d
```

---

## External Database / Redis (Customer-Managed Infrastructure)

Some customers already have PostgreSQL and/or Redis running on their own servers.
Use `EXTERNAL_DB=true` and/or `EXTERNAL_REDIS=true` in `.env` to skip Docker containers for those services.

### Configuration

In `.env.onprem` (or `.env` in the delivery package):

```env
# Skip Docker postgres — use customer's own PostgreSQL
EXTERNAL_DB=true
DATABASE_URL=postgresql://myuser:mypass@192.168.1.50:5432/arc_db?schema=public

# Skip Docker redis — use customer's own Redis
EXTERNAL_REDIS=true
REDIS_HOST=192.168.1.50
REDIS_PORT=6379
```

### Requirements for External PostgreSQL

- PostgreSQL **15 or higher**
- The database must already exist (`CREATE DATABASE arc_db` — migrations do NOT create it)
- The DB user must have full DDL permissions (`CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX`, etc.)
- PostgreSQL must accept connections from Docker containers:
  - Check `pg_hba.conf` allows the Docker network range
  - Firewall rules allow port 5432 from Docker bridge (`172.17.0.0/16`)
- **Hostname tips:**
  - macOS/Windows: use `host.docker.internal` if PostgreSQL runs on the same machine
  - Linux: use the host's actual IP address (not `localhost` or `127.0.0.1`)

### Requirements for External Redis

- Redis **7 or higher**
- Must accept connections from Docker containers (same firewall considerations)

### What Happens When External

| `EXTERNAL_DB` | Postgres container | `depends_on: postgres` | `DATABASE_URL` |
|----------------|-------------------|------------------------|-----------------|
| `false` (default) | Starts in Docker | Active (waits for healthcheck) | Points to Docker hostname `postgres` |
| `true` | Not started | Removed (migrate retries connection) | Points to customer's host |

| `EXTERNAL_REDIS` | Redis container | `REDIS_HOST` |
|-------------------|-----------------|--------------|
| `false` (default) | Starts in Docker | `redis` (Docker service name) |
| `true` | Not started | Customer's Redis host |

### setup.sh Behavior

The setup script reads `EXTERNAL_DB` and `EXTERNAL_REDIS` from `.env` and adapts:
- Skips pulling Docker images for external services
- Skips starting external service containers
- Tests database connectivity before running migrations (with helpful error messages)
- Uses `--profile managed-db` / `--profile managed-redis` flags to control Docker Compose profiles

---

## On-Prem vs Cloud Differences

| Aspect | On-Prem | Cloud |
|--------|---------|-------|
| `ON_PREM` | `true` | `false` |
| License file | Required | Not needed |
| License guard | Active (blocks if expired) | Skipped |
| Swagger | Disabled (`NODE_ENV=production`) | Disabled |
| Database | Docker or external (`EXTERNAL_DB`) | Managed service (RDS/Cloud SQL) |
| Redis | Docker or external (`EXTERNAL_REDIS`) | Managed service (ElastiCache) |
| Updates | Customer pulls new images | CI/CD auto-deploys |

---

## License Expiry Behavior

| Status | What Happens |
|--------|-------------|
| `VALID` | Everything works normally |
| `EXPIRING_SOON` (within 30 days) | Everything works, warning in logs daily |
| `EXPIRED` | All endpoints return 403 except `/health` and `/on-prem/license/status` |
| `INVALID_SIGNATURE` | All endpoints return 403 (license was tampered with) |
| `FILE_NOT_FOUND` | All endpoints return 403 (license file missing) |

To renew: generate a new `license.lic` and replace the file. The license guard re-checks every 5 minutes.
