/**
 * Seed DMS Modules & Permissions into ix-copilot's MODULE_MASTER, PERMISSION_MASTER,
 * and MODULE_PERMISSIONS tables (users-service database).
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx tools/seed-dms-modules-permissions.ts
 *   Or: npx tsx tools/seed-dms-modules-permissions.ts   (reads root .env)
 *
 * This script is idempotent — safe to run multiple times.
 * Uses upsert on unique keys (moduleKey, permissionKey).
 */

import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
});

// ── DMS Modules ─────────────────────────────────────────
const MODULES = [
  { moduleKey: 'dms_dashboard',      moduleName: 'Dashboard',          description: 'DMS home dashboard and overview' },
  { moduleKey: 'dms_files',          moduleName: 'File Management',    description: 'Upload, view, edit, delete, share, and export files' },
  { moduleKey: 'dms_connections',    moduleName: 'Connections',        description: 'Manage storage backend connections' },
  { moduleKey: 'dms_migrations',     moduleName: 'Migrations',         description: 'Cross-connection file migration jobs' },
  { moduleKey: 'dms_pull_jobs',      moduleName: 'Document Puller',    description: 'Pull documents from connected sources' },
  { moduleKey: 'dms_data_explorer',  moduleName: 'Document Mapping',   description: 'Explore and map document structures' },
  { moduleKey: 'dms_object_mapper',  moduleName: 'Object Mapper',      description: 'Map objects between data sources' },
  { moduleKey: 'dms_health',         moduleName: 'Health Monitor',     description: 'Connection health and system monitoring' },
  { moduleKey: 'dms_ai',             moduleName: 'AI Processing',      description: 'AI-powered document search, Q&A, and processing' },
  { moduleKey: 'dms_notifications',  moduleName: 'Notifications',      description: 'View and manage system notifications' },
  { moduleKey: 'dms_settings',       moduleName: 'Settings',           description: 'Application settings and configuration' },
  { moduleKey: 'dms_usage',          moduleName: 'Usage & Plan',       description: 'View usage statistics and plan details' },
];

// ── Global Permissions ───────────────────────────────────
const PERMISSIONS = [
  { permissionKey: 'CREATE',  permissionName: 'Create',  description: 'Create new resources' },
  { permissionKey: 'READ',    permissionName: 'Read',    description: 'View and list resources' },
  { permissionKey: 'UPDATE',  permissionName: 'Update',  description: 'Edit existing resources' },
  { permissionKey: 'DELETE',  permissionName: 'Delete',  description: 'Remove resources' },
  { permissionKey: 'EXPORT',  permissionName: 'Export',  description: 'Export/download resources' },
  { permissionKey: 'SHARE',   permissionName: 'Share',   description: 'Share resources with others' },
  { permissionKey: 'EXECUTE', permissionName: 'Execute', description: 'Run/trigger operations (e.g., test connection, start migration)' },
];

// ── Module ↔ Permission mappings ─────────────────────────
const MODULE_PERMISSIONS: Record<string, string[]> = {
  dms_dashboard:     ['READ'],
  dms_files:         ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXPORT', 'SHARE'],
  dms_connections:   ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'],
  dms_migrations:    ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'],
  dms_pull_jobs:     ['CREATE', 'READ', 'UPDATE', 'DELETE', 'EXECUTE'],
  dms_data_explorer: ['READ', 'EXPORT'],
  dms_object_mapper: ['CREATE', 'READ', 'UPDATE', 'DELETE'],
  dms_health:        ['READ'],
  dms_ai:            ['READ', 'CREATE', 'EXECUTE'],
  dms_notifications: ['READ', 'UPDATE'],
  dms_settings:      ['READ', 'UPDATE'],
  dms_usage:         ['READ'],
};

async function main() {
  const client = await pool.connect();
  try {
    console.log('Seeding DMS modules and permissions...\n');

    // 1. Upsert permissions
    console.log('1. Seeding permissions...');
    const permissionMap = new Map<string, number>();
    for (const p of PERMISSIONS) {
      const res = await client.query(
        `INSERT INTO "PERMISSION_MASTER" ("PERMISSION_KEY", "PERMISSION_NAME", "DESCRIPTION", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
         ON CONFLICT ("PERMISSION_KEY") DO UPDATE SET "PERMISSION_NAME" = $2, "DESCRIPTION" = $3, "UPDATED_AT" = NOW()
         RETURNING "ID"`,
        [p.permissionKey, p.permissionName, p.description],
      );
      const id = res.rows[0].ID;
      permissionMap.set(p.permissionKey, id);
      console.log(`   [${id}] ${p.permissionKey} — ${p.permissionName}`);
    }

    // 2. Upsert modules
    console.log('\n2. Seeding modules...');
    const moduleMap = new Map<string, number>();
    for (const m of MODULES) {
      const res = await client.query(
        `INSERT INTO "MODULE_MASTER" ("MODULE_KEY", "MODULE_NAME", "DESCRIPTION", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
         ON CONFLICT ("MODULE_KEY") DO UPDATE SET "MODULE_NAME" = $2, "DESCRIPTION" = $3, "UPDATED_AT" = NOW()
         RETURNING "ID"`,
        [m.moduleKey, m.moduleName, m.description],
      );
      const id = res.rows[0].ID;
      moduleMap.set(m.moduleKey, id);
      console.log(`   [${id}] ${m.moduleKey} — ${m.moduleName}`);
    }

    // 3. Create module-permission junction records
    console.log('\n3. Assigning permissions to modules...');
    let created = 0;
    let skipped = 0;
    for (const [moduleKey, permKeys] of Object.entries(MODULE_PERMISSIONS)) {
      const moduleId = moduleMap.get(moduleKey);
      if (!moduleId) {
        console.warn(`   WARN: Module ${moduleKey} not found, skipping`);
        continue;
      }
      for (const permKey of permKeys) {
        const permissionId = permissionMap.get(permKey);
        if (!permissionId) {
          console.warn(`   WARN: Permission ${permKey} not found, skipping`);
          continue;
        }
        const res = await client.query(
          `INSERT INTO "MODULE_PERMISSIONS" ("MODULE_ID", "PERMISSION_ID", "STATUS")
           VALUES ($1, $2, 'ACTIVE')
           ON CONFLICT ("MODULE_ID", "PERMISSION_ID") DO NOTHING`,
          [moduleId, permissionId],
        );
        if (res.rowCount && res.rowCount > 0) {
          created++;
        } else {
          skipped++;
        }
      }
      console.log(`   ${moduleKey} → [${permKeys.join(', ')}]`);
    }
    console.log(`   Total: ${created} assigned, ${skipped} skipped (already exist)`);

    // 4. Summary
    console.log('\n--- Summary ---');
    console.log(`Modules:     ${MODULES.length}`);
    console.log(`Permissions: ${PERMISSIONS.length}`);
    console.log(`Mappings:    ${Object.values(MODULE_PERMISSIONS).flat().length}`);
    console.log('\nDone! DMS modules and permissions are ready.');
    console.log('Tenant admins can now assign these to roles via the admin-ui permission matrix.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
