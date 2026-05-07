/**
 * seed-arc.ts — first-boot seed for arc-copilot.
 *
 * Idempotent. Run on a fresh `arc_db`, or re-run safely after schema
 * migrations. Every insert uses ON CONFLICT ... DO UPDATE on its
 * unique key.
 *
 * What this script seeds:
 *   1. SYSTEM tenant (ID=0)
 *   2. SUPER_ADMIN role + TENANT_ADMIN template role on the system tenant
 *   3. Super Admin user with a random one-time password (printed once)
 *   4. Permissions (CRUD + Arc-specific verbs)
 *   5. Modules with dependsOn (the dependency graph from UX-SPEC §13)
 *   6. ModulePermission pairs (only the meaningful (module, permission) tuples)
 *   7. Features with dependsOn (15 Arc features grouped Core / SKU / Optional)
 *   8. Plans (FREE / BUSINESS / ENTERPRISE / ON_PREM)
 *   9. PlanFeatureQuota mapping (which features each plan enables;
 *      quotaLimit always null on-prem — unlimited)
 *   10. Default global branding for tenantId=0
 *   11. Default global email templates for tenantId=0
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:6433/arc_db \
 *     bun run tools/seed-arc.ts
 *
 * Env vars (all optional except DATABASE_URL):
 *   DATABASE_URL          — Postgres connection string for arc_db
 *   SUPER_ADMIN_EMAIL     — default: admin@arc.local
 *   SUPER_ADMIN_PASSWORD  — explicit password override; if unset, a
 *                            random 24-char password is generated and
 *                            printed once at the end of the run
 */

import { Pool, type PoolClient } from "pg";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { config as loadEnv } from "dotenv";
import { resolve } from "path";

loadEnv({ path: resolve(__dirname, "../.env") });

const SYSTEM_TENANT_ID = 0;

// ─────────────────────────────────────────────────────────────────
// Static seed data
// ─────────────────────────────────────────────────────────────────

const PERMISSIONS: Array<{
  permissionKey: string;
  permissionName: string;
  description: string;
}> = [
  { permissionKey: "CREATE", permissionName: "Create", description: "Create new resources" },
  { permissionKey: "READ", permissionName: "Read", description: "View and list resources" },
  { permissionKey: "UPDATE", permissionName: "Update", description: "Edit existing resources" },
  { permissionKey: "DELETE", permissionName: "Delete", description: "Remove resources" },
  { permissionKey: "EXPORT", permissionName: "Export", description: "Download / export resources" },
  { permissionKey: "SHARE", permissionName: "Share", description: "Share resources with other users" },
  { permissionKey: "EXECUTE", permissionName: "Execute", description: "Run / trigger operations (test connection, refresh, etc.)" },
  { permissionKey: "EMBED", permissionName: "Embed", description: "Embed in external applications" },
  { permissionKey: "SCHEDULE", permissionName: "Schedule", description: "Schedule recurring delivery (reports)" },
  { permissionKey: "USE", permissionName: "Use", description: "Use AI features (everyday users)" },
  { permissionKey: "CONFIGURE", permissionName: "Configure", description: "Configure AI provider, models, limits (admins)" },
];

const MODULES: Array<{
  moduleKey: string;
  moduleName: string;
  description: string;
  dependsOn: string[];
}> = [
  {
    moduleKey: "DATA_SOURCES",
    moduleName: "Data Sources",
    description: "Connect databases or upload CSVs",
    dependsOn: [], // root
  },
  {
    moduleKey: "DATA_MODEL",
    moduleName: "Data Model",
    description: "Semantic layer — friendly names, FK labels, named metrics, joins, access policies",
    dependsOn: ["DATA_SOURCES"],
  },
  {
    moduleKey: "WIDGETS",
    moduleName: "Widgets",
    description: "Saved questions — visual / SQL / Ask-AI builder, widget library",
    dependsOn: ["DATA_MODEL"],
  },
  {
    moduleKey: "DASHBOARDS",
    moduleName: "Dashboards",
    description: "Responsive grid of widgets with filters, themes, drill-down",
    dependsOn: ["WIDGETS"],
  },
  {
    moduleKey: "REPORTS",
    moduleName: "Reports",
    description: "Flowing-document composer with widgets + prose, scheduling, exports",
    dependsOn: ["WIDGETS"],
  },
  {
    moduleKey: "AI",
    moduleName: "AI Assistant",
    description: "Ask AI, Explain, Auto-name, anomaly callouts, smart-fill templates",
    dependsOn: ["DATA_MODEL"],
  },
  {
    moduleKey: "EMBED",
    moduleName: "Embed",
    description: "Iframe embedding with signed JWT for external apps",
    dependsOn: ["DASHBOARDS"], // soft: works with REPORTS too
  },
  {
    moduleKey: "WORKSPACE",
    moduleName: "Workspace",
    description: "Branding, themes, members, workspace-level settings",
    dependsOn: [],
  },
];

