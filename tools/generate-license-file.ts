/**
 * Generate a signed on-prem license file from database.
 *
 * Connects to the database, validates the tenant exists, reads the plan and
 * its features, generates a signed license.lic, and stores the record in
 * the TENANT_LICENSE table (visible in admin portal UI).
 *
 * Usage:
 *   npx tsx tools/generate-license-file.ts
 *
 * Prerequisites:
 *   - tools/keys/private.pem must exist (run generate-license-keys.ts first)
 *   - DATABASE_URL must point to a DB with all tables (TENANTS, PLAN, FEATURE_REGISTRY, etc.)
 *
 * Environment variables:
 *   TENANT_ID    — Tenant ID to generate the license for (required)
 *   DATABASE_URL — PostgreSQL connection string (required)
 *
 * Output:
 *   license/license.lic
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const KEYS_DIR = path.join(__dirname, 'keys');
const LICENSE_DIR = path.join(__dirname, '..', 'license');
const PRIVATE_KEY_PATH = path.join(KEYS_DIR, 'private.pem');
const OUTPUT_PATH = path.join(LICENSE_DIR, 'license.lic');

// ── Helpers ───────────────────────────────────────────────────

function signPayload(payload: object, privateKeyPem: string): string {
  const keyObject = crypto.createPrivateKey({
    key: privateKeyPem,
    format: 'pem',
    type: 'pkcs8',
  });

  const sign = crypto.createSign('SHA256');
  sign.update(JSON.stringify(payload));
  sign.end();
  return sign.sign(keyObject, 'base64');
}

/**
 * Read TENANT_ID from: CLI arg > env var > delivery-package/.env
 */
function getTenantId(): number {
  // 1. CLI argument: npx tsx tools/generate-license-file.ts 8
  const cliArg = process.argv[2];
  if (cliArg && !isNaN(Number(cliArg))) {
    return parseInt(cliArg, 10);
  }

  // 2. TENANT_ID env var
  const envVal = process.env['TENANT_ID'];
  if (envVal && !isNaN(Number(envVal))) {
    return parseInt(envVal, 10);
  }

  // 3. Read from delivery-package/.env
  const deliveryEnvPath = path.join(__dirname, '..', 'delivery-package', '.env');
  if (fs.existsSync(deliveryEnvPath)) {
    const lines = fs.readFileSync(deliveryEnvPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('TENANT_ID=')) {
        const val = trimmed.split('=')[1];
        if (val && !isNaN(Number(val))) {
          return parseInt(val, 10);
        }
      }
    }
  }

  console.error('ERROR: TENANT_ID is required.');
  console.error('  Set via: TENANT_ID=8 npx tsx tools/generate-license-file.ts');
  console.error('  Or:      npx tsx tools/generate-license-file.ts 8');
  console.error('  Or:      delivery-package/.env → TENANT_ID=8');
  process.exit(1);
}

/**
 * Read DATABASE_URL from: env var > delivery-package/.env
 */
