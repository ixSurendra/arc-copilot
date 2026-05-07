/**
 * Comprehensive plan & feature alignment seed script.
 *
 * This script:
 * 1. Creates missing plans (STARTER, BUSINESS, FREE) alongside existing (ENTERPRISE, BASIC, PROFESSIONAL)
 * 2. Seeds all 16 DMS features into FEATURE_REGISTRY
 * 3. Assigns AI feature quotas for ai_monthly_doc_quota + ai_monthly_query_quota to all plans
 * 4. Assigns DMS feature quotas to all 6 plans
 *
 * Usage: DATABASE_URL=... npx tsx tools/seed-align-plans-features.ts
 * Or:    npx tsx tools/seed-align-plans-features.ts   (reads root .env)
 */
import { Pool } from 'pg';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env') });

// ── DMS Features to seed ─────────────────────────────────────
const DMS_FEATURES = [
  { featureKey: 'file_upload',       featureName: 'File Upload',            category: 'dms', valueType: 'boolean', description: 'Upload, download, and manage files' },
  { featureKey: 'file_versioning',   featureName: 'File Versioning',        category: 'dms', valueType: 'boolean', description: 'File version history, upload new versions, restore previous' },
  { featureKey: 'file_tagging',      featureName: 'File Tagging',           category: 'dms', valueType: 'boolean', description: 'Add key-value tags to files for organization' },
  { featureKey: 'file_share_links',  featureName: 'File Sharing',           category: 'dms', valueType: 'boolean', description: 'Create public share links with expiry, password, download limits' },
  { featureKey: 'file_annotations',  featureName: 'Annotations & Comments', category: 'dms', valueType: 'boolean', description: 'Document annotations and comments overlay' },
  { featureKey: 'connectors',        featureName: 'Storage Connectors',     category: 'dms', valueType: 'boolean', description: 'Connect external storage (S3, Azure, GCS, SharePoint, FTP, databases)' },
  { featureKey: 'migrations',        featureName: 'Data Migrations',        category: 'dms', valueType: 'boolean', description: 'Bulk file migration between connections (COPY/MOVE)' },
  { featureKey: 'pull_jobs',         featureName: 'Document Puller',        category: 'dms', valueType: 'boolean', description: 'Pull/ingest files from external connections' },
  { featureKey: 'data_explorer',     featureName: 'Data Explorer',          category: 'dms', valueType: 'boolean', description: 'Browse database tables, columns, and rows' },
  { featureKey: 'object_mapper',     featureName: 'Object Mapper',          category: 'dms', valueType: 'boolean', description: 'Link files to database records via configurable mappings' },
  { featureKey: 'health_monitor',    featureName: 'Health Monitor',         category: 'dms', valueType: 'boolean', description: 'Scheduled connection health checks and monitoring' },
  { featureKey: 'branding',          featureName: 'Custom Branding',        category: 'dms', valueType: 'boolean', description: 'White-label tenant branding (logo, colors, company name)' },
  { featureKey: 'max_storage_gb',    featureName: 'Max Storage (GB)',       category: 'dms', valueType: 'integer', description: 'Maximum storage per tenant in GB (null = unlimited)' },
  { featureKey: 'max_files',         featureName: 'Max Files',              category: 'dms', valueType: 'integer', description: 'Maximum number of files per tenant (null = unlimited)' },
  { featureKey: 'max_connectors',    featureName: 'Max Connectors',         category: 'dms', valueType: 'integer', description: 'Maximum storage connections per tenant (null = unlimited)' },
  { featureKey: 'max_users',         featureName: 'Max Users',              category: 'dms', valueType: 'integer', description: 'Maximum users per tenant (null = unlimited)' },
];

// ── Plans to create ──────────────────────────────────────────
// Existing: ENTERPRISE(1), BASIC(2), PROFESSIONAL(3)
// New:      STARTER, BUSINESS, FREE
const PLANS_TO_CREATE = [
  { planName: 'STARTER',  description: 'Starter plan — basic DMS features with limited quotas' },
  { planName: 'BUSINESS', description: 'Business plan — full DMS + AI features with generous limits' },
  { planName: 'FREE',     description: 'Free tier — minimal features, small quotas' },
];

// ── Plan feature quota matrix ────────────────────────────────
// Maps feature → each plan's quota config
// null limit = unlimited, number = capped, enabled: true/false
type PlanConfig = { enabled: boolean; limit: number | null };
type PlanQuotaRow = {
  featureKey: string;
  FREE: PlanConfig;
  STARTER: PlanConfig;
  BASIC: PlanConfig;        // ≈ STARTER tier
  BUSINESS: PlanConfig;
  PROFESSIONAL: PlanConfig; // ≈ BUSINESS tier
  ENTERPRISE: PlanConfig;
};

