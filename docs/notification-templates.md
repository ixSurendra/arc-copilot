# Notification & Email Template System

## Overview

IX-Copilot provides a multi-tenant notification system centered around transactional email delivery. The system supports per-tenant branding and customizable email templates with a hierarchical fallback mechanism, ensuring that every tenant receives branded communications out of the box while allowing full customization.

The system spans three services:

- **tenant-service** -- Stores branding (TENANT_BRANDINGS) and email templates (EMAIL_TEMPLATES)
- **audit-service** -- Stores notification delivery logs (NOTIFICATION_LOGS)
- **Shared library** (`@arc/shared`) -- Contains the MailService, default Handlebars templates, and related DTOs

## Email Types

The system defines three notification types via the `NotificationType` enum:

| Type | Trigger | Purpose |
|------|---------|---------|
| `WELCOME` | New user creation | Sends login credentials and welcome information |
| `PASSWORD_RESET` | Password reset request | Sends a time-limited password reset link |
| `PASSWORD_CHANGED` | Successful password change | Confirms the password was changed |

## Template Variables Reference

All templates receive branding variables automatically. Additional type-specific variables are injected by the caller.

### Common Variables (all templates)

| Variable | Source | Description |
|----------|--------|-------------|
| `{{companyName}}` | TenantBranding | Organization name (falls back to "IX Platform") |
| `{{primaryColor}}` | TenantBranding | Hex color for headings and buttons (default: `#18181b`) |
| `{{logoUrl}}` | TenantBranding | URL to the company logo (optional, conditionally rendered) |
| `{{footerText}}` | TenantBranding | Custom footer text (optional, conditionally rendered) |
| `{{email}}` | Recipient | The recipient's email address |

### WELCOME Template Variables

| Variable | Description |
|----------|-------------|
| `{{tempPassword}}` | The temporary password assigned to the new user |
| `{{loginUrl}}` | URL to the login page |
| `{{userName}}` | The user's display name (optional) |

### PASSWORD_RESET Template Variables

| Variable | Description |
|----------|-------------|
| `{{resetUrl}}` | Time-limited password reset URL (expires in 1 hour) |
| `{{userName}}` | The user's display name (optional) |

### PASSWORD_CHANGED Template Variables

| Variable | Description |
|----------|-------------|
| `{{userName}}` | The user's display name (optional, used in greeting) |

## Hierarchical Fallback

Both branding and templates follow a three-tier fallback chain:

```
1. Tenant-specific (tenantId = <actual tenant>)
       |
       v  (not found)
2. Global default (tenantId = 0)
       |
       v  (not found)
3. Hardcoded default (in-code constants)
```

### Branding Fallback

The `MailService.fetchEffectiveBranding()` method resolves branding by calling the `get_effective_branding` TCP command on tenant-service, which checks:

1. Branding row where `TENANT_ID` matches the requesting tenant
2. Branding row where `TENANT_ID = 0` (global default)
3. Hardcoded `FALLBACK_BRANDING` constant in `MailService` (companyName: "IX Platform", primaryColor: "#18181b")

### Template Fallback

The `MailService.fetchEffectiveTemplate()` method resolves templates by calling the `get_effective_email_template` TCP command, which checks:

1. Template row where `TENANT_ID` and `TYPE` match
2. Template row where `TENANT_ID = 0` and `TYPE` matches (global default)
3. Hardcoded `DEFAULT_TEMPLATES` from `libs/shared/src/lib/mail/default-templates.ts`

## Branding Configuration

Branding is stored in the `TENANT_BRANDINGS` table (tenant-service database).

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `companyName` | String | Yes | "IX Platform" | Displayed in email headers and subjects |
| `logoUrl` | String | No | null | URL to company logo; rendered conditionally via `{{#if logoUrl}}` |
| `primaryColor` | String | Yes | "#18181b" | Used for headings, buttons, and accents |
| `secondaryColor` | String | No | null | Reserved for future use |
| `footerText` | String | No | null | Custom footer text; rendered conditionally |

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/branding/:tenantId` | Create or update branding for a tenant |
| `GET` | `/branding/:tenantId` | Get branding for a specific tenant |
| `PUT` | `/admin/branding/:tenantId` | Upsert branding via admin portal (BFF) |
| `GET` | `/admin/branding/:tenantId` | Get branding via admin portal (BFF) |

### TCP Commands

| Command | Description |
|---------|-------------|
| `upsert_tenant_branding` | Create/update tenant branding |
| `get_tenant_branding` | Get branding for a specific tenant |
| `get_effective_branding` | Get branding with fallback resolution |

## Customizing Templates

### Via Admin UI

Tenant administrators can customize email templates through the admin portal:

1. Navigate to the tenant's settings or branding section
2. Select the email template type to customize (WELCOME, PASSWORD_RESET, PASSWORD_CHANGED)
3. Edit the subject line and HTML body
4. Save to create a tenant-specific override

To reset a template to the global default, delete the tenant-specific template using the delete endpoint.

### Via API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/email-templates` | Create or update a template (body: tenantId, type, subject, htmlBody) |
| `GET` | `/email-templates/tenant/:id` | Get all templates for a tenant |
| `GET` | `/email-templates` | Query templates with filters (tenantId, type, page, limit) |
| `DELETE` | `/email-templates/:tenantId/:type` | Delete a template (resets to global default) |

### TCP Commands