function getDatabaseUrl(): string {
  // 1. DATABASE_URL env var
  const envVal = process.env['DATABASE_URL'];
  if (envVal) return envVal;

  // 2. Read from delivery-package/.env
  const deliveryEnvPath = path.join(__dirname, '..', 'delivery-package', '.env');
  if (fs.existsSync(deliveryEnvPath)) {
    const lines = fs.readFileSync(deliveryEnvPath, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('DATABASE_URL=')) {
        return trimmed.slice('DATABASE_URL='.length);
      }
    }
  }

  console.error('ERROR: DATABASE_URL is required.');
  console.error('  Set via: DATABASE_URL=postgresql://... npx tsx tools/generate-license-file.ts');
  process.exit(1);
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  // 1. Validate private key exists
  if (!fs.existsSync(PRIVATE_KEY_PATH)) {
    console.error('Private key not found at', PRIVATE_KEY_PATH);
    console.error('Run: npx tsx tools/generate-license-keys.ts first');
    process.exit(1);
  }

  // Create license directory
  if (!fs.existsSync(LICENSE_DIR)) {
    fs.mkdirSync(LICENSE_DIR, { recursive: true });
  }

  const tenantId = getTenantId();
  const databaseUrl = getDatabaseUrl();
  const privateKeyPem = fs.readFileSync(PRIVATE_KEY_PATH, 'utf-8');
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('  ix-copilot — License Generator (from DB)');
    console.log('═══════════════════════════════════════════════════\n');

    // 2. Validate tenant exists in DB
    const tenantResult = await pool.query(
      `SELECT "ID", "TENANT_NAME", "PLAN_ID", "MAX_USERS", "BILLING_CYCLE" FROM "TENANTS" WHERE "ID" = $1`,
      [tenantId],
    );

    if (tenantResult.rows.length === 0) {
      console.error(`ERROR: Tenant not found with ID=${tenantId}`);
      console.error('  Make sure the tenant exists in the database before generating a license.');
      process.exit(1);
    }

    const tenant = tenantResult.rows[0];
    const tenantPlanId: number = tenant.PLAN_ID;
    const billingCycle: string = tenant.BILLING_CYCLE || 'ANNUALLY';
    const maxUsers: number | null = tenant.MAX_USERS || null;

    console.log(`[found]   Tenant: "${tenant.TENANT_NAME}" (ID=${tenantId})`);
    console.log(`[found]   Plan ID: ${tenantPlanId}`);

    // 3. Find the Plan record by plan ID (integer FK)
    const planResult = await pool.query(
      `SELECT "ID", "PLAN_NAME" FROM "PLAN" WHERE "ID" = $1 AND "STATUS" = 'ACTIVE'`,
      [tenantPlanId],
    );

    if (planResult.rows.length === 0) {
      console.error(`ERROR: Plan ID "${tenantPlanId}" not found in the PLAN table.`);
      console.error('  Make sure the plan exists and is ACTIVE in the license-service database.');
      process.exit(1);
    }

    const planId: number = planResult.rows[0].ID;
    const planName: string = planResult.rows[0].PLAN_NAME;
    console.log(`[found]   Plan:    ${planName} (ID=${planId})\n`);

    // 4. Get features from PLAN_FEATURE_QUOTA + FEATURE_REGISTRY
    const featuresResult = await pool.query(
      `SELECT fr."FEATURE_KEY", fr."FEATURE_NAME", pfq."QUOTA_LIMIT"
       FROM "PLAN_FEATURE_QUOTA" pfq
       JOIN "FEATURE_REGISTRY" fr ON fr."ID" = pfq."FEATURE_ID"
       WHERE pfq."PLAN_ID" = $1 AND pfq."IS_ENABLED" = true
       ORDER BY fr."FEATURE_KEY" ASC`,
      [planId],
    );

    if (featuresResult.rows.length === 0) {
      console.error(`ERROR: No features found for plan "${planName}" (ID=${planId}).`);
      console.error('  Add features to PLAN_FEATURE_QUOTA before generating a license.');
      process.exit(1);
    }

    const features = featuresResult.rows.map((row) => ({
      featureKey: row.FEATURE_KEY as string,
      featureName: row.FEATURE_NAME as string,
      quotaLimit: (row.QUOTA_LIMIT as number) ?? null,
    }));

    console.log(`[found]   Features (${features.length}):`);
    for (const f of features) {
      console.log(`          - ${f.featureKey}: ${f.featureName} (quota: ${f.quotaLimit ?? 'unlimited'})`);
    }

    // 5. Build license payload
    const now = new Date();
    const startDate = now;
    const expiresAt = new Date(startDate);
    expiresAt.setFullYear(expiresAt.getFullYear() + 1); // 1 year license

    const payload = {
      tenantId,
      planId,
      startDate: startDate.toISOString(),
      issuedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      cycle: billingCycle,
      maxUsers,
      features,
    };

    // 6. Sign payload with private key
    const signature = signPayload(payload, privateKeyPem);
    const signatureHash = crypto
      .createHash('sha256')
      .update(signature)
      .digest('hex');

    // 7. Write license.lic to disk
    const licenseFile = { payload, signature };
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(licenseFile, null, 2), 'utf-8');

    console.log(`\n[written] ${OUTPUT_PATH}`);

    // 8. Store TENANT_LICENSE record in DB (visible in admin portal UI)
    // This step is optional — if the table doesn't exist (e.g. dev machine DB),
    // skip gracefully. The license.lic file is already written and functional.
    let version = 1;
    let dbRecordStatus = '⚠ skipped (TENANT_LICENSE table not found)';
    try {
      const versionResult = await pool.query(
        `SELECT MAX("VERSION") as max_version FROM "TENANT_LICENSE" WHERE "TENANT_ID" = $1`,
        [tenantId],
      );
      version = (versionResult.rows[0]?.max_version ?? 0) + 1;

      // Mark previous ACTIVE licenses as EXPIRED
      await pool.query(
        `UPDATE "TENANT_LICENSE" SET "STATUS" = 'EXPIRED', "UPDATED_AT" = NOW()
         WHERE "TENANT_ID" = $1 AND "STATUS" = 'ACTIVE'`,
        [tenantId],
      );

      // Insert new license record
      await pool.query(
        `INSERT INTO "TENANT_LICENSE" ("TENANT_ID", "PLAN_ID", "CYCLE", "MAX_USERS", "START_DATE", "EXPIRES_AT", "ISSUED_AT", "SIGNATURE_HASH", "LICENSE_DATA", "ISSUED_BY", "STATUS", "VERSION", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 'ACTIVE', $10, NOW(), NOW())`,
        [
          tenantId,
          planId,
          billingCycle,
          maxUsers,
          startDate,
          expiresAt,
          now,
          signatureHash,
          JSON.stringify({ payload, signature }),
          version,
        ],
      );
      dbRecordStatus = `✓ stored in TENANT_LICENSE (version=${version})`;
      console.log(`[stored]  License record in DB (version=${version})`);
    } catch (dbErr: any) {
      console.log(`[skipped] DB record storage: ${dbErr.message}`);
    }

    // ── Summary ──────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  License generated successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\n  Tenant:     ${tenant.TENANT_NAME} (ID=${tenantId})`);
    console.log(`  Plan:       ${planName} (ID=${planId})`);
    console.log(`  Start:      ${payload.startDate}`);
    console.log(`  Expires:    ${payload.expiresAt}`);
    console.log(`  Cycle:      ${payload.cycle}`);
    console.log(`  Max Users:  ${maxUsers ?? 'unlimited'}`);
    console.log(`  Features:   ${features.map((f) => f.featureKey).join(', ')}`);
    console.log(`  Version:    ${version}`);
    console.log(`  File:       ${OUTPUT_PATH}`);
    console.log(`  DB Record:  ${dbRecordStatus}\n`);

  } catch (error) {
    console.error('License generation failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