const MODULE_PERMISSIONS: Record<string, string[]> = {
  DATA_SOURCES: ["CREATE", "READ", "UPDATE", "DELETE", "EXECUTE"],
  DATA_MODEL: ["READ", "UPDATE"],
  WIDGETS: ["CREATE", "READ", "UPDATE", "DELETE"],
  DASHBOARDS: ["CREATE", "READ", "UPDATE", "DELETE", "SHARE", "EMBED", "EXPORT"],
  REPORTS: ["CREATE", "READ", "UPDATE", "DELETE", "SHARE", "EMBED", "SCHEDULE", "EXPORT"],
  AI: ["USE", "CONFIGURE"],
  EMBED: ["CREATE", "READ", "DELETE"],
  WORKSPACE: ["READ", "UPDATE"],
};

const FEATURES: Array<{
  featureKey: string;
  featureName: string;
  category: string;
  valueType: string;
  description: string;
  dependsOn: string[];
}> = [
  // ── Core (every Arc deployment includes these) ─────────────
  { featureKey: "arc.core.workspace", featureName: "Workspace", category: "arc", valueType: "boolean", description: "Home, navigation, settings", dependsOn: [] },
  { featureKey: "arc.core.data_sources", featureName: "Data Sources", category: "arc", valueType: "boolean", description: "Postgres + MySQL + CSV upload", dependsOn: [] },
  { featureKey: "arc.core.data_model", featureName: "Data Model", category: "arc", valueType: "boolean", description: "Semantic layer authoring", dependsOn: ["arc.core.data_sources"] },
  { featureKey: "arc.core.widgets", featureName: "Widgets", category: "arc", valueType: "boolean", description: "Widget library + builder", dependsOn: ["arc.core.data_model"] },
  { featureKey: "arc.core.dashboards", featureName: "Dashboards", category: "arc", valueType: "boolean", description: "Responsive dashboard grid", dependsOn: ["arc.core.widgets"] },
  // ── Differentiators ────────────────────────────────────────
  { featureKey: "arc.reports", featureName: "Reports", category: "arc", valueType: "boolean", description: "Reports composer + scheduling + exports", dependsOn: ["arc.core.widgets"] },
  { featureKey: "arc.embed", featureName: "Embed", category: "arc", valueType: "boolean", description: "Iframe embedding + JWT signing", dependsOn: ["arc.core.dashboards"] },
  { featureKey: "arc.ai.assistant", featureName: "AI Assistant", category: "arc", valueType: "boolean", description: "Ask AI, Explain, Auto-name, smart-fill", dependsOn: ["arc.core.data_model"] },
  { featureKey: "arc.ai.insights", featureName: "AI Insights", category: "arc", valueType: "boolean", description: "Anomaly callouts, auto-summary, suggested arrangements", dependsOn: ["arc.ai.assistant"] },
  { featureKey: "arc.ai.byo_llm", featureName: "BYO LLM", category: "arc", valueType: "boolean", description: "Per-tenant LLM provider (OpenAI / Anthropic / Azure / Ollama)", dependsOn: ["arc.ai.assistant"] },
  { featureKey: "arc.connectors.bigquery", featureName: "BigQuery Connector", category: "arc", valueType: "boolean", description: "Connect Google BigQuery as a source", dependsOn: ["arc.core.data_sources"] },
  { featureKey: "arc.connectors.snowflake", featureName: "Snowflake Connector", category: "arc", valueType: "boolean", description: "Connect Snowflake as a source", dependsOn: ["arc.core.data_sources"] },
  { featureKey: "arc.public_share_links", featureName: "Public Share Links", category: "arc", valueType: "boolean", description: "Tokenized URLs for no-login viewers", dependsOn: ["arc.core.dashboards"] },
  // ── Optional polish ────────────────────────────────────────
  { featureKey: "arc.advanced_branding", featureName: "Advanced Branding", category: "arc", valueType: "boolean", description: "Per-dashboard / per-widget theme overrides", dependsOn: ["arc.core.workspace"] },
  { featureKey: "arc.audit_log_viewer", featureName: "Audit Log Viewer", category: "arc", valueType: "boolean", description: "In-product audit log surface for tenant admins", dependsOn: [] },
];

