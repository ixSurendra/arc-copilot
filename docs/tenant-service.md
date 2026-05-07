# Tenant Service

The tenant service manages tenant lifecycle, subscription plans, billing records, invoices, branding, and email templates. It is the central tenant registry that other services reference for tenant existence and status.

---

## Connection

| Transport  | Address               | Port   |
|------------|-----------------------|--------|
| TCP (RPC)  | `0.0.0.0`             | `3003` |
| HTTP       | `http://localhost`    | `4003` |

The constants are exported from `@org/shared`:

```ts
import { TENANT_SERVICE_PORT, TENANT_SERVICE_HTTP_PORT } from '@org/shared';
```

---

## Database Tables (6)

| Table              | Purpose                                                        |
|--------------------|----------------------------------------------------------------|
| Tenant             | Core tenant record (plan, quota, billing cycle, domain, status)|
| TenantPlanHistory  | Plan change audit trail (INITIAL/UPGRADE/DOWNGRADE)            |
| TenantBilling      | Billing records (type, amount, payment status/method)          |
| Invoice            | Generated invoices (number, amounts, due date, status, PDF)    |
| TenantBranding     | Per-tenant branding (company name, logo, colors, footer)       |
| EmailTemplate      | Per-tenant email templates (type, subject, HTML body)          |

### Plan ID Contract

`TENANT.PLAN_ID` stores the plan **NAME** as a string (e.g. `"PROFESSIONAL"`, `"BUSINESS"`, `"FREE"`), **not** the numeric `Plan.id` FK. This is the canonical format used by `license-service.quota.service.ts::findPlanByName()` to resolve tenant quotas.

Multiple defences prevent accidentally writing a numeric ID:

1. **Admin-UI Zod schema** (`apps/admin-ui/src/lib/schemas/tenant.schema.ts`) rejects numeric strings via `regex(/^[A-Z_]+$/)`.
2. **Admin-UI dropdowns** (`tenant-detail-client.tsx`, `tenants/new/page.tsx`) bind `<SelectItem value={plan.planName}>` — not `plan.id`.
3. **Shared DTOs** (`libs/shared/.../update-tenant.dto.ts`, `create-tenant.dto.ts`) enforce the same regex via `class-validator` `@Matches`.
4. **Tenant-service** (`tenants.service.ts::updateTenant`) calls `get_plan_by_name` on license-service to verify the plan exists before the update, and records a `TENANT_PLAN_HISTORY` row (INITIAL / UPGRADE / DOWNGRADE).
5. **Tenant-service repository** (`tenants.repository.ts`) has a belt-and-braces `assertPlanIdIsNotNumeric()` that throws `BadRequestException` on any `/^\d+$/` value.
6. **License-service** (`quota.service.ts`) keeps a numeric fallback for backward compatibility with legacy data and logs a WARN whenever that branch fires, so stragglers can be detected and migrated via `tools/fix-tenant-plan-ids.ts`.

**Exceptions**: `PLAN_ID` can also be `"ON_PREM"` (for on-premises tenants) or `"SYSTEM"` (for the system tenant, ID 0). These are reserved and validated alongside real plan names.

---

## Modules

### Tenants
Core tenant CRUD with paginated queries and analytics.

### Billings
Billing record management for tenants.

### Invoices
Invoice creation and querying tied to billing records.

### Plan History
Tracks plan changes (upgrades/downgrades) over time.

### Branding
Per-tenant branding configuration with a fallback chain:
1. Tenant-specific branding (by tenantId)
2. Global default branding (tenantId = 0)
3. Hardcoded default (companyName: "IX Platform", primaryColor: "#18181b")

### Email Templates
Per-tenant email template overrides with a fallback chain:
1. Tenant-specific template (by tenantId + type)
2. Global default template (tenantId = 0 + type)
3. Returns null if neither exists

Supported notification types: `WELCOME`, `PASSWORD_RESET`, `PASSWORD_CHANGED`

---

## TCP Patterns