const u = (limit: number | null = null): PlanConfig => ({ enabled: true, limit });
const d: PlanConfig = { enabled: false, limit: null };

const PLAN_QUOTAS: PlanQuotaRow[] = [
  // ─── DMS Boolean Features ────
  //                              FREE           STARTER        BASIC          BUSINESS       PROFESSIONAL   ENTERPRISE
  { featureKey: 'file_upload',       FREE: u(),  STARTER: u(),  BASIC: u(),  BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'file_versioning',   FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'file_tagging',      FREE: u(),  STARTER: u(),  BASIC: u(),  BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'file_share_links',  FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'file_annotations',  FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'connectors',        FREE: u(),  STARTER: u(),  BASIC: u(),  BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'migrations',        FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'pull_jobs',         FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'data_explorer',     FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'object_mapper',     FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: d,    PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'health_monitor',    FREE: d,    STARTER: u(),  BASIC: u(),  BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'branding',          FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: d,    PROFESSIONAL: d,    ENTERPRISE: u() },

  // ─── DMS Numeric Quotas ──────
  { featureKey: 'max_storage_gb',    FREE: u(1),    STARTER: u(5),    BASIC: u(5),    BUSINESS: u(50),    PROFESSIONAL: u(50),    ENTERPRISE: u() },
  { featureKey: 'max_files',         FREE: u(25),   STARTER: u(100),  BASIC: u(100),  BUSINESS: u(5000),  PROFESSIONAL: u(5000),  ENTERPRISE: u() },
  { featureKey: 'max_connectors',    FREE: u(1),    STARTER: u(2),    BASIC: u(3),    BUSINESS: u(10),    PROFESSIONAL: u(10),    ENTERPRISE: u() },
  { featureKey: 'max_users',         FREE: u(2),    STARTER: u(5),    BASIC: u(5),    BUSINESS: u(25),    PROFESSIONAL: u(25),    ENTERPRISE: u() },

  // ─── AI Monthly Quotas ───────
  { featureKey: 'ai_monthly_doc_quota',   FREE: u(10),   STARTER: u(100),  BASIC: u(100),  BUSINESS: u(2000),  PROFESSIONAL: u(5000),  ENTERPRISE: u() },
  { featureKey: 'ai_monthly_query_quota', FREE: u(20),   STARTER: u(200),  BASIC: u(200),  BUSINESS: u(5000),  PROFESSIONAL: u(10000), ENTERPRISE: u() },

  // ─── AI Boolean Features ─────
  { featureKey: 'ai_enabled',           FREE: u(),  STARTER: u(),  BASIC: u(),  BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'ai_auto_process',      FREE: d,    STARTER: u(),  BASIC: u(),  BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'ai_auto_process_pull', FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'ai_ocr_enabled',       FREE: u(),  STARTER: u(),  BASIC: u(),  BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'ai_summarization',     FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'ai_search_enabled',    FREE: u(),  STARTER: u(),  BASIC: u(),  BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'ai_qa_enabled',        FREE: u(),  STARTER: u(),  BASIC: u(),  BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'ai_reranking',         FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: d,    PROFESSIONAL: d,    ENTERPRISE: u() },
  { featureKey: 'ai_hybrid_search',     FREE: d,    STARTER: d,    BASIC: d,    BUSINESS: u(),  PROFESSIONAL: u(),  ENTERPRISE: u() },
  { featureKey: 'ai_max_file_size_mb',  FREE: u(10),STARTER: u(20),BASIC: u(20),BUSINESS: u(100), PROFESSIONAL: u(100), ENTERPRISE: u(500) },
  { featureKey: 'ai_max_concurrency',   FREE: u(1), STARTER: u(1), BASIC: u(1), BUSINESS: u(5),   PROFESSIONAL: u(5),   ENTERPRISE: u(10) },
  { featureKey: 'ai_ocr_language',      FREE: u(),  STARTER: u(),  BASIC: u(),  BUSINESS: u(),    PROFESSIONAL: u(),    ENTERPRISE: u() },
];