// Plans sized for the on-prem-first model.
// Names are drawn from the canonical foundation tier order
// (FREE < STARTER < BASIC < BUSINESS < PROFESSIONAL < ENTERPRISE)
// plus the reserved ON_PREM bundle. We seed only the four that are
// realistic for arc-copilot — others can be added later or generated
// per-customer via the admin-portal.
const PLANS: Array<{ planName: string; description: string }> = [
  { planName: "FREE", description: "Free tier — core BI loop only, for evaluation" },
  { planName: "BUSINESS", description: "Reports + AI Assistant + extra connectors" },
  { planName: "ENTERPRISE", description: "Everything: AI Insights, embed, advanced branding" },
  { planName: "ON_PREM", description: "On-prem deployments — every feature licensed, unlimited" },
];

// Plan → feature bundle. true = feature enabled; false / missing = not in the plan.
const PLAN_FEATURE_MATRIX: Record<string, Set<string>> = {
  FREE: new Set([
    "arc.core.workspace",
    "arc.core.data_sources",
    "arc.core.data_model",
    "arc.core.widgets",
    "arc.core.dashboards",
  ]),
  BUSINESS: new Set([
    "arc.core.workspace",
    "arc.core.data_sources",
    "arc.core.data_model",
    "arc.core.widgets",
    "arc.core.dashboards",
    "arc.reports",
    "arc.ai.assistant",
    "arc.connectors.bigquery",
    "arc.public_share_links",
    "arc.audit_log_viewer",
  ]),
  ENTERPRISE: new Set(FEATURES.map((f) => f.featureKey)),
  ON_PREM: new Set(FEATURES.map((f) => f.featureKey)),
};

// ─────────────────────────────────────────────────────────────────
// Default content (branding + email templates)
// ─────────────────────────────────────────────────────────────────

const ARC_BRANDING = {
  companyName: "Arc Insights",
  logoUrl: null,
  primaryColor: "#22d3ee",
  secondaryColor: "#0a0e17",
  footerText: "Powered by Arc Insights",
  usePrimaryAsTheme: true,
};

const EMAIL_TEMPLATES: Array<{
  type:
    | "WELCOME"
    | "PASSWORD_RESET"
    | "PASSWORD_CHANGED"
    | "REPORT_DELIVERED"
    | "SCHEDULED_REPORT_FAILED";
  subject: string;
  htmlBody: string;
}> = [
  {
    type: "WELCOME",
    subject: "Welcome to {{companyName}}",
    htmlBody:
      `<div style="font-family: Arial, sans-serif; max-width: 600px;">` +
      `{{#if logoUrl}}<img src="{{logoUrl}}" alt="{{companyName}}" style="max-height:48px;margin-bottom:16px;" />{{/if}}` +
      `<h2 style="color: {{primaryColor}};">Welcome to {{companyName}}</h2>` +
      `<p>Your account is ready. Sign in with these credentials and change your password on first login:</p>` +
      `<div style="background:#f4f4f5;padding:16px;border-radius:8px;margin:16px 0;">` +
      `<p style="margin:4px 0;"><strong>Email:</strong> {{email}}</p>` +
      `<p style="margin:4px 0;"><strong>Temporary password:</strong> {{tempPassword}}</p></div>` +
      `<p>{{footerText}}</p></div>`,
  },
  {
    type: "PASSWORD_RESET",
    subject: "Reset your {{companyName}} password",
    htmlBody:
      `<div style="font-family: Arial, sans-serif; max-width: 600px;">` +
      `<h2 style="color: {{primaryColor}};">Password reset</h2>` +
      `<p>Click the link below to set a new password. The link expires in {{expiryHours}} hours.</p>` +
      `<p><a href="{{resetUrl}}" style="background: {{primaryColor}}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset password</a></p>` +
      `<p style="color:#666;font-size:12px;">If you didn't request this, ignore this email.</p>` +
      `<p>{{footerText}}</p></div>`,
  },
  {
    type: "PASSWORD_CHANGED",
    subject: "Your {{companyName}} password was changed",
    htmlBody:
      `<div style="font-family: Arial, sans-serif; max-width: 600px;">` +
      `<h2 style="color: {{primaryColor}};">Password changed</h2>` +
      `<p>Your password was updated on {{changedAt}}. If this wasn't you, contact your administrator.</p>` +
      `<p>{{footerText}}</p></div>`,
  },
  {
    type: "REPORT_DELIVERED",
    subject: "Your {{companyName}} report — {{reportName}}",
    htmlBody:
      `<div style="font-family: Arial, sans-serif; max-width: 640px;">` +
      `{{#if logoUrl}}<img src="{{logoUrl}}" alt="{{companyName}}" style="max-height:48px;margin-bottom:16px;" />{{/if}}` +
      `<h2 style="color: {{primaryColor}};">{{reportName}}</h2>` +
      `<p>{{periodLabel}} · generated at {{generatedAt}}</p>` +
      `{{#if summary}}<div style="background:#f4f4f5;padding:16px;border-radius:8px;margin:16px 0;">{{summary}}</div>{{/if}}` +
      `<p><a href="{{reportUrl}}">Open in Arc</a> · PDF and CSV are attached.</p>` +
      `<p>{{footerText}}</p></div>`,
  },
  {
    type: "SCHEDULED_REPORT_FAILED",
    subject: "[Action needed] {{companyName}} report failed — {{reportName}}",
    htmlBody:
      `<div style="font-family: Arial, sans-serif; max-width: 640px;">` +
      `<h2 style="color:#dc2626;">Scheduled report failed</h2>` +
      `<p><strong>{{reportName}}</strong> didn't generate at {{scheduledAt}}.</p>` +
      `<p style="background:#fef2f2;padding:12px;border-radius:6px;font-family:monospace;font-size:12px;">{{errorMessage}}</p>` +
      `<p><a href="{{reportUrl}}">Open the report in Arc</a> to retry or adjust the schedule.</p>` +
      `<p>{{footerText}}</p></div>`,
  },
];

