/**
 * Seed script — creates the System Tenant, SUPER_ADMIN role, and first super admin user.
 *
 * Usage:
 *   DATABASE_URL=postgresql://... npx ts-node tools/seed-super-admin.ts
 *
 * Or with .env:
 *   npx ts-node -r dotenv/config tools/seed-super-admin.ts
 *
 * Environment variables:
 *   DATABASE_URL          — PostgreSQL connection string (required)
 *   SUPER_ADMIN_EMAIL     — Email for the super admin (default: admin@system.local)
 *   SUPER_ADMIN_PASSWORD  — Password for the super admin (default: ChangeMe123!)
 *   ON_PREM               — If 'true', skips system tenant + super admin creation
 */

import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';

const SYSTEM_TENANT_ID = 0;

interface SeedConfig {
  databaseUrl: string;
  email: string;
  password: string;
}

function getConfig(): SeedConfig {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  return {
    databaseUrl,
    email: process.env['SUPER_ADMIN_EMAIL'] || 'admin@system.local',
    password: process.env['SUPER_ADMIN_PASSWORD'] || 'ChangeMe123!',
  };
}

async function main() {
  // On-prem guard: super admin does not exist in on-prem deployments
  if (process.env['ON_PREM'] === 'true') {
    console.log('ON_PREM=true — skipping system tenant and super admin creation.');
    process.exit(0);
  }

  const config = getConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    console.log('Starting seed: System Tenant + Super Admin\n');

    // ── 1. Create System Tenant (ID = 0) ──────────────────────────
    const tenantExists = await pool.query(
      `SELECT "ID" FROM "TENANTS" WHERE "ID" = $1`,
      [SYSTEM_TENANT_ID],
    );

    if (tenantExists.rows.length > 0) {
      console.log(`[skip] System tenant already exists (ID=${SYSTEM_TENANT_ID})`);
    } else {
      // Override the SERIAL sequence to insert ID = 0
      await pool.query(
        `INSERT INTO "TENANTS" ("ID", "PLAN_ID", "QUOTA_TYPE", "MAX_USERS", "BILLING_CYCLE", "CYCLE_START_DATE", "TENANT_NAME", "DOMAIN", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, 'SYSTEM', 'SHARED', NULL, NULL, NULL, 'System', 'system.local', 'ACTIVE', NOW(), NOW())`,
        [SYSTEM_TENANT_ID],
      );
      console.log(`[created] System tenant: ID=${SYSTEM_TENANT_ID}`);
    }

    // ── 2. Create SUPER_ADMIN role ───────────────────────────────
    const superAdminRole = await pool.query(
      `SELECT "ID" FROM "ROLES" WHERE "TENANT_ID" = $1 AND "ROLE_NAME" = 'SUPER_ADMIN'`,
      [SYSTEM_TENANT_ID],
    );

    let superAdminRoleId: number;
    if (superAdminRole.rows.length > 0) {
      superAdminRoleId = superAdminRole.rows[0].ID;
      console.log(`[skip] SUPER_ADMIN role already exists (ID=${superAdminRoleId})`);
    } else {
      const roleResult = await pool.query(
        `INSERT INTO "ROLES" ("TENANT_ID", "ROLE_NAME", "DESCRIPTION", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, 'SUPER_ADMIN', 'Platform-level super administrator', 'ACTIVE', NOW(), NOW())
         RETURNING "ID"`,
        [SYSTEM_TENANT_ID],
      );
      superAdminRoleId = roleResult.rows[0].ID;
      console.log(`[created] SUPER_ADMIN role: ID=${superAdminRoleId}`);
    }

    // ── 3. Create TENANT_ADMIN role (template for system tenant) ─
    const tenantAdminRole = await pool.query(
      `SELECT "ID" FROM "ROLES" WHERE "TENANT_ID" = $1 AND "ROLE_NAME" = 'TENANT_ADMIN'`,
      [SYSTEM_TENANT_ID],
    );

    if (tenantAdminRole.rows.length > 0) {
      console.log(`[skip] TENANT_ADMIN role already exists (ID=${tenantAdminRole.rows[0].ID})`);
    } else {
      const taResult = await pool.query(
        `INSERT INTO "ROLES" ("TENANT_ID", "ROLE_NAME", "DESCRIPTION", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, 'TENANT_ADMIN', 'Tenant administrator', 'ACTIVE', NOW(), NOW())
         RETURNING "ID"`,
        [SYSTEM_TENANT_ID],
      );
      console.log(`[created] TENANT_ADMIN role: ID=${taResult.rows[0].ID}`);
    }

    // ── 4. Create Super Admin user ───────────────────────────────
    const userExists = await pool.query(
      `SELECT "ID" FROM "USERS" WHERE "TENANT_ID" = $1 AND "EMAIL" = $2`,
      [SYSTEM_TENANT_ID, config.email],
    );

    let userId: number;
    if (userExists.rows.length > 0) {
      userId = userExists.rows[0].ID;
      console.log(`[skip] Super admin user already exists (ID=${userId})`);
    } else {
      const userResult = await pool.query(
        `INSERT INTO "USERS" ("TENANT_ID", "EMAIL", "FIRST_NAME", "LAST_NAME", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, $2, 'Super', 'Admin', 'ACTIVE', NOW(), NOW())
         RETURNING "ID"`,
        [SYSTEM_TENANT_ID, config.email],
      );
      userId = userResult.rows[0].ID;
      console.log(`[created] Super admin user: ID=${userId} (${config.email})`);
    }

    // ── 5. Assign SUPER_ADMIN role to the user ───────────────────
    const roleAssignment = await pool.query(
      `SELECT "USER_ID" FROM "USER_ROLES" WHERE "USER_ID" = $1 AND "ROLE_ID" = $2`,
      [userId, superAdminRoleId],
    );

    if (roleAssignment.rows.length > 0) {
      console.log(`[skip] SUPER_ADMIN role already assigned to user`);
    } else {
      await pool.query(
        `INSERT INTO "USER_ROLES" ("USER_ID", "ROLE_ID") VALUES ($1, $2)`,
        [userId, superAdminRoleId],
      );
      console.log(`[created] Assigned SUPER_ADMIN role to user`);
    }

    // ── 6. Create credentials (password) ─────────────────────────
    const credExists = await pool.query(
      `SELECT "ID" FROM "USER_CREDENTIALS" WHERE "USER_ID" = $1`,
      [userId],
    );

    if (credExists.rows.length > 0) {
      console.log(`[skip] Credentials already exist for user`);
    } else {
      const passwordHash = await bcrypt.hash(config.password, 12);
      await pool.query(
        `INSERT INTO "USER_CREDENTIALS" ("USER_ID", "TENANT_ID", "AUTH_TYPE", "PASSWORD_HASH", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, $2, 'PASSWORD', $3, 'ACTIVE', NOW(), NOW())`,
        [userId, SYSTEM_TENANT_ID, passwordHash],
      );
      console.log(`[created] Credentials for super admin`);
    }

    console.log('\nSeed completed successfully!');
    console.log(`\n  Email:    ${config.email}`);
    console.log(`  Password: ${config.password}`);
    console.log(`  Tenant:   ID=${SYSTEM_TENANT_ID}`);
    console.log('\n  Change the password after first login!');

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