### Tenants
| Pattern              | Payload                        | Response          |
|----------------------|--------------------------------|-------------------|
| `get_tenant`         | `{ id }`                       | `Tenant`          |
| `get_tenant_by_domain`| `{ domain }`                  | `Tenant`          |
| `get_tenant_status`  | `{ id }`                       | `{ id, status }`  |
| `create_tenant`      | `CreateTenantDto`              | `Tenant`          |
| `update_tenant`      | `{ id, ...UpdateTenantDto }`   | `Tenant`          |
| `query_tenants`      | `QueryTenantDto`               | `PaginatedResponse<Tenant>` |
| `get_tenant_analytics`| (none)                        | `TenantAnalytics` |

### Branding
| Pattern                   | Payload                                | Response               |
|---------------------------|----------------------------------------|------------------------|
| `upsert_tenant_branding`  | `{ tenantId, ...UpsertTenantBrandingDto }` | `TenantBranding`   |
| `get_tenant_branding`     | `{ tenantId }`                         | `TenantBranding \| null` |
| `get_effective_branding`  | `{ tenantId }`                         | `TenantBranding`       |

### Email Templates
| Pattern                        | Payload                     | Response                         |
|--------------------------------|-----------------------------|----------------------------------|
| `upsert_email_template`        | `UpsertEmailTemplateDto`    | `EmailTemplate`                  |
| `get_tenant_email_templates`   | `{ tenantId }`              | `EmailTemplate[]`                |
| `get_effective_email_template` | `{ tenantId, type }`        | `EmailTemplate \| null`          |
| `query_email_templates`        | `QueryEmailTemplateDto`     | `PaginatedResponse<EmailTemplate>` |
| `delete_email_template`        | `{ tenantId, type }`        | `{ count }`                      |

---

## HTTP Endpoints

### Tenants
| Method | Path             | Description                     |
|--------|------------------|---------------------------------|
| POST   | `/tenants`       | Create a tenant                 |
| GET    | `/tenants`       | Query tenants (paginated)       |
| GET    | `/tenants/:id`   | Get tenant by ID                |
| PATCH  | `/tenants/:id`   | Update a tenant                 |

### Branding
| Method | Path                    | Description                       |
|--------|-------------------------|-----------------------------------|
| PUT    | `/branding/:tenantId`   | Upsert tenant branding            |
| GET    | `/branding/:tenantId`   | Get tenant branding               |

### Email Templates
| Method | Path                              | Description                         |
|--------|-----------------------------------|-------------------------------------|
| PUT    | `/email-templates`                | Upsert email template               |
| GET    | `/email-templates/tenant/:id`     | Get all templates for a tenant      |
| GET    | `/email-templates`                | Query templates (paginated)         |
| DELETE | `/email-templates/:tenantId/:type`| Delete template (reset to default)  |

---

## Imports from `@org/shared`

```ts
import {
  // Tenant DTOs
  CreateTenantDto,
  UpdateTenantDto,
  QueryTenantDto,

  // Branding DTOs
  UpsertTenantBrandingDto,

  // Email Template DTOs
  UpsertEmailTemplateDto,
  QueryEmailTemplateDto,

  // Interfaces
  Tenant,
  TenantBranding,
  EmailTemplate,
  PaginatedResponse,

  // Enums
  NotificationType,

  // Constants
  TENANT_SERVICE_PORT,
  TENANT_SERVICE_HTTP_PORT,
} from '@org/shared';
```

---

## Environment Variables

| Variable                   | Required | Default       | Description                   |
|----------------------------|----------|---------------|-------------------------------|
| `DATABASE_URL`             | Yes      | --            | PostgreSQL connection string  |
| `NODE_ENV`                 | No       | `development` | Runtime environment           |
| `TENANT_SERVICE_PORT`      | No       | `3003`        | TCP microservice port         |
| `TENANT_SERVICE_HTTP_PORT` | No       | `4003`        | HTTP server port              |

---

## Health Check

```
GET http://localhost:4003/health
```

Returns `200 OK` when the service and its database connection are healthy.

---

## Swagger UI

When `NODE_ENV !== 'production'` the interactive API docs are available at:

```
http://localhost:4003/api
```