// ─────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────

async function main() {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL is required.");
    process.exit(1);
  }

  const adminEmail = process.env["SUPER_ADMIN_EMAIL"] || "admin@arc.local";
  const explicitPassword = process.env["SUPER_ADMIN_PASSWORD"];
  const password = explicitPassword || randomPassword(24);
  const passwordIsRandom = !explicitPassword;

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // ── 1. SYSTEM tenant ────────────────────────────────────────
    await ensureSystemTenant(client);

    // ── 2. Permissions, Modules, ModulePermissions ──────────────
    const permissionIds = await seedPermissions(client);
    const moduleIds = await seedModules(client);
    await seedModulePermissions(client, moduleIds, permissionIds);

    // ── 3. SUPER_ADMIN + TENANT_ADMIN roles ─────────────────────
    const superAdminRoleId = await ensureRole(
      client,
      SYSTEM_TENANT_ID,
      "SUPER_ADMIN",
      "Platform-level super administrator",
    );
    await ensureRole(
      client,
      SYSTEM_TENANT_ID,
      "TENANT_ADMIN",
      "Tenant administrator (template — copied per tenant)",
    );

    // ── 4. Super Admin user ─────────────────────────────────────
    const { userId, created: userWasCreated } = await ensureSuperAdminUser(
      client,
      SYSTEM_TENANT_ID,
      adminEmail,
      password,
    );
    await ensureUserRoleAssignment(client, userId, superAdminRoleId);

    // ── 5. Features + Plans + PlanFeatureQuota ──────────────────
    const featureIds = await seedFeatures(client);
    const planIds = await seedPlans(client);
    await seedPlanFeatureQuota(client, planIds, featureIds);

    // ── 6. Default branding + email templates (tenantId=0) ──────
    await seedDefaultBranding(client, SYSTEM_TENANT_ID);
    await seedDefaultEmailTemplates(client, SYSTEM_TENANT_ID);

    await client.query("COMMIT");
    console.log("\n✓ arc-copilot seed complete.\n");

    // ── Print credentials banner ────────────────────────────────
    // Only on first creation AND only when no explicit env override —
    // re-runs against an existing super admin must NOT print a fake
    // password the operator might mistake for the real one.
    if (userWasCreated && passwordIsRandom) {
      const banner = "═".repeat(64);
      console.log(banner);
      console.log("  SUPER ADMIN CREDENTIALS — printed once, save them now");
      console.log(banner);
      console.log(`  Email:    ${adminEmail}`);
      console.log(`  Password: ${password}`);
      console.log(banner);
      console.log("  Store in your password manager. This script will NOT");
      console.log("  print the password again on subsequent runs.");
      console.log(banner);
      console.log("");
    } else if (!userWasCreated) {
      console.log(
        "  (super admin already existed — credentials unchanged, no banner printed)\n",
      );
    }
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────

