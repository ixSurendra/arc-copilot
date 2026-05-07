/**
 * Backfill TENANT_ADMIN roles for existing tenants
 *
 * When tenant-service was deployed without USERS_SERVICE_HOST, the TCP call
 * to create_default_roles silently failed for every tenant created.
 * This script finds all tenants missing a TENANT_ADMIN role and creates it.
 *
 * Usage (run from workspace root):
 *   DATABASE_URL=... npx tsx tools/backfill-tenant-admin-roles.ts
 *
 * Or on EC2:
 *   docker compose exec migrate sh -c \
 *     "DATABASE_URL=\$DATABASE_URL npx tsx tools/backfill-tenant-admin-roles.ts"
 */

import { Client } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is required');
  process.exit(1);
}

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log('✓ Connected to database\n');

  try {
    // 1. Get all real tenants (exclude system tenant ID=0)
    const tenantsResult = await client.query<{ ID: number; TENANT_NAME: string }>(
      `SELECT "ID", "TENANT_NAME" FROM "TENANTS" WHERE "ID" != 0 ORDER BY "ID"`,
    );
    const tenants = tenantsResult.rows;
    console.log(`Found ${tenants.length} tenant(s):\n`);

    let created = 0;
    let skipped = 0;

    for (const tenant of tenants) {
      const tenantId = tenant['ID'];
      const tenantName = tenant['TENANT_NAME'];

      // 2. Check if TENANT_ADMIN role already exists for this tenant
      const existing = await client.query(
        `SELECT "ID" FROM "ROLES"
         WHERE "TENANT_ID" = $1 AND "ROLE_NAME" = 'TENANT_ADMIN'`,
        [tenantId],
      );

      if (existing.rows.length > 0) {
        console.log(`  ⏭  Tenant ${tenantId} (${tenantName}) — TENANT_ADMIN already exists (id=${existing.rows[0]['ID']})`);
        skipped++;
        continue;
      }

      // 3. Create TENANT_ADMIN role
      const inserted = await client.query(
        `INSERT INTO "ROLES" ("TENANT_ID", "ROLE_NAME", "DESCRIPTION", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, 'TENANT_ADMIN', 'Default tenant administrator role', 'ACTIVE', NOW(), NOW())
         RETURNING "ID"`,
        [tenantId],
      );

      const newRoleId = inserted.rows[0]['ID'];
      console.log(`  ✓  Tenant ${tenantId} (${tenantName}) — created TENANT_ADMIN role (id=${newRoleId})`);
      created++;
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`✅ Done — created: ${created}, skipped (already existed): ${skipped}`);

  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err.message);
  process.exit(1);
});
