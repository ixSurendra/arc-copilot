/**
 * Seed script — creates the default Tenant, Admin, and imports the license
 * record for on-prem deployments.
 *
 * This script is meant for on-prem (customer) environments only.
 * It creates:
 *   1. A default tenant with explicit ID (from TENANT_ID env)
 *   2. A TENANT_ADMIN role for that tenant
 *   3. A default admin user
 *   4. Assigns the TENANT_ADMIN role to the user
 *   5. Creates password credentials for the user
 *   6. Imports license.lic into DB (FEATURE_REGISTRY, PLAN, PLAN_FEATURE_QUOTA, TENANT_LICENSE)
 *   7. Seeds default branding (global default + tenant-specific)
 *   8. Seeds default email templates (global defaults for tenantId=0)
 *
 * Usage (on the customer's machine):
 *   DATABASE_URL=postgresql://postgres:<password>@localhost:5432/ix_db node seed-onprem-admin.js
 *
 * Environment variables:
 *   DATABASE_URL          — PostgreSQL connection string (required)
 *   TENANT_ID             — Explicit tenant ID, must match license file (default: 1)
 *   TENANT_NAME           — Name of the tenant org (default: My Organization)
 *   TENANT_DOMAIN         — Domain for the tenant (default: onprem.local)
 *   ADMIN_EMAIL           — Admin user email (default: admin@onprem.local)
 *   ADMIN_PASSWORD        — Admin user password (default: ChangeMe123!)
 *   ADMIN_FIRST_NAME      — Admin first name (default: Admin)
 *   ADMIN_LAST_NAME       — Admin last name (default: User)
 *   LICENSE_FILE_PATH     — Path to license.lic (default: /opt/ix-copilot/license/license.lic)
 */

import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import * as fs from 'fs';

// ── Interfaces ────────────────────────────────────────────────

interface LicenseFeatureEntry {
  featureKey: string;
  featureName: string;
  quotaLimit: number | null;
}

interface LicensePayload {
  tenantId: number;
  planId?: number;
  startDate: string;
  issuedAt: string;
  expiresAt: string;
  cycle: string;
  maxUsers?: number | null;
  features: LicenseFeatureEntry[];
}

interface LicenseFile {
  payload: LicensePayload;
  signature: string;
}

interface SeedConfig {
  databaseUrl: string;
  tenantId: number;
  tenantName: string;
  tenantDomain: string;
  adminEmail: string;
  adminPassword: string;
  adminFirstName: string;
  adminLastName: string;
  licenseFilePath: string;
}

// ── Config ────────────────────────────────────────────────────

function getConfig(): SeedConfig {
  const databaseUrl = process.env['DATABASE_URL'];
  if (!databaseUrl) {
    console.error('ERROR: DATABASE_URL environment variable is required.');
    process.exit(1);
  }

  return {
    databaseUrl,
    tenantId: parseInt(process.env['TENANT_ID'] || '1', 10),
    tenantName: process.env['TENANT_NAME'] || 'My Organization',
    tenantDomain: process.env['TENANT_DOMAIN'] || 'onprem.local',
    adminEmail: process.env['ADMIN_EMAIL'] || 'admin@onprem.local',
    adminPassword: process.env['ADMIN_PASSWORD'] || 'ChangeMe123!',
    adminFirstName: process.env['ADMIN_FIRST_NAME'] || 'Admin',
    adminLastName: process.env['ADMIN_LAST_NAME'] || 'User',
    licenseFilePath:
      process.env['LICENSE_FILE_PATH'] ||
      '/opt/ix-copilot/license/license.lic',
  };
}

// ── Helpers ───────────────────────────────────────────────────

function readLicenseFile(filePath: string): LicenseFile | null {
  if (!fs.existsSync(filePath)) {
    console.log(`[warn]    License file not found at ${filePath} — skipping license import`);
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const license = JSON.parse(raw) as LicenseFile;
    if (!license.payload || !license.signature) {
      console.log('[warn]    License file is malformed — skipping license import');
      return null;
    }
    return license;
  } catch {
    console.log('[warn]    Failed to read/parse license file — skipping license import');
    return null;
  }
}

// ── Main ──────────────────────────────────────────────────────