async function ensureSystemTenant(client: PoolClient): Promise<void> {
  const existing = await client.query(
    `SELECT "ID" FROM "TENANTS" WHERE "ID" = $1`,
    [SYSTEM_TENANT_ID],
  );
  if (existing.rows.length > 0) {
    log(`tenant`, `system tenant exists (ID=${SYSTEM_TENANT_ID})`);
    return;
  }
  await client.query(
    `INSERT INTO "TENANTS"
       ("ID", "PLAN_ID", "QUOTA_TYPE", "MAX_USERS", "BILLING_CYCLE",
        "CYCLE_START_DATE", "TENANT_NAME", "DOMAIN", "STATUS",
        "CREATED_AT", "UPDATED_AT")
     VALUES ($1, 'SYSTEM', 'SHARED', NULL, NULL, NULL, 'System',
             'arc.local', 'ACTIVE', NOW(), NOW())`,
    [SYSTEM_TENANT_ID],
  );
  log(`tenant`, `created system tenant ID=${SYSTEM_TENANT_ID}`);
}

async function seedPermissions(
  client: PoolClient,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const p of PERMISSIONS) {
    const r = await client.query(
      `INSERT INTO "PERMISSION_MASTER"
         ("PERMISSION_KEY", "PERMISSION_NAME", "DESCRIPTION", "STATUS",
          "CREATED_AT", "UPDATED_AT")
       VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
       ON CONFLICT ("PERMISSION_KEY") DO UPDATE
         SET "PERMISSION_NAME" = EXCLUDED."PERMISSION_NAME",
             "DESCRIPTION"    = EXCLUDED."DESCRIPTION",
             "UPDATED_AT"     = NOW()
       RETURNING "ID"`,
      [p.permissionKey, p.permissionName, p.description],
    );
    out.set(p.permissionKey, r.rows[0].ID);
  }
  log(`permissions`, `${out.size} upserted`);
  return out;
}

async function seedModules(
  client: PoolClient,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const m of MODULES) {
    const r = await client.query(
      `INSERT INTO "MODULE_MASTER"
         ("MODULE_KEY", "MODULE_NAME", "DESCRIPTION", "DEPENDS_ON",
          "STATUS", "CREATED_AT", "UPDATED_AT")
       VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW())
       ON CONFLICT ("MODULE_KEY") DO UPDATE
         SET "MODULE_NAME" = EXCLUDED."MODULE_NAME",
             "DESCRIPTION" = EXCLUDED."DESCRIPTION",
             "DEPENDS_ON"  = EXCLUDED."DEPENDS_ON",
             "UPDATED_AT"  = NOW()
       RETURNING "ID"`,
      [m.moduleKey, m.moduleName, m.description, m.dependsOn],
    );
    out.set(m.moduleKey, r.rows[0].ID);
  }
  log(`modules`, `${out.size} upserted`);
  return out;
}

async function seedModulePermissions(
  client: PoolClient,
  moduleIds: Map<string, number>,
  permissionIds: Map<string, number>,
): Promise<void> {
  let count = 0;
  for (const [moduleKey, perms] of Object.entries(MODULE_PERMISSIONS)) {
    const moduleId = moduleIds.get(moduleKey);
    if (!moduleId) continue;
    for (const permKey of perms) {
      const permissionId = permissionIds.get(permKey);
      if (!permissionId) continue;
      await client.query(
        `INSERT INTO "MODULE_PERMISSIONS"
           ("MODULE_ID", "PERMISSION_ID", "STATUS")
         VALUES ($1, $2, 'ACTIVE')
         ON CONFLICT ("MODULE_ID", "PERMISSION_ID") DO UPDATE
           SET "STATUS" = 'ACTIVE'`,
        [moduleId, permissionId],
      );
      count++;
    }
  }
  log(`module-permissions`, `${count} upserted`);
}