const ALL_PLAN_NAMES = ['FREE', 'STARTER', 'BASIC', 'BUSINESS', 'PROFESSIONAL', 'ENTERPRISE'] as const;

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  Plan & Feature Alignment Seed                   ║');
    console.log('╚══════════════════════════════════════════════════╝\n');

    // ── Step 1: Create missing plans ───────────────────
    console.log('Step 1/4: Creating missing plans...\n');
    for (const plan of PLANS_TO_CREATE) {
      const res = await pool.query(
        `INSERT INTO "PLAN" ("PLAN_NAME","DESCRIPTION","STATUS","CREATED_AT","UPDATED_AT")
         VALUES ($1,$2,'ACTIVE',NOW(),NOW())
         ON CONFLICT ("PLAN_NAME") DO UPDATE SET "DESCRIPTION"=$2,"UPDATED_AT"=NOW()
         RETURNING "ID","PLAN_NAME"`,
        [plan.planName, plan.description],
      );
      console.log(`  + ${res.rows[0].PLAN_NAME} (ID=${res.rows[0].ID})`);
    }

    // Fetch all plan IDs
    const planRows = await pool.query(`SELECT "ID","PLAN_NAME" FROM "PLAN" WHERE "STATUS"='ACTIVE' ORDER BY "ID"`);
    const planMap: Record<string, number> = {};
    console.log('\n  All plans:');
    for (const row of planRows.rows) {
      planMap[row.PLAN_NAME] = row.ID;
      console.log(`    ${row.PLAN_NAME} → ID ${row.ID}`);
    }

    // ── Step 2: Seed DMS features ──────────────────────
    console.log('\nStep 2/4: Seeding DMS features...\n');
    for (const f of DMS_FEATURES) {
      await pool.query(
        `INSERT INTO "FEATURE_REGISTRY" ("FEATURE_KEY","FEATURE_NAME","CATEGORY","VALUE_TYPE","DESCRIPTION","STATUS","CREATED_AT","UPDATED_AT")
         VALUES ($1,$2,$3,$4,$5,'ACTIVE',NOW(),NOW())
         ON CONFLICT ("FEATURE_KEY") DO UPDATE SET "FEATURE_NAME"=$2,"CATEGORY"=$3,"VALUE_TYPE"=$4,"DESCRIPTION"=$5,"UPDATED_AT"=NOW()`,
        [f.featureKey, f.featureName, f.category, f.valueType, f.description],
      );
      console.log(`  + ${f.featureKey} (${f.valueType})`);
    }

    // ── Step 3: Build feature ID map ───────────────────
    console.log('\nStep 3/4: Resolving feature IDs...\n');
    const featureRows = await pool.query(`SELECT "ID","FEATURE_KEY" FROM "FEATURE_REGISTRY" WHERE "STATUS"='ACTIVE'`);
    const featureMap: Record<string, number> = {};
    for (const row of featureRows.rows) {
      featureMap[row.FEATURE_KEY] = row.ID;
    }
    console.log(`  ${Object.keys(featureMap).length} active features in registry`);

    // ── Step 4: Assign plan quotas ─────────────────────
    console.log('\nStep 4/4: Assigning plan feature quotas...\n');
    let assignedCount = 0;
    let skippedCount = 0;

    for (const q of PLAN_QUOTAS) {
      const featureId = featureMap[q.featureKey];
      if (!featureId) {
        console.error(`  ! Feature ${q.featureKey} not found — skipping`);
        skippedCount++;
        continue;
      }

      const labels: string[] = [];
      for (const planName of ALL_PLAN_NAMES) {
        const planId = planMap[planName];
        if (!planId) continue;

        const config = q[planName];
        await pool.query(
          `INSERT INTO "PLAN_FEATURE_QUOTA" ("PLAN_ID","FEATURE_ID","QUOTA_LIMIT","IS_ENABLED","CREATED_AT","UPDATED_AT")
           VALUES ($1,$2,$3,$4,NOW(),NOW())
           ON CONFLICT ("PLAN_ID","FEATURE_ID") DO UPDATE SET "QUOTA_LIMIT"=$3,"IS_ENABLED"=$4,"UPDATED_AT"=NOW()`,
          [planId, featureId, config.limit, config.enabled],
        );
        assignedCount++;

        const label = config.enabled
          ? (config.limit === null ? '∞' : String(config.limit))
          : '✗';
        labels.push(`${planName}=${label}`);
      }
      console.log(`  ${q.featureKey.padEnd(26)} ${labels.join('  ')}`);
    }

    // ── Summary ────────────────────────────────────────
    const totalQuotas = await pool.query(`SELECT COUNT(*) FROM "PLAN_FEATURE_QUOTA"`);
    const totalFeatures = await pool.query(`SELECT COUNT(*) FROM "FEATURE_REGISTRY" WHERE "STATUS"='ACTIVE'`);
    const totalPlans = await pool.query(`SELECT COUNT(*) FROM "PLAN" WHERE "STATUS"='ACTIVE'`);

    console.log('\n╔══════════════════════════════════════════════════╗');
    console.log(`║  Done!                                            ║`);
    console.log(`║  Plans: ${totalPlans.rows[0].count}  Features: ${totalFeatures.rows[0].count}  Quotas: ${totalQuotas.rows[0].count}        ║`);
    console.log(`║  Assigned: ${assignedCount}  Skipped: ${skippedCount}                      ║`);
    console.log('╚══════════════════════════════════════════════════╝');
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
