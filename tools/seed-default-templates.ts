/**
 * Seed script — seeds default branding and email templates for the
 * global system tenant (tenantId=0) in the tenant-service database.
 *
 * This script is suitable for cloud (SaaS) deployments. For on-prem
 * deployments, the seed-onprem-admin.ts script handles this as part
 * of its own seed flow (Steps 7-8).
 *
 * It creates:
 *   1. A global default TenantBranding row (tenantId=0)
 *   2. Three global default EmailTemplate rows (tenantId=0):
 *      - WELCOME
 *      - PASSWORD_RESET
 *      - PASSWORD_CHANGED
 *
 * All inserts use ON CONFLICT ... DO UPDATE (upsert) so the script
 * is fully idempotent — safe to run multiple times.
 *
 * Usage:
 *   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ix_db npx tsx tools/seed-default-templates.ts
 *
 * Environment variables:
 *   DATABASE_URL          — PostgreSQL connection string (required)
 *                            Also accepts TENANT_DATABASE_URL as an alias
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load .env from workspace root if present
dotenv.config();

// ── Default templates (duplicated here to keep the script standalone) ──
// These match libs/shared/src/lib/mail/default-templates.ts exactly.

interface DefaultTemplate {
  subject: string;
  htmlBody: string;
}

const DEFAULT_WELCOME_TEMPLATE: DefaultTemplate = {
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
};

const DEFAULT_PASSWORD_RESET_TEMPLATE: DefaultTemplate = {
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
};

const DEFAULT_PASSWORD_CHANGED_TEMPLATE: DefaultTemplate = {
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
};

const DEFAULT_TEMPLATES: Record<string, DefaultTemplate> = {
  WELCOME: DEFAULT_WELCOME_TEMPLATE,
  PASSWORD_RESET: DEFAULT_PASSWORD_RESET_TEMPLATE,
  PASSWORD_CHANGED: DEFAULT_PASSWORD_CHANGED_TEMPLATE,
};

// ── Constants ────────────────────────────────────────────────────

const SYSTEM_TENANT_ID = 0;

const DEFAULT_BRANDING = {
  companyName: 'IX Platform',
  primaryColor: '#18181b',
  logoUrl: null as string | null,
  secondaryColor: null as string | null,
  footerText: null as string | null,
};

// ── Config ───────────────────────────────────────────────────────

function getDatabaseUrl(): string {
  const url =
    process.env['DATABASE_URL'] ||
    process.env['TENANT_DATABASE_URL'];

  if (!url) {
    console.error(
      'ERROR: DATABASE_URL (or TENANT_DATABASE_URL) environment variable is required.',
    );
    process.exit(1);
  }
  return url;
}

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const databaseUrl = getDatabaseUrl();
  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log('═══════════════════════════════════════════════════');
    console.log('  ix-copilot — Seed Default Templates & Branding');
    console.log('═══════════════════════════════════════════════════\n');

    // ── 1. Seed global default branding (tenantId=0) ────────────
    console.log('── Step 1: Seed global default branding ───────────\n');

    const brandingResult = await pool.query(
      `INSERT INTO "TENANT_BRANDINGS" (
        "TENANT_ID", "COMPANY_NAME", "PRIMARY_COLOR", "LOGO_URL",
        "SECONDARY_COLOR", "FOOTER_TEXT", "CREATED_AT", "UPDATED_AT"
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT ("TENANT_ID") DO UPDATE SET
        "COMPANY_NAME"    = EXCLUDED."COMPANY_NAME",
        "PRIMARY_COLOR"   = EXCLUDED."PRIMARY_COLOR",
        "LOGO_URL"        = EXCLUDED."LOGO_URL",
        "SECONDARY_COLOR" = EXCLUDED."SECONDARY_COLOR",
        "FOOTER_TEXT"     = EXCLUDED."FOOTER_TEXT",
        "UPDATED_AT"      = NOW()
      RETURNING "ID"`,
      [
        SYSTEM_TENANT_ID,
        DEFAULT_BRANDING.companyName,
        DEFAULT_BRANDING.primaryColor,
        DEFAULT_BRANDING.logoUrl,
        DEFAULT_BRANDING.secondaryColor,
        DEFAULT_BRANDING.footerText,
      ],
    );
    console.log(
      `[upsert]  Global branding: companyName="${DEFAULT_BRANDING.companyName}", ` +
        `primaryColor="${DEFAULT_BRANDING.primaryColor}" (ID=${brandingResult.rows[0].ID})`,
    );

    // ── 2. Seed global default email templates (tenantId=0) ─────
    console.log('\n── Step 2: Seed global default email templates ────\n');

    for (const [type, template] of Object.entries(DEFAULT_TEMPLATES)) {
      const templateResult = await pool.query(
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
        [SYSTEM_TENANT_ID, type, template.subject, template.htmlBody],
      );
      console.log(
        `[upsert]  Template: ${type} (ID=${templateResult.rows[0].ID})`,
      );
    }

    // ── Summary ──────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════════════════');
    console.log('  Seed completed successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log(`\n  Global branding (tenantId=${SYSTEM_TENANT_ID}):`);
    console.log(`    companyName:  ${DEFAULT_BRANDING.companyName}`);
    console.log(`    primaryColor: ${DEFAULT_BRANDING.primaryColor}`);
    console.log(`\n  Email templates (tenantId=${SYSTEM_TENANT_ID}):`);
    for (const type of Object.keys(DEFAULT_TEMPLATES)) {
      console.log(`    - ${type}`);
    }
    console.log(
      '\n  Tenants without custom branding/templates will fall back to these defaults.\n',
    );
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
