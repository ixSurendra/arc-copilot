/**
 * Fix Tenant Plan IDs — one-time data migration
 * ================================================
 *
 * Background
 * ----------
 * TENANTS.PLAN_ID is supposed to store plan NAMES as strings (e.g. "PROFESSIONAL"),
 * but a bug in admin-ui (tenant-detail-client.tsx) was sending the numeric Plan.id
 * ("3") instead of the plan name. This migration:
 *
 *  1. Finds all tenants where PLAN_ID is a numeric string (e.g. "2", "3").
 *  2. Looks up the corresponding plan by numeric id in the PLAN table.
 *  3. Updates TENANTS.PLAN_ID to the plan NAME (e.g. "BASIC", "PROFESSIONAL").
 *  4. Writes a TENANT_PLAN_HISTORY entry with changeType = INITIAL, so the
 *     correction is auditable.
 *
 * Does the same for NEXT_PLAN_ID.
 *
 * Usage
 * -----
 *   Dry-run (default — prints what would change, no writes):
 *     DATABASE_URL="postgresql://..." npx tsx tools/fix-tenant-plan-ids.ts
 *
 *   Apply the fix:
 *     DATABASE_URL="postgresql://..." npx tsx tools/fix-tenant-plan-ids.ts --apply
 *
 * Safety
 * ------
 *  - Dry-run by default. Must pass --apply to actually mutate data.
 *  - Refuses to run if DATABASE_URL points to production unless --force is passed.
 *  - Idempotent: re-running after a successful migration is a no-op.
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env['DATABASE_URL'];
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL env var is required');
  process.exit(1);
}

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const FORCE = args.includes('--force');

function looksLikeProduction(url: string): boolean {
  return /prod|production/i.test(url);
}

if (looksLikeProduction(DATABASE_URL) && !FORCE) {
  console.error(
    'ERROR: DATABASE_URL looks like a production DB. Pass --force to override.',
  );
  process.exit(1);
}

interface TenantRow {
  id: number;
  tenantName: string;
  planId: string | null;
  nextPlanId: string | null;
}

interface PlanRow {
  id: number;
  planName: string;
}

async function main() {
  const pool = new Pool({ connectionString: DATABASE_URL });

  console.log(
    `fix-tenant-plan-ids: mode=${APPLY ? 'APPLY' : 'DRY-RUN'}  db=${DATABASE_URL.replace(
      /:[^:@/]+@/,
      ':***@',
    )}`,
  );
  console.log('');

  try {
    // 1. Load all plans so we can look up by numeric id
    const plansRes = await pool.query<PlanRow>(
      'SELECT "ID" AS id, "PLAN_NAME" AS "planName" FROM "PLAN" ORDER BY "ID"',
    );
    const plansById = new Map<number, string>();
    for (const p of plansRes.rows) {
      plansById.set(p.id, p.planName);
    }
    console.log(
      `Loaded ${plansById.size} plans:`,
      Array.from(plansById.entries())
        .map(([id, name]) => `${id}=${name}`)
        .join(', '),
    );
    console.log('');

    // 2. Find tenants with numeric-string plan IDs
    const tenantsRes = await pool.query<TenantRow>(
      `SELECT "ID" AS id, "TENANT_NAME" AS "tenantName",
              "PLAN_ID" AS "planId", "NEXT_PLAN_ID" AS "nextPlanId"
         FROM "TENANTS"
        WHERE "PLAN_ID" ~ '^[0-9]+$' OR "NEXT_PLAN_ID" ~ '^[0-9]+$'
        ORDER BY "ID"`,
    );

    if (tenantsRes.rows.length === 0) {
      console.log(
        '✅ No tenants with numeric plan IDs — nothing to fix. Exiting.',
      );
      return;
    }

    console.log(
      `Found ${tenantsRes.rows.length} tenants needing correction:`,
    );

    const fixes: Array<{
      id: number;
      tenantName: string;
      planIdOld?: string;
      planIdNew?: string;
      nextPlanIdOld?: string;
      nextPlanIdNew?: string;
    }> = [];

    for (const tenant of tenantsRes.rows) {
      const fix: (typeof fixes)[number] = {
        id: tenant.id,
        tenantName: tenant.tenantName,
      };

      if (tenant.planId && /^\d+$/.test(tenant.planId)) {
        const numericId = Number(tenant.planId);
        const name = plansById.get(numericId);
        if (!name) {
          console.warn(
            `  [${tenant.id}] ${tenant.tenantName}: planId="${tenant.planId}" does not match any plan in PLAN table — SKIPPING`,
          );
          continue;
        }
        fix.planIdOld = tenant.planId;
        fix.planIdNew = name;
      }

      if (tenant.nextPlanId && /^\d+$/.test(tenant.nextPlanId)) {
        const numericId = Number(tenant.nextPlanId);
        const name = plansById.get(numericId);
        if (name) {
          fix.nextPlanIdOld = tenant.nextPlanId;
          fix.nextPlanIdNew = name;
        }
      }

      if (fix.planIdNew || fix.nextPlanIdNew) {
        fixes.push(fix);
        console.log(
          `  [${tenant.id}] ${tenant.tenantName}: ${
            fix.planIdNew
              ? `PLAN_ID "${fix.planIdOld}" → "${fix.planIdNew}"`
              : ''
          }${
            fix.nextPlanIdNew
              ? `${fix.planIdNew ? ', ' : ''}NEXT_PLAN_ID "${fix.nextPlanIdOld}" → "${fix.nextPlanIdNew}"`
              : ''
          }`,
        );
      }
    }

    if (fixes.length === 0) {
      console.log('');
      console.log('✅ Nothing to apply — exiting.');
      return;
    }

    console.log('');
    if (!APPLY) {
      console.log('DRY-RUN complete. Re-run with --apply to commit the fixes.');
      return;
    }

    console.log('Applying fixes…');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const fix of fixes) {
        const setParts: string[] = [];
        const values: unknown[] = [];
        let i = 1;
        if (fix.planIdNew) {
          setParts.push(`"PLAN_ID" = $${i++}`);
          values.push(fix.planIdNew);
        }
        if (fix.nextPlanIdNew) {
          setParts.push(`"NEXT_PLAN_ID" = $${i++}`);
          values.push(fix.nextPlanIdNew);
        }
        values.push(fix.id);
        await client.query(
          `UPDATE "TENANTS" SET ${setParts.join(', ')} WHERE "ID" = $${i}`,
          values,
        );

        // Record a plan-history entry so the correction is auditable.
        if (fix.planIdNew) {
          await client.query(
            `INSERT INTO "TENANT_PLAN_HISTORY"
               ("TENANT_ID", "PLAN_ID", "CHANGE_TYPE", "START_DATE")
             VALUES ($1, $2, 'INITIAL', NOW())`,
            [fix.id, fix.planIdNew],
          );
        }

        console.log(`  ✅ [${fix.id}] ${fix.tenantName} corrected`);
      }
      await client.query('COMMIT');
      console.log('');
      console.log(`✅ Applied ${fixes.length} fixes.`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('');
      console.error('❌ Rolled back due to error:', err);
      process.exit(1);
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
