#!/bin/bash
# arc-copilot — three-database bootstrap for the postgres container.
#
# POSTGRES_DB (arc_db) is created automatically by the official postgres
# image on first boot. This script runs from /docker-entrypoint-initdb.d/
# right after that and creates the two siblings:
#
#   arc_audit_db     audit-service (audit logs + notification logs)
#   arc_insights_db  arc-insights backend (dashboards/widgets/reports)
#
# Why three DBs (not three schemas in one DB)?
#   - Operational isolation: vacuum on a 500GB AuditLog never touches
#     foundation tables.
#   - Granular backup / restore.
#   - Per-domain Prisma migration trees stay independent.
#
# Same Postgres instance, three CREATE DATABASE statements, one container
# to ship on-prem.

set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
  CREATE DATABASE arc_audit_db;
  CREATE DATABASE arc_insights_db;
EOSQL

echo "[init-databases] arc_db (auto), arc_audit_db, arc_insights_db ready."