async function ensureRole(
  client: PoolClient,
  tenantId: number,
  roleName: string,
  description: string,
): Promise<number> {
  const existing = await client.query(
    `SELECT "ID" FROM "ROLES" WHERE "TENANT_ID" = $1 AND "ROLE_NAME" = $2`,
    [tenantId, roleName],
  );
  if (existing.rows.length > 0) {
    log(`role`, `${roleName} exists (ID=${existing.rows[0].ID})`);
    return existing.rows[0].ID;
  }
  const r = await client.query(
    `INSERT INTO "ROLES"
       ("TENANT_ID", "ROLE_NAME", "DESCRIPTION", "STATUS",
        "CREATED_AT", "UPDATED_AT")
     VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
     RETURNING "ID"`,
    [tenantId, roleName, description],
  );
  log(`role`, `created ${roleName} ID=${r.rows[0].ID}`);
  return r.rows[0].ID;
}

async function ensureSuperAdminUser(
  client: PoolClient,
  tenantId: number,
  email: string,
  password: string,
): Promise<{ userId: number; created: boolean }> {
  const existing = await client.query(
    `SELECT "ID" FROM "USERS" WHERE "TENANT_ID" = $1 AND "EMAIL" = $2`,
    [tenantId, email],
  );
  if (existing.rows.length > 0) {
    log(`user`, `super admin exists (ID=${existing.rows[0].ID}) — password unchanged`);
    return { userId: existing.rows[0].ID, created: false };
  }
  const insert = await client.query(
    `INSERT INTO "USERS"
       ("TENANT_ID", "EMAIL", "FIRST_NAME", "LAST_NAME", "STATUS",
        "CREATED_AT", "UPDATED_AT")
     VALUES ($1, $2, 'Super', 'Admin', 'ACTIVE', NOW(), NOW())
     RETURNING "ID"`,
    [tenantId, email],
  );
  const userId = insert.rows[0].ID;

  const hash = await bcrypt.hash(password, 10);
  await client.query(
    `INSERT INTO "USER_CREDENTIALS"
       ("USER_ID", "TENANT_ID", "AUTH_TYPE", "PASSWORD_HASH", "STATUS",
        "CREATED_AT", "UPDATED_AT")
     VALUES ($1, $2, 'PASSWORD', $3, 'ACTIVE', NOW(), NOW())`,
    [userId, tenantId, hash],
  );
  log(`user`, `created super admin ID=${userId} email=${email}`);
  return { userId, created: true };
}

async function ensureUserRoleAssignment(
  client: PoolClient,
  userId: number,
  roleId: number,
): Promise<void> {
  await client.query(
    `INSERT INTO "USER_ROLES" ("USER_ID", "ROLE_ID")
     VALUES ($1, $2)
     ON CONFLICT ("USER_ID", "ROLE_ID") DO NOTHING`,
    [userId, roleId],
  );
  log(`user-role`, `${userId} ↔ ${roleId} assigned`);
}

async function seedFeatures(
  client: PoolClient,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const f of FEATURES) {
    const r = await client.query(
      `INSERT INTO "FEATURE_REGISTRY"
         ("FEATURE_KEY", "FEATURE_NAME", "DESCRIPTION", "CATEGORY",
          "VALUE_TYPE", "DEPENDS_ON", "STATUS", "CREATED_AT", "UPDATED_AT")
       VALUES ($1, $2, $3, $4, $5, $6, 'ACTIVE', NOW(), NOW())
       ON CONFLICT ("FEATURE_KEY") DO UPDATE
         SET "FEATURE_NAME" = EXCLUDED."FEATURE_NAME",
             "DESCRIPTION"  = EXCLUDED."DESCRIPTION",
             "CATEGORY"     = EXCLUDED."CATEGORY",
             "VALUE_TYPE"   = EXCLUDED."VALUE_TYPE",
             "DEPENDS_ON"   = EXCLUDED."DEPENDS_ON",
             "UPDATED_AT"   = NOW()
       RETURNING "ID"`,
      [f.featureKey, f.featureName, f.description, f.category, f.valueType, f.dependsOn],
    );
    out.set(f.featureKey, r.rows[0].ID);
  }
  log(`features`, `${out.size} upserted`);
  return out;
}

async function seedPlans(
  client: PoolClient,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  for (const p of PLANS) {
    const r = await client.query(
      `INSERT INTO "PLAN"
         ("PLAN_NAME", "DESCRIPTION", "STATUS", "CREATED_AT", "UPDATED_AT")
       VALUES ($1, $2, 'ACTIVE', NOW(), NOW())
       ON CONFLICT ("PLAN_NAME") DO UPDATE
         SET "DESCRIPTION" = EXCLUDED."DESCRIPTION",
             "UPDATED_AT"  = NOW()
       RETURNING "ID"`,
      [p.planName, p.description],
    );
    out.set(p.planName, r.rows[0].ID);
  }
  log(`plans`, `${out.size} upserted`);
  return out;
}

