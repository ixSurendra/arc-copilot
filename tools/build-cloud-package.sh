#!/usr/bin/env bash
# ================================================================
# ix-copilot — Build Cloud Deployment Package
#
# Builds all Docker images and creates a deployable package for
# Innovatechs' own cloud infrastructure (ON_PREM=false).
#
# First deploy:  builds images + saves images.tar + copies cloud/ config
# Future builds: use GHCR (push images, no tar needed)
#
# Usage:
#   chmod +x tools/build-cloud-package.sh
#   ./tools/build-cloud-package.sh
#
# Options:
#   PUSH_TO_REGISTRY=true   Push images to GHCR instead of saving tar
#   IMAGE_TAG=v1.2.3        Tag images with a version (default: latest)
#   SERVICE=admin-ui        Build only one service (for quick updates)
#
# Output (first deploy):
#   ix-copilot-cloud-<date>.tar.gz — Transfer this to EC2 and run deploy.sh
#
# Output (with PUSH_TO_REGISTRY=true):
#   Images pushed to ghcr.io/your-org/ix-copilot/*:<tag>
# ================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() { echo -e "\n${BLUE}━━━ $1 ━━━${NC}"; }
print_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
print_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
print_err()  { echo -e "${RED}✗ $1${NC}"; }

# ── Configuration ─────────────────────────────────────────────
REGISTRY="${REGISTRY:-local}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
PLATFORM="linux/amd64"
CLOUD_DIR="cloud"
DATE_TAG=$(date +%Y%m%d)
ARCHIVE_NAME="ix-copilot-cloud-${DATE_TAG}.tar.gz"
PUSH_TO_REGISTRY="${PUSH_TO_REGISTRY:-false}"
SINGLE_SERVICE="${SERVICE:-}"

SERVICES=("tenant-service" "users-service" "audit-service" "auth-service" "license-service" "admin-portal")

echo ""
echo -e "${BLUE}  ix-copilot — Cloud Build${NC}"
echo "  Registry:  ${REGISTRY}"
echo "  Tag:       ${IMAGE_TAG}"
echo "  Platform:  ${PLATFORM}"
if [ -n "${SINGLE_SERVICE}" ]; then
  echo "  Service:   ${SINGLE_SERVICE} (single service build)"
fi
echo ""

# ── Step 1: Prerequisites ─────────────────────────────────────
print_step "Step 1: Checking prerequisites"

if ! docker info &>/dev/null 2>&1; then
  print_err "Docker is not running. Start Docker and try again."
  exit 1
fi
print_ok "Docker is running"

if [ ! -f "Dockerfile" ] || [ ! -f "Dockerfile.nextjs" ] || [ ! -f "Dockerfile.migrate" ]; then
  print_err "Dockerfiles not found. Run this script from the project root."
  exit 1
fi
print_ok "Dockerfiles found"

if [ ! -d "${CLOUD_DIR}" ]; then
  print_err "cloud/ directory not found. Run from project root."
  exit 1
fi
print_ok "cloud/ directory found"

# ── Step 2: Build Docker images ───────────────────────────────
print_step "Step 2: Building Docker images"

echo "  Target platform: ${PLATFORM}"
echo ""

build_image() {
  local name="$1"
  local tag="${REGISTRY}/ix-copilot/${name}:${IMAGE_TAG}"
  echo "  Building ${name}..."
  if [ "$2" = "migrate" ]; then
    docker build --platform ${PLATFORM} -f Dockerfile.migrate -t "${tag}" . 2>&1 | tail -1
  elif [ "$2" = "nextjs" ]; then
    docker build --platform ${PLATFORM} -f Dockerfile.nextjs --build-arg APP_NAME="${name}" -t "${tag}" . 2>&1 | tail -1
  else
    docker build --platform ${PLATFORM} --build-arg SERVICE_NAME="${name}" -t "${tag}" . 2>&1 | tail -1
  fi
  print_ok "${name} → ${tag}"
}

if [ -n "${SINGLE_SERVICE}" ]; then
  # Build only the specified service
  case "${SINGLE_SERVICE}" in
    migrate)
      build_image "migrate" "migrate" ;;
    admin-ui)
      build_image "admin-ui" "nextjs" ;;
    *)
      build_image "${SINGLE_SERVICE}" "service" ;;
  esac
else
  # Build all images
  build_image "migrate" "migrate"
  for svc in "${SERVICES[@]}"; do
    build_image "${svc}" "service"
  done
  build_image "admin-ui" "nextjs"
fi

echo ""
echo "  Built images:"
docker images --format "    {{.Repository}}:{{.Tag}}  ({{.Size}})" | grep "${REGISTRY}/ix-copilot" | sort

