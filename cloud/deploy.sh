#!/usr/bin/env bash
# ================================================================
# ix-copilot — Cloud Deploy Script
#
# Run on your cloud server to deploy or update ix-copilot.
# First time: loads images from images.tar (if present)
# Updates:    pulls from GHCR registry
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
# ================================================================

set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }
print_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_err()  { echo -e "${RED}✗ $1${NC}"; }

# ── Check .env exists ─────────────────────────────────────────
if [ ! -f ".env" ]; then
  print_err ".env not found. Copy .env.example to .env and fill in values."
  exit 1
fi

REGISTRY=$(grep "^REGISTRY=" .env | cut -d'=' -f2- || echo "local")
IMAGE_TAG=$(grep "^IMAGE_TAG=" .env | cut -d'=' -f2- || echo "latest")

echo ""
echo "  ix-copilot Cloud Deploy"
echo "  Registry: ${REGISTRY}"
echo "  Version:  ${IMAGE_TAG}"
echo ""

# ── Step 1: Load or Pull images ───────────────────────────────
print_step "Step 1: Loading images"

if [ "${REGISTRY}" = "local" ]; then
  # Load from tar (initial deploy without registry)
  if [ -f "images.tar" ]; then
    echo "  Loading images from images.tar..."
    docker load < images.tar
    print_ok "Images loaded from images.tar"
  else
    print_warn "No images.tar found and REGISTRY=local — assuming images already loaded"
  fi
else
  # Pull from GHCR or other registry
  echo "  Pulling images from ${REGISTRY}..."
  docker compose pull
  print_ok "Images pulled from registry"
fi

# ── Step 2: Run migrations + seed + start services ───────────
print_step "Step 2: Deploying services"

echo "  Running migrations..."
docker compose up migrate --exit-code-from migrate

echo "  Running seed (skipped if already done)..."
docker compose up seed --exit-code-from seed 2>/dev/null || true

echo "  Starting all services..."
docker compose up -d \
  tenant-service users-service audit-service \
  auth-service license-service admin-portal admin-ui

# ── Step 3: Health check ──────────────────────────────────────
print_step "Step 3: Verifying deployment"

sleep 5
RUNNING=$(docker compose ps --status running --quiet | wc -l | tr -d ' ')
print_ok "${RUNNING} services running"

APP_URL=$(grep "^APP_URL=" .env | cut -d'=' -f2- || echo "http://localhost:3000")

echo ""
echo "  ════════════════════════════════════════"
echo "  ✓ ix-copilot Cloud is running!"
echo "  ════════════════════════════════════════"
echo ""
echo "  App URL:  ${APP_URL}"
echo "  Version:  ${IMAGE_TAG}"
echo ""
echo "  Commands:"
echo "    docker compose logs -f          # view logs"
echo "    docker compose ps               # check status"
echo "    docker compose down             # stop"
echo "    docker compose up -d            # restart"
echo ""
