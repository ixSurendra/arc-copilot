#!/bin/sh
# ================================================================
# Run Prisma migrations for all services
# ================================================================

set -e

SERVICES="auth-service audit-service tenant-service users-service license-service"

echo "═══════════════════════════════════════════════════"
echo "  ix-copilot — Database Migrations"
echo "═══════════════════════════════════════════════════"
echo ""

for SERVICE in $SERVICES; do
  SCHEMA="apps/${SERVICE}/prisma/schema.prisma"
  CONFIG="apps/${SERVICE}/prisma.config.ts"

  if [ ! -f "$SCHEMA" ]; then
    echo "[skip]  ${SERVICE} — no prisma schema found"
    continue
  fi

  echo "[migrate] ${SERVICE}..."
  npx prisma migrate deploy --schema="$SCHEMA"
  echo "[done]    ${SERVICE}"
  echo ""
done

echo "═══════════════════════════════════════════════════"
echo "  All migrations completed successfully!"
echo "═══════════════════════════════════════════════════"
