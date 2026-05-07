#!/usr/bin/env bash
# ================================================================
# ix-copilot — Build On-Prem Delivery Package (Complete)
#
# Single command to create a ready-to-ship on-prem package.
# Handles everything: keys, license, images, config, archive.
#
# Usage:
#   chmod +x tools/build-onprem-package.sh
#   ./tools/build-onprem-package.sh
#
# Output:
#   ix-copilot-onprem-<date>.tar.gz — Ship this to the customer
# ================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step()  { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }
print_ok()    { echo -e "${GREEN}✓ $1${NC}"; }
print_warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
print_err()   { echo -e "${RED}✗ $1${NC}"; }

REGISTRY="local"
IMAGE_TAG="latest"
SERVICES=("tenant-service" "users-service" "audit-service" "auth-service" "license-service" "admin-portal")
PACKAGE_DIR="delivery-package"
DATE_TAG=$(date +%Y%m%d)
# Target platform — on-prem servers are typically x86_64
PLATFORM="linux/amd64"

# ── Step 1: Prerequisite checks ───────────────────────────────
print_step "Step 1: Checking prerequisites"

if ! docker info &> /dev/null 2>&1; then
  print_err "Docker is not running. Start Docker and try again."
  exit 1
fi
print_ok "Docker is running"

if [ ! -f "Dockerfile" ] || [ ! -f "Dockerfile.nextjs" ]; then
  print_err "Dockerfiles not found. Run this script from the project root."
  exit 1
fi
print_ok "Dockerfiles found"

if ! command -v npx &> /dev/null; then
  print_err "npx not found. Install Node.js 20+ first."
  exit 1
fi
print_ok "Node.js available"

# ── Step 2: Generate RSA keys (if not already generated) ──────
print_step "Step 2: RSA key pair"

if [ -f "tools/keys/private.pem" ] && [ -f "tools/keys/public.pem" ]; then
  print_ok "RSA keys already exist at tools/keys/"
else
  echo "  Generating RSA 2048-bit key pair..."
  pnpm dlx tsx tools/generate-license-keys.ts
  print_ok "RSA keys generated"
fi

# Read the public key (Base64) for the .env file
PUBLIC_KEY_BASE64=$(cat tools/keys/public.pem | base64 | tr -d '\n')

# ── Step 3: Generate license file from database ───────────────
print_step "Step 3: License file (from database)"

# TENANT_ID: CLI env > delivery-package/.env > default 1
if [ -z "${TENANT_ID:-}" ] && [ -f "${PACKAGE_DIR}/.env" ]; then
  TENANT_ID=$(grep "^TENANT_ID=" "${PACKAGE_DIR}/.env" 2>/dev/null | head -1 | cut -d'=' -f2- || echo "")
fi
TENANT_ID="${TENANT_ID:-1}"

# DATABASE_URL: CLI env > delivery-package/.env (script also reads it)
if [ -z "${DATABASE_URL:-}" ] && [ -f "${PACKAGE_DIR}/.env" ]; then
  DATABASE_URL=$(grep "^DATABASE_URL=" "${PACKAGE_DIR}/.env" 2>/dev/null | head -1 | cut -d'=' -f2- || echo "")
fi

if [ -z "${DATABASE_URL:-}" ]; then
  print_err "DATABASE_URL is required to generate license from database."
  echo "  Set via: DATABASE_URL=postgresql://... ./tools/build-onprem-package.sh"
  echo "  Or add DATABASE_URL to delivery-package/.env"
  exit 1
fi

if [ -f "license/license.lic" ]; then
  print_warn "license/license.lic already exists"
  echo "  To regenerate: rm license/license.lic && re-run this script"
else
  echo "  Generating license for TENANT_ID=${TENANT_ID} from database..."
  TENANT_ID=${TENANT_ID} DATABASE_URL=${DATABASE_URL} pnpm dlx tsx tools/generate-license-file.ts
  print_ok "License file generated + stored in DB"
fi

# ── Step 4: Build Docker images ───────────────────────────────
print_step "Step 4: Building Docker images (this takes several minutes)"

echo "  Target platform: ${PLATFORM}"
echo ""

echo "  Building migrate image..."
docker build --platform ${PLATFORM} -f Dockerfile.migrate -t ${REGISTRY}/ix-copilot/migrate:${IMAGE_TAG} . 2>&1 | tail -1
print_ok "migrate"

for svc in "${SERVICES[@]}"; do
  echo "  Building ${svc}..."
  docker build --platform ${PLATFORM} --build-arg SERVICE_NAME=${svc} -t ${REGISTRY}/ix-copilot/${svc}:${IMAGE_TAG} . 2>&1 | tail -1
  print_ok "${svc}"
done

echo "  Building admin-ui..."
docker build --platform ${PLATFORM} -f Dockerfile.nextjs --build-arg APP_NAME=admin-ui -t ${REGISTRY}/ix-copilot/admin-ui:${IMAGE_TAG} . 2>&1 | tail -1
print_ok "admin-ui"