async function main() {
  const config = getConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });

  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('  ix-copilot — On-Prem Admin Seed');
    console.log('═══════════════════════════════════════════════════\n');

    // ── 1. Create default tenant with explicit ID ────────────────
    const tenantId = config.tenantId;

    const tenantExists = await pool.query(
      `SELECT "ID" FROM "TENANTS" WHERE "ID" = $1`,
      [tenantId],
    );

    if (tenantExists.rows.length > 0) {
      console.log(`[skip]    Tenant already exists: "${config.tenantName}" (ID=${tenantId})`);
    } else {
      await pool.query(
        `INSERT INTO "TENANTS" ("ID", "PLAN_ID", "QUOTA_TYPE", "BILLING_CYCLE", "CYCLE_START_DATE", "TENANT_NAME", "DOMAIN", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, 'ON_PREM', 'SHARED', 'ANNUALLY', CURRENT_DATE, $2, $3, 'ACTIVE', NOW(), NOW())`,
        [tenantId, config.tenantName, config.tenantDomain],
      );
      // Reset sequence to avoid conflicts with future auto-generated IDs
      await pool.query(
        `SELECT setval(pg_get_serial_sequence('"TENANTS"', 'ID'), GREATEST((SELECT MAX("ID") FROM "TENANTS"), $1))`,
        [tenantId],
      );
      console.log(`[created] Tenant: "${config.tenantName}" (ID=${tenantId})`);
    }

    // ── 2. Create TENANT_ADMIN role ──────────────────────────────
    const roleExists = await pool.query(
      `SELECT "ID" FROM "ROLES" WHERE "TENANT_ID" = $1 AND "ROLE_NAME" = 'TENANT_ADMIN'`,
      [tenantId],
    );

    let roleId: number;
    if (roleExists.rows.length > 0) {
      roleId = roleExists.rows[0].ID;
      console.log(`[skip]    TENANT_ADMIN role already exists (ID=${roleId})`);
    } else {
      const roleResult = await pool.query(
        `INSERT INTO "ROLES" ("TENANT_ID", "ROLE_NAME", "DESCRIPTION", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, 'TENANT_ADMIN', 'Tenant administrator with full access', 'ACTIVE', NOW(), NOW())
         RETURNING "ID"`,
        [tenantId],
      );
      roleId = roleResult.rows[0].ID;
      console.log(`[created] TENANT_ADMIN role (ID=${roleId})`);
    }

    // ── 3. Create admin user ─────────────────────────────────────
    const userExists = await pool.query(
      `SELECT "ID" FROM "USERS" WHERE "TENANT_ID" = $1 AND "EMAIL" = $2`,
      [tenantId, config.adminEmail],
    );

    let userId: number;
    if (userExists.rows.length > 0) {
      userId = userExists.rows[0].ID;
      console.log(`[skip]    Admin user already exists (ID=${userId})`);
    } else {
      const userResult = await pool.query(
        `INSERT INTO "USERS" ("TENANT_ID", "EMAIL", "FIRST_NAME", "LAST_NAME", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, $2, $3, $4, 'ACTIVE', NOW(), NOW())
         RETURNING "ID"`,
        [tenantId, config.adminEmail, config.adminFirstName, config.adminLastName],
      );
      userId = userResult.rows[0].ID;
      console.log(`[created] Admin user: ${config.adminEmail} (ID=${userId})`);
    }

    // ── 4. Assign TENANT_ADMIN role to user ──────────────────────
    const roleAssignment = await pool.query(
      `SELECT "USER_ID" FROM "USER_ROLES" WHERE "USER_ID" = $1 AND "ROLE_ID" = $2`,
      [userId, roleId],
    );

    if (roleAssignment.rows.length > 0) {
      console.log(`[skip]    TENANT_ADMIN role already assigned`);
    } else {
      await pool.query(
        `INSERT INTO "USER_ROLES" ("USER_ID", "ROLE_ID") VALUES ($1, $2)`,
        [userId, roleId],
      );
      console.log(`[created] Assigned TENANT_ADMIN role to user`);
    }

    // ── 5. Create password credentials ───────────────────────────
    const credExists = await pool.query(
      `SELECT "ID" FROM "USER_CREDENTIALS" WHERE "USER_ID" = $1`,
      [userId],
    );

    if (credExists.rows.length > 0) {
      console.log(`[skip]    Credentials already exist`);
    } else {
      const passwordHash = await bcrypt.hash(config.adminPassword, 12);
      await pool.query(
        `INSERT INTO "USER_CREDENTIALS" ("USER_ID", "TENANT_ID", "AUTH_TYPE", "PASSWORD_HASH", "STATUS", "CREATED_AT", "UPDATED_AT")
         VALUES ($1, $2, 'PASSWORD', $3, 'ACTIVE', NOW(), NOW())`,
        [userId, tenantId, passwordHash],
      );
      console.log(`[created] Password credentials`);
    }

    // ── 6. Import license.lic into on-prem DB ────────────────────
    const license = readLicenseFile(config.licenseFilePath);

    if (license) {
      console.log('\n── License Import ──────────────────────────────\n');

      const { payload, signature } = license;

      // 6a. Seed FEATURE_REGISTRY from license features
      const featureIds: Record<string, number> = {};

      for (const feat of payload.features) {
        const existing = await pool.query(
          `SELECT "ID" FROM "FEATURE_REGISTRY" WHERE "FEATURE_KEY" = $1`,
          [feat.featureKey],
        );

        if (existing.rows.length > 0) {
          featureIds[feat.featureKey] = existing.rows[0].ID;
          console.log(`[skip]    Feature: ${feat.featureKey} (ID=${existing.rows[0].ID})`);
        } else {
          const result = await pool.query(
            `INSERT INTO "FEATURE_REGISTRY" ("FEATURE_KEY", "FEATURE_NAME", "DESCRIPTION", "STATUS", "CREATED_AT", "UPDATED_AT")
             VALUES ($1, $2, $3, 'ACTIVE', NOW(), NOW())
             RETURNING "ID"`,
            [feat.featureKey, feat.featureName, `${feat.featureName} feature`],
          );
          featureIds[feat.featureKey] = result.rows[0].ID;
          console.log(`[created] Feature: ${feat.featureKey} (ID=${result.rows[0].ID})`);
        }
      }

      // 6b. Seed ON_PREM plan
      const planExists = await pool.query(
        `SELECT "ID" FROM "PLAN" WHERE "PLAN_NAME" = 'ON_PREM'`,
      );

      let planId: number;
      if (planExists.rows.length > 0) {
        planId = planExists.rows[0].ID;
        console.log(`[skip]    ON_PREM plan (ID=${planId})`);
      } else {
        const planResult = await pool.query(
          `INSERT INTO "PLAN" ("PLAN_NAME", "DESCRIPTION", "STATUS", "CREATED_AT", "UPDATED_AT")
           VALUES ('ON_PREM', 'On-premise deployment plan', 'ACTIVE', NOW(), NOW())
           RETURNING "ID"`,
        );
        planId = planResult.rows[0].ID;
        console.log(`[created] ON_PREM plan (ID=${planId})`);
      }

      // 6c. Link features to plan via PLAN_FEATURE_QUOTA
      for (const feat of payload.features) {
        const featureId = featureIds[feat.featureKey];
        const quotaExists = await pool.query(
          `SELECT "PLAN_ID" FROM "PLAN_FEATURE_QUOTA" WHERE "PLAN_ID" = $1 AND "FEATURE_ID" = $2`,
          [planId, featureId],
        );

        if (quotaExists.rows.length > 0) {
          console.log(`[skip]    Plan → ${feat.featureKey}`);
        } else {
          await pool.query(
            `INSERT INTO "PLAN_FEATURE_QUOTA" ("PLAN_ID", "FEATURE_ID", "QUOTA_LIMIT", "IS_ENABLED", "CREATED_AT", "UPDATED_AT")
             VALUES ($1, $2, $3, true, NOW(), NOW())`,
            [planId, featureId, feat.quotaLimit],
          );
          console.log(`[created] Plan → ${feat.featureKey} (quota: ${feat.quotaLimit ?? 'unlimited'})`);
        }
      }

      // 6d. Insert TENANT_LICENSE record
      const licenseExists = await pool.query(
        `SELECT "ID" FROM "TENANT_LICENSE" WHERE "TENANT_ID" = $1`,
        [tenantId],
      );

      if (licenseExists.rows.length > 0) {
        console.log(`[skip]    License record for tenant ${tenantId}`);
      } else {
        // Use planId from the license payload if available, else use the ON_PREM plan we just created
        const licensePlanId = payload.planId ?? planId;

        const signatureHash = crypto
          .createHash('sha256')
          .update(signature)
          .digest('hex');

        await pool.query(
          `INSERT INTO "TENANT_LICENSE" ("TENANT_ID", "PLAN_ID", "CYCLE", "MAX_USERS", "START_DATE", "EXPIRES_AT", "ISSUED_AT", "SIGNATURE_HASH", "LICENSE_DATA", "ISSUED_BY", "STATUS", "VERSION", "CREATED_AT", "UPDATED_AT")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, 'ACTIVE', 1, NOW(), NOW())`,
          [
            tenantId,
            licensePlanId,
            payload.cycle,
            payload.maxUsers ?? null,
            new Date(payload.startDate),
            new Date(payload.expiresAt),
            new Date(payload.issuedAt),
            signatureHash,
            JSON.stringify({ payload, signature }),
          ],
        );
        console.log(`[created] License record: tenant=${tenantId}, expires=${payload.expiresAt.split('T')[0]}`);
        console.log(`          Features: ${payload.features.map((f) => f.featureKey).join(', ')}`);
      }
    }

    // ── 7. Seed default branding ──────────────────────────────────
    console.log('\n── Branding ────────────────────────────────────────\n');

    const SYSTEM_TENANT_ID = 0;

    // 7a. Global default branding (tenantId=0)
    const globalBranding = await pool.query(
      `INSERT INTO "TENANT_BRANDINGS" (
        "TENANT_ID", "COMPANY_NAME", "PRIMARY_COLOR", "LOGO_URL",
        "SECONDARY_COLOR", "FOOTER_TEXT", "CREATED_AT", "UPDATED_AT"
      )
      VALUES ($1, $2, $3, NULL, NULL, NULL, NOW(), NOW())
      ON CONFLICT ("TENANT_ID") DO UPDATE SET
        "COMPANY_NAME"    = EXCLUDED."COMPANY_NAME",
        "PRIMARY_COLOR"   = EXCLUDED."PRIMARY_COLOR",
        "UPDATED_AT"      = NOW()
      RETURNING "ID"`,
      [SYSTEM_TENANT_ID, 'IX Platform', '#18181b'],
    );
    console.log(
      `[upsert]  Global branding: companyName="IX Platform", primaryColor="#18181b" (ID=${globalBranding.rows[0].ID})`,
    );

    // 7b. Tenant-specific branding (using TENANT_NAME from config)
    const tenantBranding = await pool.query(
      `INSERT INTO "TENANT_BRANDINGS" (
        "TENANT_ID", "COMPANY_NAME", "PRIMARY_COLOR", "LOGO_URL",
        "SECONDARY_COLOR", "FOOTER_TEXT", "CREATED_AT", "UPDATED_AT"
      )
      VALUES ($1, $2, $3, NULL, NULL, NULL, NOW(), NOW())
      ON CONFLICT ("TENANT_ID") DO UPDATE SET
        "COMPANY_NAME"    = EXCLUDED."COMPANY_NAME",
        "PRIMARY_COLOR"   = EXCLUDED."PRIMARY_COLOR",
        "UPDATED_AT"      = NOW()
      RETURNING "ID"`,
      [tenantId, config.tenantName, '#18181b'],
    );
    console.log(
      `[upsert]  Tenant branding: companyName="${config.tenantName}", tenantId=${tenantId} (ID=${tenantBranding.rows[0].ID})`,
    );

    // ── 8. Seed default email templates ─────────────────────────
    console.log('\n── Email Templates ─────────────────────────────────\n');

    const templateData: Array<{
      type: string;
      subject: string;
      htmlBody: string;
    }> = [
      {
        type: 'WELCOME',
        subject: 'Welcome to {{companyName}} — Your Account Details',
        htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 48px; margin-bottom: 16px;" />{{/if}}
  <h2 style="color: {{primaryColor}};">Welcome to {{companyName}}</h2>
  <p>Your account has been created. Use the credentials below to log in:</p>
  <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
    <p style="margin: 4px 0;"><strong>Email:</strong> {{email}}</p>
    <p style="margin: 4px 0;"><strong>Temporary Password:</strong> {{tempPassword}}</p>
  </div>
  <p>Please change your password after your first login.</p>
  <a href="{{loginUrl}}" style="display: inline-block; background: {{primaryColor}}; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin-top: 8px;">
    Log In
  </a>
  <p style="color: #71717a; font-size: 12px; margin-top: 24px;">
    If you did not expect this email, please ignore it.
  </p>
  {{#if footerText}}<p style="color: #a1a1aa; font-size: 11px; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px;">{{footerText}}</p>{{/if}}
</div>`,
      },
      {
        type: 'PASSWORD_RESET',
        subject: '{{companyName}} — Password Reset',
        htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 48px; margin-bottom: 16px;" />{{/if}}
  <h2 style="color: {{primaryColor}};">Password Reset Request</h2>
  <p>We received a request to reset your password. Click the button below to set a new password:</p>
  <a href="{{resetUrl}}" style="display: inline-block; background: {{primaryColor}}; color: #fff; padding: 10px 24px; border-radius: 6px; text-decoration: none; margin: 16px 0;">
    Reset Password
  </a>
  <p style="color: #71717a; font-size: 13px;">
    This link expires in 1 hour. If you did not request a password reset, please ignore this email.
  </p>
  {{#if footerText}}<p style="color: #a1a1aa; font-size: 11px; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px;">{{footerText}}</p>{{/if}}
</div>`,
      },
      {
        type: 'PASSWORD_CHANGED',
        subject: '{{companyName}} — Password Changed',
        htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  {{#if logoUrl}}<img src="{{logoUrl}}" alt="{{companyName}}" style="max-height: 48px; margin-bottom: 16px;" />{{/if}}
  <h2 style="color: {{primaryColor}};">Password Changed Successfully</h2>
  <p>Hi{{#if userName}} {{userName}}{{/if}},</p>
  <p>Your password has been changed successfully. If you did not make this change, please contact your administrator immediately.</p>
  <p style="color: #71717a; font-size: 13px; margin-top: 24px;">
    This is an automated notification. No action is required if you made this change.
  </p>
  {{#if footerText}}<p style="color: #a1a1aa; font-size: 11px; margin-top: 32px; border-top: 1px solid #e4e4e7; padding-top: 16px;">{{footerText}}</p>{{/if}}
</div>`,
      },
    ];

    for (const tmpl of templateData) {
      const result = await pool.query(
        `INSERT INTO "EMAIL_TEMPLATES" (
          "TENANT_ID", "TYPE", "SUBJECT", "HTML_BODY", "IS_ACTIVE",
          "CREATED_AT", "UPDATED_AT"
        )
        VALUES ($1, $2::"NOTIFICATION_TYPE", $3, $4, true, NOW(), NOW())
        ON CONFLICT ("TENANT_ID", "TYPE") DO UPDATE SET
          "SUBJECT"    = EXCLUDED."SUBJECT",
          "HTML_BODY"  = EXCLUDED."HTML_BODY",
          "IS_ACTIVE"  = true,
          "UPDATED_AT" = NOW()
        RETURNING "ID"`,
        [SYSTEM_TENANT_ID, tmpl.type, tmpl.subject, tmpl.htmlBody],
      );
      console.log(`[upsert]  Template: ${tmpl.type} (ID=${result.rows[0].ID})`);
    }

    // ── Summary ──────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Seed completed successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\n  Tenant:    ${config.tenantName} (ID=${tenantId})`);
    console.log(`  Domain:    ${config.tenantDomain}`);
    console.log(`  Email:     ${config.adminEmail}`);
    console.log(`  Password:  ${config.adminPassword}`);
    if (license) {
      console.log(`  License:   Imported (expires ${license.payload.expiresAt.split('T')[0]})`);
      console.log(`  Features:  ${license.payload.features.map((f) => f.featureKey).join(', ')}`);
    }
    console.log(`  Branding:  Global default + tenant-specific ("${config.tenantName}")`);
    console.log(`  Templates: WELCOME, PASSWORD_RESET, PASSWORD_CHANGED (global defaults)`);
    console.log(`\n  Login via: POST /auth/login`);
    console.log(`    { "email": "${config.adminEmail}", "password": "${config.adminPassword}", "tenantId": ${tenantId} }`);
    console.log('\n  ⚠ Change the password after first login!\n');

  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
