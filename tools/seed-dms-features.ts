/**
 * Seed DMS core features into FeatureRegistry + assign plan quotas
 * Usage: DATABASE_URL=... npx tsx tools/seed-dms-features.ts
 *
 * This seeds 16 DMS features (category: 'dms') and assigns them to
 * the three standard plans: STARTER, PRO, ENTERPRISE.
 */
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

// ── DMS Features ─────────────────────────────────────────
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

// ── Plan Quota Assignments ────────────────────────────────
// quotaLimit: null = unlimited, number = cap
// isEnabled: true/false
interface PlanQuota {
  featureKey: string;
  starter: { enabled: boolean; limit: number | null };
  pro:     { enabled: boolean; limit: number | null };
  enterprise: { enabled: boolean; limit: number | null };
}

const PLAN_QUOTAS: PlanQuota[] = [
  // Boolean features
  { featureKey: 'file_upload',       starter: { enabled: true,  limit: null }, pro: { enabled: true,  limit: null }, enterprise: { enabled: true,  limit: null } },
  { featureKey: 'file_versioning',   starter: { enabled: false, limit: null }, pro: { enabled: true,  limit: null }, enterprise: { enabled: true,  limit: null } },
  { featureKey: 'file_tagging',      starter: { enabled: true,  limit: null }, pro: { enabled: true,  limit: null }, enterprise: { enabled: true,  limit: null } },
  { featureKey: 'file_share_links',  starter: { enabled: false, limit: null }, pro: { enabled: true,  limit: null }, enterprise: { enabled: true,  limit: null } },
  { featureKey: 'file_annotations',  starter: { enabled: false, limit: null }, pro: { enabled: true,  limit: null }, enterprise: { enabled: true,  limit: null } },
  { featureKey: 'connectors',        starter: { enabled: true,  limit: null }, pro: { enabled: true,  limit: null }, enterprise: { enabled: true,  limit: null } },
  { featureKey: 'migrations',        starter: { enabled: false, limit: null }, pro: { enabled: true,  limit: null }, enterprise: { enabled: true,  limit: null } },
  { featureKey: 'pull_jobs',         starter: { enabled: false, limit: null }, pro: { enabled: true,  limit: null }, enterprise: { enabled: true,  limit: null } },
  { featureKey: 'data_explorer',     starter: { enabled: false, limit: null }, pro: { enabled: true,  limit: null }, enterprise: { enabled: true,  limit: null } },
  { featureKey: 'object_mapper',     starter: { enabled: false, limit: null }, pro: { enabled: false, limit: null }, enterprise: { enabled: true,  limit: null } },
  { featureKey: 'health_monitor',    starter: { enabled: true,  limit: null }, pro: { enabled: true,  limit: null }, enterprise: { enabled: true,  limit: null } },
  { featureKey: 'branding',          starter: { enabled: false, limit: null }, pro: { enabled: false, limit: null }, enterprise: { enabled: true,  limit: null } },
  // Numeric quotas
  { featureKey: 'max_storage_gb',    starter: { enabled: true, limit: 5    }, pro: { enabled: true, limit: 50    }, enterprise: { enabled: true, limit: null } },
  { featureKey: 'max_files',         starter: { enabled: true, limit: 100  }, pro: { enabled: true, limit: 5000  }, enterprise: { enabled: true, limit: null } },
  { featureKey: 'max_connectors',    starter: { enabled: true, limit: 2    }, pro: { enabled: true, limit: 10    }, enterprise: { enabled: true, limit: null } },
  { featureKey: 'max_users',         starter: { enabled: true, limit: 5    }, pro: { enabled: true, limit: 25    }, enterprise: { enabled: true, limit: null } },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required. Set it in .env or pass directly.');
    process.exit(1);
  }
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    // ── Step 1: Seed features ──────────────────────────
    console.log('Step 1/3: Seeding DMS features into FEATURE_REGISTRY...\n');
    for (const f of DMS_FEATURES) {
      await pool.query(
        `INSERT INTO "FEATURE_REGISTRY" ("FEATURE_KEY","FEATURE_NAME","CATEGORY","VALUE_TYPE","DESCRIPTION","STATUS","CREATED_AT","UPDATED_AT")
         VALUES ($1,$2,$3,$4,$5,'ACTIVE',NOW(),NOW())
         ON CONFLICT ("FEATURE_KEY") DO UPDATE SET "CATEGORY"=$3,"VALUE_TYPE"=$4,"DESCRIPTION"=$5,"UPDATED_AT"=NOW()`,
        [f.featureKey, f.featureName, f.category, f.valueType, f.description],
      );
      console.log(`  + ${f.featureKey} (${f.valueType})`);
    }
    const featureCount = await pool.query(`SELECT COUNT(*) FROM "FEATURE_REGISTRY" WHERE "CATEGORY"='dms'`);
    console.log(`\n  ${featureCount.rows[0].count} DMS features in registry.\n`);

    // ── Step 2: Resolve plan IDs ───────────────────────
    console.log('Step 2/3: Resolving plan IDs...\n');
    const planRows = await pool.query(`SELECT "ID","PLAN_NAME" FROM "PLAN" WHERE "PLAN_NAME" IN ('STARTER','PRO','ENTERPRISE') AND "STATUS"='ACTIVE'`);
    const planMap: Record<string, number> = {};
    for (const row of planRows.rows) {
      planMap[row.PLAN_NAME] = row.ID;
      console.log(`  Plan: ${row.PLAN_NAME} → ID ${row.ID}`);
    }

    if (!planMap['STARTER'] || !planMap['PRO'] || !planMap['ENTERPRISE']) {
      console.error('\n  Missing plans! Run seed-cloud-setup first.');
      console.error('  Found:', Object.keys(planMap).join(', ') || 'none');
      process.exit(1);
    }

    // ── Step 3: Assign quotas ──────────────────────────
    console.log('\nStep 3/3: Assigning plan quotas...\n');
    for (const q of PLAN_QUOTAS) {
      // Resolve feature ID
      const fRes = await pool.query(`SELECT "ID" FROM "FEATURE_REGISTRY" WHERE "FEATURE_KEY"=$1`, [q.featureKey]);
      if (fRes.rows.length === 0) {
        console.error(`  ! Feature ${q.featureKey} not found, skipping`);
        continue;
      }
      const featureId = fRes.rows[0].ID;

      // Upsert for each plan
      for (const [planName, config] of [
        ['STARTER', q.starter],
        ['PRO', q.pro],
        ['ENTERPRISE', q.enterprise],
      ] as [string, { enabled: boolean; limit: number | null }][]) {
        const planId = planMap[planName];
        await pool.query(
          `INSERT INTO "PLAN_FEATURE_QUOTA" ("PLAN_ID","FEATURE_ID","QUOTA_LIMIT","IS_ENABLED","CREATED_AT","UPDATED_AT")
           VALUES ($1,$2,$3,$4,NOW(),NOW())
           ON CONFLICT ("PLAN_ID","FEATURE_ID") DO UPDATE SET "QUOTA_LIMIT"=$3,"IS_ENABLED"=$4,"UPDATED_AT"=NOW()`,
          [planId, featureId, config.limit, config.enabled],
        );
      }
      const starterLabel = q.starter.enabled ? (q.starter.limit === null ? 'unlimited' : String(q.starter.limit)) : 'disabled';
      const proLabel = q.pro.enabled ? (q.pro.limit === null ? 'unlimited' : String(q.pro.limit)) : 'disabled';
      const entLabel = q.enterprise.enabled ? (q.enterprise.limit === null ? 'unlimited' : String(q.enterprise.limit)) : 'disabled';
      console.log(`  ${q.featureKey.padEnd(20)} STARTER=${starterLabel.padEnd(10)} PRO=${proLabel.padEnd(10)} ENTERPRISE=${entLabel}`);
    }

    const quotaCount = await pool.query(
      `SELECT COUNT(*) FROM "PLAN_FEATURE_QUOTA" pq
       JOIN "FEATURE_REGISTRY" f ON f."ID"=pq."FEATURE_ID" WHERE f."CATEGORY"='dms'`,
    );
    console.log(`\nDone! ${quotaCount.rows[0].count} DMS plan-feature quotas assigned.`);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