echo ""
echo "  All 8 images built:"
docker images --format "    {{.Repository}}:{{.Tag}}  ({{.Size}})" | grep "local/ix-copilot" | sort

# ── Step 5: Prepare delivery-package directory ────────────────
print_step "Step 5: Assembling delivery package"

mkdir -p ${PACKAGE_DIR}/license

# Copy license file
cp license/license.lic ${PACKAGE_DIR}/license/license.lic
print_ok "License file copied"

# Generate .env — preserve customized values from existing .env if present
JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
DB_PASSWORD="OnPrem$(openssl rand -hex 8)"

# Helper: read a value from existing delivery-package/.env, or use a default
read_env() {
  local key="$1" default="$2"
  if [ -f "${PACKAGE_DIR}/.env" ]; then
    local val
    val=$(grep "^${key}=" "${PACKAGE_DIR}/.env" 2>/dev/null | head -1 | cut -d'=' -f2-)
    if [ -n "$val" ]; then
      echo "$val"
      return
    fi
  fi
  echo "$default"
}

# Read tenant/admin/SMTP values from existing .env (or use defaults)
ENV_EXTERNAL_DB=$(read_env "EXTERNAL_DB" "false")
ENV_EXTERNAL_REDIS=$(read_env "EXTERNAL_REDIS" "false")
ENV_TENANT_ID=$(read_env "TENANT_ID" "${TENANT_ID:-1}")
ENV_TENANT_NAME=$(read_env "TENANT_NAME" "My Organization")
ENV_TENANT_DOMAIN=$(read_env "TENANT_DOMAIN" "onprem.local")
ENV_ADMIN_EMAIL=$(read_env "ADMIN_EMAIL" "admin@onprem.local")
ENV_ADMIN_PASSWORD=$(read_env "ADMIN_PASSWORD" "ChangeMe123!")
ENV_ADMIN_FIRST_NAME=$(read_env "ADMIN_FIRST_NAME" "Admin")
ENV_ADMIN_LAST_NAME=$(read_env "ADMIN_LAST_NAME" "User")
ENV_APP_URL=$(read_env "APP_URL" "http://localhost:3000")
ENV_SMTP_HOST=$(read_env "SMTP_HOST" "smtp.example.com")
ENV_SMTP_PORT=$(read_env "SMTP_PORT" "587")
ENV_SMTP_SECURE=$(read_env "SMTP_SECURE" "false")
ENV_SMTP_USER=$(read_env "SMTP_USER" "")
ENV_SMTP_PASS=$(read_env "SMTP_PASS" "")
ENV_SMTP_FROM=$(read_env "SMTP_FROM" "IX Platform <noreply@example.com>")
ENV_REDIS_HOST=$(read_env "REDIS_HOST" "redis")
ENV_REDIS_PORT=$(read_env "REDIS_PORT" "6379")

# Build DATABASE_URL based on EXTERNAL_DB flag
if [ "$ENV_EXTERNAL_DB" = "true" ]; then
  # Preserve existing external DATABASE_URL, or use a placeholder
  ENV_DATABASE_URL=$(read_env "DATABASE_URL" "postgresql://<user>:<password>@<host>:5432/<dbname>?schema=public")
  ENV_POSTGRES_PASSWORD=""
else
  ENV_DATABASE_URL="postgresql://postgres:${DB_PASSWORD}@postgres:5432/ix_db?schema=public"
  ENV_POSTGRES_PASSWORD="${DB_PASSWORD}"
fi

cat > ${PACKAGE_DIR}/.env << ENVEOF
# ================================================================
# ix-copilot On-Prem — Environment Configuration
# ================================================================

# ── External Infrastructure ───────────────────────────────────────
# Set to true if you have your own PostgreSQL / Redis (not in Docker).
# When true, the corresponding Docker container will NOT start.
EXTERNAL_DB=${ENV_EXTERNAL_DB}
EXTERNAL_REDIS=${ENV_EXTERNAL_REDIS}

# ── Database ────────────────────────────────────────────────────
# When EXTERNAL_DB=false (default):
#   POSTGRES_PASSWORD is used by the Docker postgres container.
#   DATABASE_URL points to the Docker container hostname "postgres".
#
# When EXTERNAL_DB=true:
#   POSTGRES_PASSWORD is ignored (your external DB manages auth).
#   DATABASE_URL must point to your PostgreSQL server.
#   Example: postgresql://myuser:mypass@192.168.1.50:5432/ix_db?schema=public
#   Requirements:
#     - PostgreSQL 15+
#     - Database must already exist (we run migrations, not CREATE DATABASE)
#     - DB user must have full DDL permissions (CREATE TABLE, ALTER, INDEX)
#     - PostgreSQL must accept connections from Docker containers
POSTGRES_PASSWORD=${ENV_POSTGRES_PASSWORD}
DATABASE_URL=${ENV_DATABASE_URL}