# ── Step 3: Push or Package ───────────────────────────────────
if [ "${PUSH_TO_REGISTRY}" = "true" ]; then

  # ── Push to Registry (GHCR / ECR) ──────────────────────────
  print_step "Step 3: Pushing images to registry (${REGISTRY})"

  push_image() {
    local name="$1"
    local tag="${REGISTRY}/ix-copilot/${name}:${IMAGE_TAG}"
    echo "  Pushing ${name}..."
    docker push "${tag}" 2>&1 | tail -2
    print_ok "${name} pushed"
  }

  if [ -n "${SINGLE_SERVICE}" ]; then
    push_image "${SINGLE_SERVICE}"
  else
    push_image "migrate"
    for svc in "${SERVICES[@]}"; do
      push_image "${svc}"
    done
    push_image "admin-ui"
  fi

  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  Images pushed to ${REGISTRY}!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  On your cloud server, update with:"
  echo "    IMAGE_TAG=${IMAGE_TAG} docker compose pull"
  echo "    IMAGE_TAG=${IMAGE_TAG} docker compose up -d"
  echo ""

else

  # ── Save as tar.gz (first deploy / no registry) ────────────
  print_step "Step 3: Saving images to tar"

  IMAGE_LIST=""
  if [ -n "${SINGLE_SERVICE}" ]; then
    IMAGE_LIST="${REGISTRY}/ix-copilot/${SINGLE_SERVICE}:${IMAGE_TAG}"
    ARCHIVE_NAME="ix-copilot-cloud-${SINGLE_SERVICE}-${DATE_TAG}.tar.gz"
  else
    for svc in "${SERVICES[@]}"; do
      IMAGE_LIST="${IMAGE_LIST} ${REGISTRY}/ix-copilot/${svc}:${IMAGE_TAG}"
    done
    IMAGE_LIST="${IMAGE_LIST} ${REGISTRY}/ix-copilot/migrate:${IMAGE_TAG}"
    IMAGE_LIST="${IMAGE_LIST} ${REGISTRY}/ix-copilot/admin-ui:${IMAGE_TAG}"
  fi

  echo "  Saving images (this takes a minute)..."
  docker save ${IMAGE_LIST} -o "${CLOUD_DIR}/images.tar"
  print_ok "images.tar saved ($(du -sh ${CLOUD_DIR}/images.tar | cut -f1))"

  # ── Step 4: Create .env if missing ────────────────────────
  print_step "Step 4: Preparing cloud config"

  if [ ! -f "${CLOUD_DIR}/.env" ]; then
    cp "${CLOUD_DIR}/.env.example" "${CLOUD_DIR}/.env"
    # Generate fresh JWT secret
    JWT_SECRET=$(openssl rand -base64 64 | tr -d '\n')
    sed -i.bak "s|JWT_SECRET=.*|JWT_SECRET=${JWT_SECRET}|" "${CLOUD_DIR}/.env" && rm -f "${CLOUD_DIR}/.env.bak"
    print_ok ".env created from .env.example (fill in DATABASE_URL, SMTP, etc.)"
  else
    print_ok ".env already exists — values preserved"
  fi

  # ── Step 5: Create archive ────────────────────────────────
  print_step "Step 5: Creating cloud archive"

  tar -czf "${ARCHIVE_NAME}" \
    --exclude="${CLOUD_DIR}/images.tar" \
    -C "${CLOUD_DIR}" . \
    --transform "s|^|cloud/|" 2>/dev/null || \
  tar -czf "${ARCHIVE_NAME}" -C "${CLOUD_DIR}" .

  # Append images.tar separately
  tar -czf "${ARCHIVE_NAME}" -C "${CLOUD_DIR}" \
    docker-compose.yml \
    deploy.sh \
    .env \
    .env.example \
    images.tar

  chmod +x "${CLOUD_DIR}/deploy.sh" 2>/dev/null || true
  print_ok "Archive: ${ARCHIVE_NAME} ($(du -sh ${ARCHIVE_NAME} | cut -f1))"

  # ── Done ──────────────────────────────────────────────────
  echo ""
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${GREEN}  Cloud Package Ready!${NC}"
  echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo "  Package:  ${ARCHIVE_NAME}"
  echo "  Size:     $(du -sh ${ARCHIVE_NAME} | cut -f1)"
  echo ""
  echo "  ── First Deploy ──────────────────────────────"
  echo "  scp ${ARCHIVE_NAME} ec2-user@<server>:~/"
  echo "  ssh ec2-user@<server>"
  echo "    tar -xzf ${ARCHIVE_NAME}"
  echo "    nano .env         # fill in DATABASE_URL, SMTP, etc."
  echo "    chmod +x deploy.sh"
  echo "    ./deploy.sh"
  echo ""
  echo "  ── Future Updates (single service) ───────────"
  echo "  SERVICE=admin-ui ./tools/build-cloud-package.sh"
  echo "  scp ix-copilot-cloud-admin-ui-${DATE_TAG}.tar.gz ec2-user@<server>:~/"
  echo "    docker load < ix-copilot-cloud-admin-ui-${DATE_TAG}.tar.gz"
  echo "    docker compose up -d admin-ui"
  echo ""
  echo "  ── Future Updates (with GHCR) ────────────────"
  echo "  REGISTRY=ghcr.io/your-org PUSH_TO_REGISTRY=true ./tools/build-cloud-package.sh"
  echo "  # On server: docker compose pull && docker compose up -d"
  echo ""

fi
