/**
 * Ensure every tenant has a TENANT_ADMIN role with all DMS module permissions.
 *
 * For each non-system tenant:
 *   1. Ensure the TENANT_ADMIN role exists (create if missing).
 *   2. Grant every ACTIVE (module, permission) pair for modules whose
 *      MODULE_KEY starts with 'dms_' — idempotent via ON CONFLICT DO NOTHING.
 *
 * Prereq: MODULE_MASTER / PERMISSION_MASTER / MODULE_PERMISSIONS must already
 * be populated. Run `tools/seed-dms-modules-permissions.ts` first.
 *
 * Idempotent — safe to re-run. Usage:
 *   DATABASE_URL=... npx tsx tools/seed-tenant-admin-dms-permissions.ts
 *
 * Or on EC2:
 *   docker compose exec migrate sh -c \
 *     "DATABASE_URL=\$DATABASE_URL npx tsx tools/seed-tenant-admin-dms-permissions.ts"
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('Connected to database\n');

  try {
    // 1. Fetch all active DMS (moduleId, permissionId) pairs once.
    const pairsResult = await client.query<{ MODULE_ID: number; PERMISSION_ID: number }>(
      `SELECT mp."MODULE_ID", mp."PERMISSION_ID"
       FROM "MODULE_PERMISSIONS" mp
       JOIN "MODULE_MASTER" m ON m."ID" = mp."MODULE_ID"
       WHERE mp."STATUS" = 'ACTIVE'
         AND m."STATUS" = 'ACTIVE'
         AND m."MODULE_KEY" LIKE 'dms_%'`,
    );
    const pairs = pairsResult.rows;
    console.log(`Found ${pairs.length} DMS (module, permission) pairs\n`);

    if (pairs.length === 0) {
      console.log('No DMS module/permission pairs found.');
      console.log('Run tools/seed-dms-modules-permissions.ts first, then re-run this script.');
      return;
    }

    // 2. Iterate every non-system tenant.
    const tenantsResult = await client.query<{ ID: number; TENANT_NAME: string }>(
      `SELECT "ID", "TENANT_NAME" FROM "TENANTS" WHERE "ID" != 0 ORDER BY "ID"`,
    );
    const tenants = tenantsResult.rows;
    console.log(`Processing ${tenants.length} tenant(s):\n`);

    let rolesCreated = 0;
    let rolesReused = 0;
    let totalGranted = 0;

    for (const tenant of tenants) {
      const tenantId = tenant['ID'];
      const tenantName = tenant['TENANT_NAME'];

      // 2a. Ensure TENANT_ADMIN role exists for this tenant.
      let roleId: number;
      const existing = await client.query<{ ID: number }>(
        `SELECT "ID" FROM "ROLES"
         WHERE "TENANT_ID" = $1 AND "ROLE_NAME" = 'TENANT_ADMIN'`,
        [tenantId],
      );

      if (existing.rows.length > 0) {
        roleId = existing.rows[0]['ID'];
        rolesReused++;
      } else {
        const created = await client.query<{ ID: number }>(
          `INSERT INTO "ROLES" ("TENANT_ID", "ROLE_NAME", "DESCRIPTION", "STATUS", "CREATED_AT", "UPDATED_AT")
           VALUES ($1, 'TENANT_ADMIN', 'Default tenant administrator role', 'ACTIVE', NOW(), NOW())
           RETURNING "ID"`,
          [tenantId],
        );
        roleId = created.rows[0]['ID'];
        rolesCreated++;
        console.log(`  + Tenant ${tenantId} (${tenantName}) — created TENANT_ADMIN role (id=${roleId})`);
      }

      // 2b. Grant all DMS module permissions to this role (idempotent).
      let grantedThisTenant = 0;
      for (const pair of pairs) {
        const res = await client.query(
          `INSERT INTO "ROLE_MODULE_PERMISSIONS" ("ROLE_ID", "MODULE_ID", "PERMISSION_ID", "IS_ENABLED")
           VALUES ($1, $2, $3, true)
           ON CONFLICT ("ROLE_ID", "MODULE_ID", "PERMISSION_ID") DO NOTHING`,
          [roleId, pair['MODULE_ID'], pair['PERMISSION_ID']],
        );
        if (res.rowCount && res.rowCount > 0) {
          grantedThisTenant++;
        }
      }
      totalGranted += grantedThisTenant;
      const tag = grantedThisTenant > 0 ? `granted ${grantedThisTenant} new` : 'already complete';
      console.log(`    Tenant ${tenantId} (${tenantName}) role=${roleId} — ${tag}`);
    }

    console.log(`\n─────────────────────────────────────────────`);
    console.log(`Roles created: ${rolesCreated}, reused: ${rolesReused}`);
    console.log(`New permission grants: ${totalGranted}`);
    console.log(`Done — TENANT_ADMIN roles have full DMS access.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