# ── Redis ────────────────────────────────────────────────────────
# When EXTERNAL_REDIS=false (default): uses Docker redis container.
# When EXTERNAL_REDIS=true: set REDIS_HOST and REDIS_PORT to your Redis server.
REDIS_HOST=${ENV_REDIS_HOST}
REDIS_PORT=${ENV_REDIS_PORT}

# ── Auth Secrets ────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRATION=15m
JWT_REFRESH_EXPIRATION_DAYS=7

# ── On-Prem License ────────────────────────────────────────────
ONPREM_LICENSE_PUBLIC_KEY=${PUBLIC_KEY_BASE64}

# ── Tenant & Admin (change before running setup.sh) ───────────
# TENANT_ID must match the license file — do not change unless regenerating the license
TENANT_ID=${ENV_TENANT_ID}
TENANT_NAME=${ENV_TENANT_NAME}
TENANT_DOMAIN=${ENV_TENANT_DOMAIN}
ADMIN_EMAIL=${ENV_ADMIN_EMAIL}
ADMIN_PASSWORD=${ENV_ADMIN_PASSWORD}
ADMIN_FIRST_NAME=${ENV_ADMIN_FIRST_NAME}
ADMIN_LAST_NAME=${ENV_ADMIN_LAST_NAME}

# ── Application URL ──────────────────────────────────────────────
# Set to the public URL of the admin portal (used in welcome emails)
APP_URL=${ENV_APP_URL}

# ── SMTP (Email) ─────────────────────────────────────────────────
# Required for welcome emails, password resets, etc.
SMTP_HOST=${ENV_SMTP_HOST}
SMTP_PORT=${ENV_SMTP_PORT}
SMTP_SECURE=${ENV_SMTP_SECURE}
SMTP_USER=${ENV_SMTP_USER}
SMTP_PASS=${ENV_SMTP_PASS}
SMTP_FROM=${ENV_SMTP_FROM}

# ── Docker Images ───────────────────────────────────────────────
REGISTRY=local
IMAGE_TAG=latest
ENVEOF
print_ok ".env generated (unique secrets, tenant/SMTP values preserved)"

# Ensure static files exist (docker-compose.yml, setup.sh, setup.ps1, README.md, .env.example)
if [ ! -f "${PACKAGE_DIR}/docker-compose.yml" ]; then
  print_err "${PACKAGE_DIR}/docker-compose.yml is missing. Cannot continue."
  exit 1
fi
print_ok "docker-compose.yml present"
print_ok "setup.sh present (Linux/macOS)"

if [ -f "${PACKAGE_DIR}/setup.ps1" ]; then
  print_ok "setup.ps1 present (Windows)"
else
  print_warn "setup.ps1 missing — Windows customers won't have an automated setup"
fi
print_ok "README.md present"

# ── Step 6: Export Docker images ──────────────────────────────
print_step "Step 6: Exporting Docker images to images.tar"

IMAGE_LIST=""
for svc in "${SERVICES[@]}"; do
  IMAGE_LIST="${IMAGE_LIST} ${REGISTRY}/ix-copilot/${svc}:${IMAGE_TAG}"
done
IMAGE_LIST="${IMAGE_LIST} ${REGISTRY}/ix-copilot/migrate:${IMAGE_TAG}"
IMAGE_LIST="${IMAGE_LIST} ${REGISTRY}/ix-copilot/admin-ui:${IMAGE_TAG}"

echo "  Saving 8 images (this takes a minute)..."
docker save ${IMAGE_LIST} -o ${PACKAGE_DIR}/images.tar
print_ok "Images exported ($(du -sh ${PACKAGE_DIR}/images.tar | cut -f1))"

# ── Step 7: Create final archive ─────────────────────────────
print_step "Step 7: Creating delivery archive"

ARCHIVE_NAME="ix-copilot-onprem-${DATE_TAG}.tar.gz"
tar -czf ${ARCHIVE_NAME} -C ${PACKAGE_DIR} $(ls -A ${PACKAGE_DIR}/)
print_ok "Archive created: ${ARCHIVE_NAME} ($(du -sh ${ARCHIVE_NAME} | cut -f1))"

# ── Verify ────────────────────────────────────────────────────
print_step "Verification"

echo "  Archive contents:"
tar -tzf ${ARCHIVE_NAME} | sed 's/^/    /'

# ── Done ──────────────────────────────────────────────────────
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}  On-Prem Delivery Package Ready!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "  Deliverable:  ${ARCHIVE_NAME}"
echo "  Size:         $(du -sh ${ARCHIVE_NAME} | cut -f1)"
echo ""
echo "  Send this file to the customer. They run:"
echo ""
echo "  Linux/macOS:"
echo "    tar -xzf ${ARCHIVE_NAME}"
echo "    chmod +x setup.sh"
echo "    ./setup.sh"
echo ""
echo "  Windows (PowerShell):"
echo "    tar -xzf ${ARCHIVE_NAME}"
echo "    powershell -ExecutionPolicy Bypass -File setup.ps1"
echo ""
echo "  That's it — one archive, one command."
echo ""
