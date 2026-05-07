# On-Prem Delivery Package — Complete Guide

End-to-end process for creating a delivery package and setting up ix-copilot on a customer's on-prem device. This guide covers both sides: what you (the vendor) do, and what the customer does.

---

## Table of Contents

- [How On-Prem Works](#how-on-prem-works)
- [Part 1: Vendor — Create the Delivery Package (One Command)](#part-1-vendor--create-the-delivery-package-one-command)
- [Part 2: Shipping to the Customer](#part-2-shipping-to-the-customer)
- [Part 3: Customer — On-Prem Device Setup](#part-3-customer--on-prem-device-setup)
- [Part 4: Customer — Day-to-Day Operations](#part-4-customer--day-to-day-operations)
- [Part 5: Vendor — Ongoing Maintenance](#part-5-vendor--ongoing-maintenance)
- [Part 6: Manual Build Steps (Reference)](#part-6-manual-build-steps-reference)
- [Appendix A: Architecture in On-Prem Mode](#appendix-a-architecture-in-on-prem-mode)
- [Appendix B: Troubleshooting](#appendix-b-troubleshooting)
- [Appendix C: Security Checklist](#appendix-c-security-checklist)

---

## How On-Prem Works

In on-prem mode, the customer runs the entire ix-copilot stack on their own server using Docker. No source code is shipped — only pre-built Docker images and a signed license file.

### What the Customer Receives

A single archive (~800 MB) containing everything needed to run the system:

```
ix-copilot-onprem-<date>.tar.gz
├── docker-compose.yml       — Defines the entire stack (10 containers)
├── .env                     — Pre-filled configuration (unique secrets per customer)
├── .env.example             — Blank template for reference
├── license/
│   └── license.lic          — Signed license file (RSA-SHA256, 1-year validity)
├── images.tar               — All 8 Docker images (offline-ready, no internet needed)
├── setup.sh                 — Automated setup script (Linux/macOS)
├── setup.ps1                — Automated setup script (Windows PowerShell)
└── README.md                — Customer-facing setup guide
```

### What Makes On-Prem Different from Cloud

When `ON_PREM=true` is set in the environment:

| Behavior | On-Prem (`ON_PREM=true`) | Cloud (`ON_PREM=false`) |
|----------|--------------------------|------------------------|
| License enforcement | Every HTTP request validated against `license.lic` | No license needed |
| OnPremLicenseModule | Loaded (cron job, validation endpoints, guard) | Not loaded |
| SuperAdminGuard | Blocked (no super admin in on-prem) | Normal |
| Super admin seeding | Skipped entirely | Creates system tenant (ID=0) + admin user |
| Swagger API docs | Disabled (`NODE_ENV=production`) | Disabled (`NODE_ENV=production`) |
| Docker images | Customer loads from `images.tar` (offline) | CI/CD auto-deploys |
| Database | Local PostgreSQL container | Managed service (RDS/Cloud SQL) |
| Redis | Local Redis container | Managed service (ElastiCache) |

### License Enforcement Flow

Every HTTP request to the license-service goes through this chain:

```
HTTP Request
    │
    ▼
JwtAuthGuard ──────── validates Bearer token from Authorization header
    │
    ▼
OnPremLicenseGuard ── reads license.lic from disk (result cached for 5 minutes)
    │                     │
    │            ┌────────┴─────────────┐
    │            │ Whitelisted paths:   │
    │            │   /health            │ ← always allowed (for Docker healthchecks)
    │            │   /on-prem/license/  │ ← always allowed (so customer can check status)
    │            └──────────────────────┘
    │
    ├── VALID ──────────── request proceeds normally
    ├── EXPIRING_SOON ──── request proceeds + daily warning in logs
    └── EXPIRED/INVALID ── 403 Forbidden (all other endpoints blocked)
```

### What Happens When a License Expires

| License Status | `isValid` | Application Behavior |
|---------------|-----------|---------------------|
| `VALID` | `true` | Everything works normally |
| `EXPIRING_SOON` (< 30 days left) | `true` | Everything works, daily warning in logs |
| `EXPIRED` | `false` | **All endpoints return 403** except `/health` and `/on-prem/license/status` |
| `INVALID_SIGNATURE` | `false` | **All endpoints return 403** — license file was tampered with |
| `FILE_NOT_FOUND` | `false` | **All endpoints return 403** — `license.lic` is missing from disk |
| `MALFORMED` | `false` | **All endpoints return 403** — file exists but is not valid JSON |

---

## Part 1: Vendor — Create the Delivery Package (One Command)

The entire delivery package is created with a single script. It handles everything automatically: RSA key generation, license file creation, Docker image building, secret generation, and archive packaging.

### Prerequisites on Your Machine

| Requirement | Version | Check Command |
|-------------|---------|---------------|
| Docker Engine (running) | 20.10+ | `docker info` |
| Node.js | 20+ | `node --version` |
| pnpm | 8+ | `pnpm --version` |
| OpenSSL | Any | `openssl version` |

### Run the Build Script

```bash
cd /path/to/ix-copilot

# DATABASE_URL is required for license generation from database
# Set via env var or add to delivery-package/.env
chmod +x tools/build-onprem-package.sh
DATABASE_URL=postgresql://... TENANT_ID=8 ./tools/build-onprem-package.sh
```

### What the Script Does (Step by Step)

The script runs 7 steps automatically. Here's exactly what happens at each step:

**Step 1 — Prerequisite checks**
- Verifies Docker is running
- Verifies `Dockerfile` and `Dockerfile.nextjs` exist (must run from project root)
- Verifies `npx` is available (Node.js installed)

**Step 2 — RSA key pair**
- Checks if `tools/keys/private.pem` and `tools/keys/public.pem` already exist
- If missing: runs `npx ts-node tools/generate-license-keys.ts` to generate a new RSA 2048-bit key pair
- If present: skips (reuses existing keys)
- Reads the public key as Base64 for embedding in the customer's `.env`

**Step 3 — License file (from database)**
- Requires `DATABASE_URL` (set via env var or `delivery-package/.env`)
- Reads `TENANT_ID` from: env var > `delivery-package/.env` > default 1
- Checks if `license/license.lic` already exists
- If missing: runs `npx tsx tools/generate-license-file.ts` to generate a signed license
  - Connects to the database and validates the tenant exists
  - Reads the tenant's plan via TENANTS.PLAN_ID, then fetches features from PLAN_FEATURE_QUOTA + FEATURE_REGISTRY
  - Generates license with features/quotas from DB (1-year validity)
  - Stores a TENANT_LICENSE record in the DB (visible in admin portal)
- If present: skips (reuses existing license)
- To regenerate: delete `license/license.lic` and re-run the script

**Step 4 — Build Docker images (takes several minutes)**
- Builds **8 Docker images** one at a time (sequential to avoid Docker daemon crashes):
  1. `local/ix-copilot/migrate:latest` — full workspace with source code for running `prisma migrate deploy`
  2. `local/ix-copilot/tenant-service:latest` — tenant lifecycle, billing, invoices
  3. `local/ix-copilot/users-service:latest` — users, roles, groups, RBAC
  4. `local/ix-copilot/audit-service:latest` — centralized audit logging
  5. `local/ix-copilot/auth-service:latest` — JWT auth, credentials, MFA, SSO
  6. `local/ix-copilot/license-service:latest` — plans, quotas, license validation
  7. `local/ix-copilot/admin-portal:latest` — BFF aggregator (proxies to all services)
  8. `local/ix-copilot/admin-ui:latest` — Next.js frontend dashboard
- NestJS services use multi-stage `Dockerfile` (deps → source → builder → production)
- Next.js uses `Dockerfile.nextjs` (deps → builder → production with standalone output)

**Step 5 — Assemble delivery package**
- Copies `license/license.lic` into `delivery-package/license/`
- **Generates a fresh `.env`** with:
  - `POSTGRES_PASSWORD` — unique random password (`openssl rand -hex 8`)
  - `DATABASE_URL` — connection string with the generated password
  - `JWT_SECRET` — unique random secret (`openssl rand -base64 64`)
  - `ONPREM_LICENSE_PUBLIC_KEY` — auto-read from `tools/keys/public.pem`
  - `REGISTRY=local` and `IMAGE_TAG=latest`
- Every run produces a **unique** `.env` (different secrets each time)

**Step 6 — Export Docker images**
- Runs `docker save` to export all 8 images into `delivery-package/images.tar` (~768 MB)
- Docker layer deduplication keeps the file size reasonable

**Step 7 — Create archive**
- Packages everything in `delivery-package/` into `ix-copilot-onprem-<date>.tar.gz`
- Includes dotfiles (`.env`, `.env.example`)
- Prints the archive contents and size for verification

### Script Output

```
━━━ Step 1: Checking prerequisites ━━━
✓ Docker is running
✓ Dockerfiles found
✓ Node.js available

━━━ Step 2: RSA key pair ━━━
✓ RSA keys already exist at tools/keys/

━━━ Step 3: License file ━━━
✓ license/license.lic already exists

━━━ Step 4: Building Docker images (this takes several minutes) ━━━
  Building migrate image...
✓ migrate
  Building tenant-service...
✓ tenant-service
  Building users-service...
✓ users-service
  Building audit-service...
✓ audit-service
  Building auth-service...
✓ auth-service
  Building license-service...
✓ license-service
  Building admin-portal...
✓ admin-portal
  Building admin-ui...
✓ admin-ui

━━━ Step 5: Assembling delivery package ━━━
✓ License file copied
✓ .env generated (unique secrets)
✓ docker-compose.yml present
✓ setup.sh present
✓ README.md present

━━━ Step 6: Exporting Docker images to images.tar ━━━
✓ Images exported (768M)

━━━ Step 7: Creating delivery archive ━━━
✓ Archive created: ix-copilot-onprem-20260309.tar.gz (769M)

━━━ Verification ━━━
  Archive contents:
    .env
    .env.example
    README.md
    docker-compose.yml
    images.tar
    license/
    license/license.lic
    setup.sh

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  On-Prem Delivery Package Ready!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Deliverable:  ix-copilot-onprem-20260309.tar.gz
  Size:         769M

  Send this file to the customer. They run:

    tar -xzf ix-copilot-onprem-20260309.tar.gz
    chmod +x setup.sh
    ./setup.sh

  That's it — one archive, one command.
```

### Customizing Per Customer

License content is now driven by the database. Before running the build script, configure the tenant and plan in the DB:

| What to Customize | How |
|-------------------|-----|
| Tenant ID | Set `TENANT_ID` env var, or add `TENANT_ID=8` to `delivery-package/.env` |
| Database connection | Set `DATABASE_URL` env var, or add it to `delivery-package/.env` |
| Licensed features | Manage features in FEATURE_REGISTRY + PLAN_FEATURE_QUOTA tables via admin portal or DB |
| Max users | Set `MAX_USERS` on the TENANTS record in the database |
| Billing cycle | Set `BILLING_CYCLE` on the TENANTS record (ANNUALLY or MONTHLY) |
| Force new license | Delete `license/license.lic` before running the script |
| Force new keys | Delete `tools/keys/` directory before running the script |

### Files Created by the Script

| File | Location | Gitignored? | Persists Between Runs? |
|------|----------|-------------|----------------------|
| `tools/keys/private.pem` | Project root | Yes | Yes (reused) |
| `tools/keys/public.pem` | Project root | Yes | Yes (reused) |
| `license/license.lic` | Project root | Yes | Yes (reused unless deleted) |
| `delivery-package/.env` | Delivery dir | N/A | Regenerated each run (fresh secrets) |
| `delivery-package/images.tar` | Delivery dir | N/A | Rebuilt each run |
| `ix-copilot-onprem-<date>.tar.gz` | Project root | Yes | New file each run |

---

## Part 2: Shipping to the Customer

### What to Send

One file:

```
ix-copilot-onprem-<date>.tar.gz    (~800 MB)
```

Everything is inside the archive. No additional files, keys, or credentials needed.

### How to Send It

**Over the network (SCP):**

```bash
scp ix-copilot-onprem-20260309.tar.gz user@customer-server:/opt/
```

**Via S3 (pre-signed URL, expires in 24 hours):**

```bash
aws s3 cp ix-copilot-onprem-20260309.tar.gz s3://your-bucket/deliveries/customer-name/
aws s3 presign s3://your-bucket/deliveries/customer-name/ix-copilot-onprem-20260309.tar.gz \
  --expires-in 86400
# Send the generated URL to the customer
```

**Via file share (Google Drive, Dropbox, etc.):**

Upload the `.tar.gz` file and share the download link.

**Air-gapped / USB drive (no internet on customer device):**

```bash
cp ix-copilot-onprem-20260309.tar.gz /Volumes/USB_DRIVE/
```

---

## Part 3: Customer — On-Prem Device Setup

### Prerequisites

**Hardware requirements:**

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| OS | Linux (Ubuntu 22.04+, CentOS 8+, Debian 11+), macOS 13+, or Windows 10/11 | Ubuntu 22.04 LTS |
| RAM | 4 GB | 8 GB |
| Disk | 20 GB free | 50 GB free |
| CPU | 2 cores | 4 cores |

**Software requirements:**

| Software | Version | How to Install |
|----------|---------|----------------|
| Docker Engine | 20.10+ | Linux: `curl -fsSL https://get.docker.com \| sh && sudo usermod -aG docker $USER` |
| Docker Compose | v2.0+ | Included with Docker Engine 20.10+ |
| Docker Desktop | Latest | macOS/Windows: https://www.docker.com/products/docker-desktop/ (includes Docker Engine + Compose) |

**Verify Docker is installed and running:**

```bash
docker --version          # Should show 20.10+
docker compose version    # Should show v2.0+
docker info               # Should not show errors
```

If `docker info` shows "Cannot connect to the Docker daemon":
- Linux: `sudo systemctl start docker`
- macOS/Windows: Open Docker Desktop application

### Step 3.1: Extract the Package

**Linux/macOS:**

```bash
# Copy archive to the server (if not already there)
# Then extract it:
cd /opt   # or wherever you want to install
tar -xzf ix-copilot-onprem-20260309.tar.gz
ls -la
```

**Windows (PowerShell):**

```powershell
# Windows 10+ has tar built-in. Or use 7-Zip.
cd C:\ix-copilot   # or wherever you want to install
tar -xzf ix-copilot-onprem-20260309.tar.gz
dir
```

You should see these files:

```
-rw-r--r--  .env                    (pre-filled configuration)
-rw-r--r--  .env.example            (blank template for reference)
-rw-r--r--  README.md               (setup guide)
-rw-r--r--  docker-compose.yml      (stack definition)
-rw-------  images.tar              (Docker images, ~768 MB)
drwxr-xr-x  license/                (contains license.lic)
-rwxr-xr-x  setup.sh                (automated setup script — Linux/macOS)
-rw-r--r--  setup.ps1               (automated setup script — Windows)
```

### Step 3.2: Start the System (Automated — Recommended)

**Linux/macOS:**

```bash
chmod +x setup.sh
./setup.sh
```

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1
```

The setup script does everything:

1. **Checks prerequisites** — Docker installed, daemon running, compose available
2. **Validates files** — `docker-compose.yml` exists, `license/license.lic` exists
3. **Validates `.env`** — all required variables are set (not placeholders)
4. **Loads Docker images** — `docker load -i images.tar` (if file exists)
5. **Starts infrastructure** — PostgreSQL and Redis containers
6. **Waits for database** — polls until PostgreSQL is accepting connections
7. **Runs migrations** — creates all database tables via Prisma
8. **Starts all services** — all 7 application services
9. **Runs health checks** — tests each service's `/health` endpoint
10. **Checks license** — calls `/on-prem/license/status` and displays the result
11. **Prints access URLs** — where to open the app

**Expected output at the end:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ix-copilot On-Prem Setup Complete!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Admin UI:        http://localhost:3000
  Admin Portal:    http://localhost:4006
  License Status:  http://localhost:4005/on-prem/license/status

  Useful commands:
    docker compose logs -f              # View all logs
    docker compose logs -f auth-service # View specific service
    docker compose ps                   # Check service status
    docker compose down                 # Stop all services
    docker compose restart              # Restart all services
```

### Step 3.3: Start the System (Manual — Alternative)

If you prefer to run each step yourself instead of using `setup.sh`:

```bash
# 1. Load Docker images from the tar file
docker load -i images.tar

# 2. Verify all 8 images loaded
docker images | grep ix-copilot

# 3. Start infrastructure (database + cache)
docker compose up -d postgres redis

# 4. Wait for PostgreSQL to be ready
echo "Waiting for database..."
until docker compose exec -T postgres pg_isready -U postgres -d ix_db 2>/dev/null; do
  sleep 2
done
echo "Database ready!"

# 5. Run database migrations (creates all tables)
docker compose up migrate

# 6. Start all application services
docker compose up -d

# 7. Check all containers are running
docker compose ps
```

### Step 3.4: Verify Everything Works

**Check container status:**

```bash
docker compose ps
```

All services should show `Up`:

```
NAME                       STATUS
postgres                   Up (healthy)
redis                      Up (healthy)
tenant-service             Up
users-service              Up
audit-service              Up
auth-service               Up
license-service            Up
admin-portal               Up
admin-ui                   Up
```

**Health check all services:**

```bash
for port in 4001 4002 4003 4004 4005 4006; do
  echo -n "Port $port: "
  curl -sf http://localhost:$port/health | python3 -c "import sys,json; print(json.load(sys.stdin)['status'])" 2>/dev/null || echo "not ready yet"
done
```

Expected output:

```
Port 4001: ok       (auth-service)
Port 4002: ok       (audit-service)
Port 4003: ok       (tenant-service)
Port 4004: ok       (users-service)
Port 4005: ok       (license-service)
Port 4006: ok       (admin-portal)
```

**Check license status:**

```bash
curl -s http://localhost:4005/on-prem/license/status | python3 -m json.tool
```

Expected:

```json
{
    "status": "VALID",
    "isValid": true,
    "tenantId": 1,
    "expiresAt": "2027-03-09T06:03:46.990Z",
    "daysRemaining": 365,
    "message": "License is valid. Expires in 365 day(s)."
}
```

### Step 3.5: Access the Application

Open a browser and navigate to:

| URL | What |
|-----|------|
| `http://<server-ip>:3000` | Admin UI — main dashboard (login page) |
| `http://<server-ip>:4005/on-prem/license/status` | License status (JSON) |

- If accessing from the same machine: use `http://localhost:3000`
- If accessing from another machine on the network: use the server's IP address

### Step 3.6: (Optional) Change Default Secrets

The `.env` comes with pre-generated secrets. For additional security, generate your own:

```bash
# Generate a new database password
NEW_DB_PASS=$(openssl rand -hex 16)
echo "New DB password: $NEW_DB_PASS"

# Generate a new JWT secret
NEW_JWT=$(openssl rand -base64 64 | tr -d '\n')
echo "New JWT secret: $NEW_JWT"

# Edit .env with the new values
nano .env
# Update POSTGRES_PASSWORD, DATABASE_URL, and JWT_SECRET

# Restart to apply (must wipe database if password changed)
docker compose down -v    # WARNING: deletes all data
docker compose up -d
```

> **Note**: Changing `POSTGRES_PASSWORD` requires wiping the database volume (`-v` flag) since PostgreSQL only sets the password on first initialization. Only do this on a fresh install.

### Startup Order (Automatic)

The `docker-compose.yml` orchestrates the startup order via `depends_on`:

```
Step 1:  postgres + redis start (infrastructure)
              │
Step 2:  migrate runs (prisma migrate deploy for all 5 services, then exits)
              │
Step 3:  seed runs (creates tenant, admin user, imports license.lic into DB, then exits)
         - Mounts license/license.lic via LICENSE_FILE_PATH
         - Seeds FEATURE_REGISTRY, ON_PREM plan, PLAN_FEATURE_QUOTA, TENANT_LICENSE
              │
Step 4:  tenant-service, users-service, audit-service start
              │
Step 5:  auth-service starts (needs users-service + tenant-service)
         license-service starts (needs redis + tenant-service)
              │
Step 6:  admin-portal starts (needs all 5 microservices)
              │
Step 7:  admin-ui starts (needs admin-portal)
```

---

## Part 4: Customer — Day-to-Day Operations

### View Logs

```bash
# All services (follow mode)
docker compose logs -f

# Specific service
docker compose logs -f auth-service
docker compose logs -f license-service

# Last 100 lines of a service
docker compose logs --tail 100 admin-portal

# Search logs for errors
docker compose logs | grep -i error
```

### Stop the System

```bash
docker compose down
```

Data is preserved in Docker volumes (`pgdata`, `redisdata`). Safe to stop and start.

### Start the System

```bash
docker compose up -d
```

### Restart a Single Service

```bash
docker compose restart auth-service
```

### Restart Everything

```bash
docker compose restart
```

### Check Service Status

```bash
docker compose ps
```

### Backup Database

```bash
# Create a timestamped backup
docker compose exec -T postgres pg_dump -U postgres ix_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup was created
ls -lh backup_*.sql
head -20 backup_*.sql
```

### Restore Database from Backup

```bash
# 1. Stop application services (keep postgres running)
docker compose stop tenant-service users-service audit-service auth-service license-service admin-portal admin-ui

# 2. Restore the backup
cat backup_20260309_120000.sql | docker compose exec -T postgres psql -U postgres ix_db

# 3. Restart everything
docker compose up -d
```

### Check Disk Usage

```bash
# Docker disk usage
docker system df

# Database size
docker compose exec -T postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('ix_db'));"

# Host disk
df -h
```

### Update License (No Restart Needed)

When you receive a new `license.lic` from the vendor:

```bash
# Replace the license file
cp new-license.lic license/license.lic

# Verify (the guard re-validates within 5 minutes automatically)
curl -s http://localhost:4005/on-prem/license/status | python3 -m json.tool

# To force immediate validation, restart the license service:
docker compose restart license-service
```

### Upgrade to a New Version

When you receive new Docker images from the vendor:

```bash
# 1. Stop the system
docker compose down

# 2. Load new images
docker load -i images-v1.1.0.tar

# 3. Update image tag in .env
sed -i 's/IMAGE_TAG=.*/IMAGE_TAG=v1.1.0/' .env

# 4. Start (the migrate service runs new database migrations automatically)
docker compose up -d

# 5. Verify
docker compose ps
curl http://localhost:4005/on-prem/license/status
```

### Reset Everything (DANGER: Deletes All Data)

```bash
docker compose down -v    # -v removes volumes (database + redis data permanently deleted)
docker compose up -d      # Fresh start with empty database
```

---

## Part 5: Vendor — Ongoing Maintenance

### Renewing an Expired License

**On your machine:**

```bash
cd /path/to/ix-copilot

# Delete the old license so a new one is generated
rm license/license.lic

# Regenerate from database (reads tenant's current plan and features)
DATABASE_URL=postgresql://... npx tsx tools/generate-license-file.ts <TENANT_ID>
```

This creates a new `license/license.lic` with a fresh 1-year expiry and stores a new TENANT_LICENSE record in the DB.

**Send the new `license/license.lic` to the customer.**

**Customer replaces the file:**

```bash
cp new-license.lic license/license.lic
# No restart needed — auto-validates within 5 minutes
```

### Releasing a New Version

**On your machine:**

```bash
cd /path/to/ix-copilot

# Option A: Use the build script (rebuilds everything)
./tools/build-onprem-package.sh
# Output: ix-copilot-onprem-<date>.tar.gz

# Option B: Build only the images and export
docker build --build-arg SERVICE_NAME=tenant-service -t local/ix-copilot/tenant-service:v1.1.0 .
# ... repeat for all services ...
docker save local/ix-copilot/migrate:v1.1.0 local/ix-copilot/tenant-service:v1.1.0 ... -o images-v1.1.0.tar
```

**Send to the customer:**
- Full archive (`ix-copilot-onprem-<date>.tar.gz`) for new installs
- Just the images file (`images-v1.1.0.tar`) for existing installs

### Rotating RSA Keys (Emergency — Private Key Compromised)

```bash
# 1. Delete old keys
rm tools/keys/private.pem tools/keys/public.pem

# 2. Generate new key pair
npx tsx tools/generate-license-keys.ts

# 3. Delete all existing license files
rm license/license.lic

# 4. Re-generate license for every customer (from database)
DATABASE_URL=postgresql://... npx tsx tools/generate-license-file.ts <TENANT_ID>

# 5. Send each customer:
#    - New ix-copilot-onprem-<date>.tar.gz (contains new .env with new public key + new license)
#    OR
#    - New ONPREM_LICENSE_PUBLIC_KEY value (they update .env manually)
#    - New license.lic file
```

> All existing licenses become invalid immediately because they were signed with the old key. All customers must update simultaneously.

---

## Part 6: Manual Build Steps (Reference)

This section documents what the build script does internally. You don't need to run these — they're here for understanding and debugging.

### 6.1: Generate RSA Key Pair (One-Time)

```bash
npx ts-node tools/generate-license-keys.ts
```

Creates `tools/keys/private.pem` (sign licenses) and `tools/keys/public.pem` (validate licenses). One key pair for all customers. Script refuses to overwrite existing keys.

| Key | Environment Variable | Who Gets It |
|-----|---------------------|-------------|
| Private key | `ONPREM_LICENSE_PRIVATE_KEY` | You only (never share) |
| Public key | `ONPREM_LICENSE_PUBLIC_KEY` | You + every customer |

### 6.2: Generate License File (Database-Driven)

**Option A — CLI script (recommended, reads from database):**

```bash
# Requires DATABASE_URL pointing to the license-service DB
DATABASE_URL=postgresql://... npx tsx tools/generate-license-file.ts <TENANT_ID>
```

Connects to the database, validates the tenant exists, reads the tenant's plan and features from PLAN + PLAN_FEATURE_QUOTA + FEATURE_REGISTRY, generates a signed `license/license.lic`, and stores a TENANT_LICENSE record in the DB.

**Option B — Via license-service API (needs running service with private key):**

```bash
curl -X POST http://localhost:4005/on-prem/license \
  -H "Content-Type: application/json" \
  -d '{"tenantId": 8, "startDate": "2026-03-12", "cycle": "ANNUALLY", "maxUsers": 50}' \
  -o license/license.lic
```

**License file format (`license.lic`):**

```json
{
  "payload": {
    "tenantId": 8,
    "planId": 3,
    "startDate": "2026-03-12T00:00:00.000Z",
    "issuedAt": "2026-03-12T06:03:46.990Z",
    "expiresAt": "2027-03-12T06:03:46.990Z",
    "cycle": "ANNUALLY",
    "maxUsers": null,
    "features": [
      { "featureKey": "users", "featureName": "Users", "quotaLimit": null },
      { "featureKey": "api-calls", "featureName": "API Calls", "quotaLimit": null },
      { "featureKey": "storage-gb", "featureName": "Storage (GB)", "quotaLimit": 100 },
      { "featureKey": "tenants", "featureName": "Tenants", "quotaLimit": null }
    ]
  },
  "signature": "jBjPPtuu/3CMON3bPN..."
}
```

### 6.3: Build Docker Images

```bash
# Migrate image (full workspace — runs prisma migrate deploy)
docker build --target source -t local/ix-copilot/migrate:latest .

# NestJS services (5 microservices + 1 BFF)
docker build --build-arg SERVICE_NAME=tenant-service  -t local/ix-copilot/tenant-service:latest .
docker build --build-arg SERVICE_NAME=users-service   -t local/ix-copilot/users-service:latest .
docker build --build-arg SERVICE_NAME=audit-service   -t local/ix-copilot/audit-service:latest .
docker build --build-arg SERVICE_NAME=auth-service    -t local/ix-copilot/auth-service:latest .
docker build --build-arg SERVICE_NAME=license-service -t local/ix-copilot/license-service:latest .
docker build --build-arg SERVICE_NAME=admin-portal    -t local/ix-copilot/admin-portal:latest .

# Next.js frontend
docker build -f Dockerfile.nextjs --build-arg APP_NAME=admin-ui -t local/ix-copilot/admin-ui:latest .
```

> Build one at a time. Parallel builds can crash the Docker daemon on machines with limited memory.

**Verify all 8 images:**

```bash
docker images | grep "local/ix-copilot" | sort
```

### 6.4: Generate Customer .env

```bash
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
DB_PASSWORD="OnPrem$(openssl rand -hex 8)"
PUBLIC_KEY_BASE64=$(cat tools/keys/public.pem | base64 | tr -d '\n')

cat > delivery-package/.env << EOF
POSTGRES_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/ix_db?schema=public
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION_DAYS=7
ONPREM_LICENSE_PUBLIC_KEY=${PUBLIC_KEY_BASE64}
REGISTRY=local
IMAGE_TAG=latest
EOF
```

### 6.5: Export Images and Create Archive

```bash
# Export all images to a single tar
docker save \
  local/ix-copilot/migrate:latest \
  local/ix-copilot/tenant-service:latest \
  local/ix-copilot/users-service:latest \
  local/ix-copilot/audit-service:latest \
  local/ix-copilot/auth-service:latest \
  local/ix-copilot/license-service:latest \
  local/ix-copilot/admin-portal:latest \
  local/ix-copilot/admin-ui:latest \
  -o delivery-package/images.tar

# Copy license
cp license/license.lic delivery-package/license/license.lic

# Create final archive (including dotfiles)
tar -czf ix-copilot-onprem.tar.gz -C delivery-package $(ls -A delivery-package/)

# Verify
tar -tzf ix-copilot-onprem.tar.gz
```

---

## Appendix A: Architecture in On-Prem Mode

### All Containers in the Stack

| Container | Image | HTTP Port | TCP Port | Purpose |
|-----------|-------|-----------|----------|---------|
| postgres | `postgres:15-alpine` | — | 5432 | PostgreSQL database |
| redis | `redis:7-alpine` | — | 6379 | Quota caching (license-service) |
| migrate | `local/ix-copilot/migrate` | — | — | Runs DB migrations, then exits |
| tenant-service | `local/ix-copilot/tenant-service` | 4003 | 3003 | Tenant lifecycle, billing, invoices |
| users-service | `local/ix-copilot/users-service` | 4004 | 3004 | Users, roles, groups, RBAC |
| audit-service | `local/ix-copilot/audit-service` | 4002 | 3002 | Centralized audit logging |
| auth-service | `local/ix-copilot/auth-service` | 4001 | 3001 | JWT auth, MFA, SSO, credentials |
| license-service | `local/ix-copilot/license-service` | 4005 | 3005 | License validation, plans, quotas |
| admin-portal | `local/ix-copilot/admin-portal` | 4006 | 3006 | BFF aggregator for frontend |
| admin-ui | `local/ix-copilot/admin-ui` | 3000 | — | Next.js admin dashboard |

### Data Persistence (Docker Volumes)

| Volume | Contains | `docker compose down` | `docker compose down -v` |
|--------|----------|----------------------|--------------------------|
| `pgdata` | All database data | Preserved | **Deleted** |
| `redisdata` | Cached quota counters | Preserved | **Deleted** |

### Port Reference

| Port Range | Purpose | External Access Needed? |
|------------|---------|------------------------|
| 3000 | Admin UI (frontend) | **Yes** — end users access this |
| 3001–3006 | TCP (inter-service communication) | No — internal only |
| 4001–4006 | HTTP (REST APIs) | Optional — for debugging/monitoring |
| 5432 | PostgreSQL | No — internal only |
| 6379 | Redis | No — internal only |

> **Firewall recommendation**: Only expose port 3000 to end users. Block 3001–3006, 4001–4006, 5432, 6379 from external access.

---

## Appendix B: Troubleshooting

### "Cannot connect to Docker daemon"

```bash
# Linux
sudo systemctl start docker
sudo systemctl enable docker    # auto-start on boot

# macOS
# Open Docker Desktop from Applications

# Verify
docker info
```

### "images.tar: No such file or directory"

```bash
ls -la images.tar
# If missing, the archive may have been extracted incompletely.
# Re-extract: tar -xzf ix-copilot-onprem-<date>.tar.gz
```

### Services won't start

```bash
# Check which services are failing
docker compose ps

# Read logs for the failing service
docker compose logs auth-service
docker compose logs license-service

# Common fixes:
docker compose restart                     # restart all
docker compose down && docker compose up -d   # full restart
```

Common causes:
- **"Connection refused to postgres"** — database isn't ready yet. Wait 30 seconds, then `docker compose restart`
- **"Missing environment variable"** — check `.env` has all required values
- **"Port already in use"** — another process is using the port. Check: `lsof -i :3000` or `ss -tlnp | grep 3000`

### "License Invalid" / 403 on all endpoints

```bash
curl http://localhost:4005/on-prem/license/status
```

| Status in Response | Cause | Fix |
|-------------------|-------|-----|
| `EXPIRED` | License has expired | Get new `license.lic` from vendor |
| `FILE_NOT_FOUND` | `license.lic` missing | Check `license/` directory exists and file is present |
| `INVALID_SIGNATURE` | Wrong public key or tampered file | Get new `.env` + `license.lic` from vendor |
| `MALFORMED` | Corrupted file | Get new `license.lic` from vendor |

### "ECONNREFUSED" between services

```bash
# Check all services are running
docker compose ps

# Restart the failing service
docker compose restart admin-portal

# If still failing, restart everything
docker compose down && docker compose up -d
```

### Database migration fails

```bash
# Check migration logs
docker compose logs migrate

# Re-run migrations
docker compose up migrate

# If database is corrupted, restore from backup
cat backup.sql | docker compose exec -T postgres psql -U postgres ix_db
docker compose restart
```

### Out of disk space

```bash
# Check Docker disk usage
docker system df

# Clean up unused images and containers
docker system prune -f

# Check host disk
df -h
```

---

## Appendix C: Security Checklist

### Vendor Checklist

| # | Item | Priority |
|---|------|----------|
| 1 | Private key (`tools/keys/private.pem`) is in `.gitignore` — never committed | Required |
| 2 | Private key is never shared with customers or included in delivery package | Required |
| 3 | Private key is stored in a secrets manager for production (AWS Secrets Manager, Vault) | Recommended |
| 4 | Each customer gets unique `POSTGRES_PASSWORD` and `JWT_SECRET` (build script does this automatically) | Required |
| 5 | License file has correct `tenantId` for the target customer | Required |
| 6 | Docker images are scanned for vulnerabilities before shipping | Recommended |
| 7 | Old delivery archives are deleted after customer confirms receipt | Recommended |

### Customer Checklist

| # | Item | Priority |
|---|------|----------|
| 1 | `.env` file has restrictive permissions: `chmod 600 .env` | Recommended |
| 2 | `POSTGRES_PASSWORD` is changed from vendor default (on fresh install only) | Recommended |
| 3 | `JWT_SECRET` is regenerated: `openssl rand -base64 64` | Recommended |
| 4 | `license/license.lic` is mounted read-only (`:ro` in compose — default) | Default |
| 5 | Firewall restricts ports 3001–3006, 4001–4006, 5432, 6379 to internal access only | Recommended |
| 6 | Only port 3000 (frontend) is exposed to end users | Recommended |
| 7 | Regular database backups are scheduled (daily recommended) | Recommended |
| 8 | Server has automatic security updates enabled | Recommended |

---

## Quick Reference

### Vendor — Create & Ship a Package

```bash
# One command does everything:
./tools/build-onprem-package.sh

# Output: ix-copilot-onprem-<date>.tar.gz
# Send this single file to the customer.
```

### Customer — Set Up & Run (Linux/macOS)

```bash
# Extract
tar -xzf ix-copilot-onprem-<date>.tar.gz

# One command does everything:
chmod +x setup.sh
./setup.sh

# Open: http://localhost:3000
```

### Customer — Set Up & Run (Windows)

```powershell
# Extract
tar -xzf ix-copilot-onprem-<date>.tar.gz

# One command does everything:
powershell -ExecutionPolicy Bypass -File setup.ps1

# Open: http://localhost:3000
```

### Customer — Daily Operations

```bash
docker compose up -d              # start
docker compose down               # stop
docker compose restart            # restart
docker compose ps                 # status
docker compose logs -f            # logs (all services)
docker compose logs -f <service>  # logs (specific service)
```

### Customer — Maintenance

```bash
# Backup database
docker compose exec -T postgres pg_dump -U postgres ix_db > backup_$(date +%Y%m%d).sql

# Check license
curl http://localhost:4005/on-prem/license/status

# Update license (no restart needed)
cp new-license.lic license/license.lic

# Upgrade to new version
docker load -i images-v1.1.0.tar
sed -i 's/IMAGE_TAG=.*/IMAGE_TAG=v1.1.0/' .env
docker compose up -d
```