| Command | Description |
|---------|-------------|
| `upsert_email_template` | Create/update email template |
| `get_tenant_email_templates` | Get all templates for a tenant |
| `get_effective_email_template` | Get template with fallback resolution |
| `query_email_templates` | Query templates with filters |
| `delete_email_template` | Delete template (reset to default) |

### Writing Custom Templates

Templates use **Handlebars** syntax. Key features:

- **Variables**: `{{variableName}}` -- replaced with the actual value
- **Conditionals**: `{{#if variableName}}...{{/if}}` -- conditionally render blocks
- **HTML**: Full HTML is supported in the `htmlBody` field

Example custom template snippet:
```handlebars
<h2 style="color: {{primaryColor}};">Welcome to {{companyName}}</h2>
{{#if logoUrl}}
  <img src="{{logoUrl}}" alt="{{companyName}}" />
{{/if}}
<p>Hello {{userName}}, your account is ready.</p>
```

## Notification Logs

Every email sent (or failed) through `sendTemplatedEmail()` is logged as a `NotificationLog` record in the audit-service database.

### What Is Logged

| Field | Description |
|-------|-------------|
| `tenantId` | The tenant the notification belongs to |
| `recipientEmail` | The email address the notification was sent to |
| `type` | WELCOME, PASSWORD_RESET, or PASSWORD_CHANGED |
| `channel` | Always EMAIL (extensible for future channels) |
| `subject` | The rendered email subject line |
| `status` | SENT, FAILED, or PENDING |
| `errorMessage` | Error details if delivery failed |
| `metadata` | JSON object with additional context (e.g., userId) |
| `sentAt` | Timestamp of the send attempt |

### Viewing Logs

Notification logs are accessible through:

- **Admin Portal**: Navigate to the notifications section to view logs filtered by tenant
- **API**: `GET /admin/notifications` (paginated, tenant-scoped via admin portal BFF)
- **API**: `GET /admin/notifications/:id` (single log entry)

### Delivery Flow

```
MailService.sendTemplatedEmail()
    |
    +-- 1. Fetch branding (TCP: get_effective_branding)
    +-- 2. Fetch template (TCP: get_effective_email_template)
    +-- 3. Merge variables + branding into Handlebars context
    +-- 4. Render subject + HTML body
    +-- 5. Send via SMTP (nodemailer)
    +-- 6. Emit notification_log_created event to audit-service
              |
              +-- audit-service persists NotificationLog record
```

## Seeding Default Data

### Cloud (SaaS) Deployments

Run the standalone seed script:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ix_db npx tsx tools/seed-default-templates.ts
```

This seeds:
- 1 global branding row (`tenantId=0`, companyName: "IX Platform")
- 3 global email template rows (`tenantId=0`: WELCOME, PASSWORD_RESET, PASSWORD_CHANGED)

The script is idempotent (uses ON CONFLICT DO UPDATE).

### On-Prem Deployments

The `tools/seed-onprem-admin.ts` script includes branding and template seeding as Steps 7-8:

- **Step 7**: Seeds global default branding (`tenantId=0`) and tenant-specific branding (using `TENANT_NAME` from env)
- **Step 8**: Seeds 3 global default email templates (`tenantId=0`)

No separate script is needed for on-prem -- it runs automatically as part of the standard on-prem seed process.

## On-Prem Considerations

- On-prem deployments use a single shared database (`ix_db`), so all service tables are accessible from one `DATABASE_URL`
- The on-prem seed script creates both a global default branding and a tenant-specific branding entry, so the customer's organization name appears in emails immediately
- SMTP configuration is required for email delivery (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`)
- Templates reference the `APP_URL` environment variable for login/reset URLs
- If SMTP is not configured, emails will fail but the system continues to operate (failures are logged in NOTIFICATION_LOGS)

## Cloud vs On-Prem Differences

| Aspect | Cloud (SaaS) | On-Prem |
|--------|-------------|---------|
| Branding seed | Global default only (`tenantId=0`) | Global default + tenant-specific |
| Template seed | Global defaults (`tenantId=0`) | Global defaults (`tenantId=0`) |
| Seed script | `tools/seed-default-templates.ts` | `tools/seed-onprem-admin.ts` (Steps 7-8) |
| Multi-tenant | Many tenants, each can customize | Typically single tenant |
| SMTP | Platform-managed | Customer-managed |
| Template customization | Via admin UI per tenant | Via admin UI (single tenant) |
| Fallback chain | tenant -> global -> hardcoded | tenant -> global -> hardcoded |

## Related Files

| File | Purpose |
|------|---------|
| `libs/shared/src/lib/mail/mail.service.ts` | Core MailService with templated email sending |
| `libs/shared/src/lib/mail/default-templates.ts` | Hardcoded default Handlebars templates |
| `libs/shared/src/lib/mail/mail.interfaces.ts` | MailModuleOptions and SendTemplatedEmailOptions interfaces |
| `libs/shared/src/lib/mail/mail.constants.ts` | DI tokens (MAIL_OPTIONS, MAIL_TENANT_CLIENT, MAIL_AUDIT_CLIENT) |
| `apps/tenant-service/prisma/schema.prisma` | TenantBranding and EmailTemplate models |
| `apps/audit-service/prisma/schema.prisma` | NotificationLog model |
| `tools/seed-default-templates.ts` | Cloud seed script for default templates/branding |
| `tools/seed-onprem-admin.ts` | On-prem seed script (includes Steps 7-8 for templates/branding) |
