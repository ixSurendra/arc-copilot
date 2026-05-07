# Cloud Deployment

How to deploy ix-copilot as a cloud SaaS platform on AWS, GCP, or Azure.

---

## Overview

Cloud deployment uses the **same Docker images** as on-prem but with different environment variables:

- `ON_PREM=false` (no license file needed)
- `NODE_ENV=production` (Swagger disabled)
- Database and Redis are managed cloud services (not Docker containers)
- No `docker-compose` — the cloud platform handles orchestration

---

## Key Principle: Same Image, Different Config

```
One Dockerfile  -->  One Image  -->  Two Deployments
                                     |
                                     +--> On-Prem (ON_PREM=true, license.lic)
                                     |
                                     +--> Cloud   (ON_PREM=false, no license)
```

The code already handles both modes. The only difference is environment variables.

---

## Cloud Infrastructure Requirements

| Component | Cloud Service | Purpose |
|-----------|--------------|---------|
| Container Orchestration | AWS ECS / GKE / Azure Container Apps | Runs service containers |
| Container Registry | AWS ECR / GCR / GHCR | Stores Docker images |
| PostgreSQL | AWS RDS / GCP Cloud SQL / Azure DB | Managed database |
| Redis | AWS ElastiCache / GCP Memorystore | Managed cache |
| Load Balancer | AWS ALB / GCP Cloud LB | Routes HTTP traffic |
| Service Discovery | AWS Cloud Map / K8s DNS | TCP inter-service communication |
| Secrets Manager | AWS Secrets Manager / GCP Secret Manager | Stores env vars securely |
| CI/CD | GitHub Actions / GitLab CI | Automated build and deploy |

---

## Environment Variables for Cloud

Same variables as local/Docker, but stored in the cloud platform's secrets manager:

| Variable | Value | Source |
|----------|-------|--------|
| `NODE_ENV` | `production` | Task definition |
| `ON_PREM` | `false` | Task definition |
| `DATABASE_URL` | `postgresql://user:pass@rds-endpoint:5432/arc_db` | Secrets Manager |
| `JWT_SECRET` | `<strong-random-secret>` | Secrets Manager |
| `JWT_EXPIRATION` | `15m` | Task definition |
| `JWT_REFRESH_EXPIRATION_DAYS` | `7` | Task definition |
| `REDIS_HOST` | `my-cluster.cache.amazonaws.com` | Task definition |
| `REDIS_PORT` | `6379` | Task definition |
| `USERS_SERVICE_HOST` | `users-service.internal` | Service discovery |
| `TENANT_SERVICE_HOST` | `tenant-service.internal` | Service discovery |
| `AUDIT_SERVICE_HOST` | `audit-service.internal` | Service discovery |

---

## CI/CD Pipeline

### Build Phase

```bash
# 1. Build all service images
docker compose -f docker-compose.yml build

# 2. Tag for cloud registry
docker tag ix-copilot-tenant-service  <registry>/ix-copilot/tenant-service:$VERSION
docker tag ix-copilot-users-service   <registry>/ix-copilot/users-service:$VERSION
docker tag ix-copilot-audit-service   <registry>/ix-copilot/audit-service:$VERSION
docker tag ix-copilot-auth-service    <registry>/ix-copilot/auth-service:$VERSION
docker tag ix-copilot-license-service <registry>/ix-copilot/license-service:$VERSION

# 3. Push to registry
docker push <registry>/ix-copilot/tenant-service:$VERSION
docker push <registry>/ix-copilot/users-service:$VERSION
docker push <registry>/ix-copilot/audit-service:$VERSION
docker push <registry>/ix-copilot/auth-service:$VERSION
docker push <registry>/ix-copilot/license-service:$VERSION
```

### Migrate Phase

Run database migrations before deploying new containers:

```bash
DATABASE_URL=$DATABASE_URL npx prisma migrate deploy --schema apps/tenant-service/prisma/schema.prisma
DATABASE_URL=$DATABASE_URL npx prisma migrate deploy --schema apps/users-service/prisma/schema.prisma
DATABASE_URL=$DATABASE_URL npx prisma migrate deploy --schema apps/auth-service/prisma/schema.prisma
DATABASE_URL=$DATABASE_URL npx prisma migrate deploy --schema apps/license-service/prisma/schema.prisma
DATABASE_URL=$DATABASE_URL npx prisma migrate deploy --schema apps/audit-service/prisma/schema.prisma
```

### Deploy Phase

Update the container images in the cloud platform (ECS task definition, K8s deployment, etc.) to the new version. The platform handles rolling updates with zero downtime.

---

## Cloud vs Docker Compose Mapping

| Docker Compose Concept | Cloud Equivalent |
|----------------------|------------------|
| `services: postgres` | AWS RDS / Cloud SQL (managed) |
| `services: redis` | AWS ElastiCache / Memorystore (managed) |
| `services: migrate` | CI/CD pipeline step or init container |
| `services: tenant-service` | ECS Service / K8s Deployment |
| `env_file: .env.docker` | Secrets Manager + task definition |
| `ports: '6003:6003'` | Load Balancer target group |
| `depends_on` | Service discovery + health checks |
| `volumes: pgdata` | Managed storage (automatic) |
| `restart: unless-stopped` | Platform auto-restart (built-in) |

---

## No New Files Needed

Cloud deployment requires **no new files** in the codebase:

- Same `Dockerfile` (builds the same images)
- Same source code (same behavior via env vars)
- No `docker-compose.cloud.yml` (cloud platforms have their own config)
- Infrastructure is configured in the cloud platform's console or via IaC (Terraform, Pulumi, etc.)

---

## What Cloud Mode Disables

When `ON_PREM=false` (cloud):

| Feature | Status |
|---------|--------|
| `OnPremLicenseModule` | Not loaded (conditional import) |
| `OnPremLicenseGuard` | Skips all checks (returns `true`) |
| `LicenseCronService` | Does not run daily license check |
| License file | Not needed, not read |
| `POST /on-prem/license` | 403 (OnPremGuard blocks) |
| `GET /on-prem/license/status` | 403 (OnPremGuard blocks) |

Everything else (quota, usage, plans, features, auth, tenants, users, audit) works identically in both modes.