async function seedPlanFeatureQuota(
  client: PoolClient,
  planIds: Map<string, number>,
  featureIds: Map<string, number>,
): Promise<void> {
  let count = 0;
  for (const [planName, planId] of planIds) {
    const enabled = PLAN_FEATURE_MATRIX[planName] ?? new Set();
    for (const [featureKey, featureId] of featureIds) {
      const isEnabled = enabled.has(featureKey);
      await client.query(
        `INSERT INTO "PLAN_FEATURE_QUOTA"
           ("PLAN_ID", "FEATURE_ID", "QUOTA_LIMIT", "IS_ENABLED",
            "CREATED_AT", "UPDATED_AT")
         VALUES ($1, $2, NULL, $3, NOW(), NOW())
         ON CONFLICT ("PLAN_ID", "FEATURE_ID") DO UPDATE
           SET "QUOTA_LIMIT" = NULL,
               "IS_ENABLED"  = EXCLUDED."IS_ENABLED",
               "UPDATED_AT"  = NOW()`,
        [planId, featureId, isEnabled],
      );
      count++;
    }
  }
  log(`plan-feature-quota`, `${count} rows upserted (always quotaLimit=null on-prem)`);
}

async function seedDefaultBranding(
  client: PoolClient,
  tenantId: number,
): Promise<void> {
  await client.query(
    `INSERT INTO "TENANT_BRANDINGS"
       ("TENANT_ID", "COMPANY_NAME", "LOGO_URL", "PRIMARY_COLOR",
        "SECONDARY_COLOR", "FOOTER_TEXT", "USE_PRIMARY_AS_THEME",
        "CREATED_AT", "UPDATED_AT")
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
     ON CONFLICT ("TENANT_ID") DO UPDATE
       SET "COMPANY_NAME"         = EXCLUDED."COMPANY_NAME",
           "LOGO_URL"             = EXCLUDED."LOGO_URL",
           "PRIMARY_COLOR"        = EXCLUDED."PRIMARY_COLOR",
           "SECONDARY_COLOR"      = EXCLUDED."SECONDARY_COLOR",
           "FOOTER_TEXT"          = EXCLUDED."FOOTER_TEXT",
           "USE_PRIMARY_AS_THEME" = EXCLUDED."USE_PRIMARY_AS_THEME",
           "UPDATED_AT"           = NOW()`,
    [
      tenantId,
      ARC_BRANDING.companyName,
      ARC_BRANDING.logoUrl,
      ARC_BRANDING.primaryColor,
      ARC_BRANDING.secondaryColor,
      ARC_BRANDING.footerText,
      ARC_BRANDING.usePrimaryAsTheme,
    ],
  );
  log(`branding`, `default for tenantId=${tenantId} upserted`);
}

async function seedDefaultEmailTemplates(
  client: PoolClient,
  tenantId: number,
): Promise<void> {
  for (const t of EMAIL_TEMPLATES) {
    await client.query(
      `INSERT INTO "EMAIL_TEMPLATES"
         ("TENANT_ID", "TYPE", "SUBJECT", "HTML_BODY", "IS_ACTIVE",
          "CREATED_AT", "UPDATED_AT")
       VALUES ($1, $2::"NOTIFICATION_TYPE", $3, $4, true, NOW(), NOW())
       ON CONFLICT ("TENANT_ID", "TYPE") DO UPDATE
         SET "SUBJECT"    = EXCLUDED."SUBJECT",
             "HTML_BODY"  = EXCLUDED."HTML_BODY",
             "IS_ACTIVE"  = true,
             "UPDATED_AT" = NOW()`,
      [tenantId, t.type, t.subject, t.htmlBody],
    );
  }
  log(`email-templates`, `${EMAIL_TEMPLATES.length} upserted for tenantId=${tenantId}`);
}

function randomPassword(length: number): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*";
  const bytes = crypto.randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

function log(scope: string, message: string): void {
  console.log(`[${scope.padEnd(20)}] ${message}`);
}

main().catch((err) => {
  console.error("\n✗ seed failed:", err);
  process.exit(1);
});
