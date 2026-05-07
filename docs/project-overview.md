# ix-copilot — Complete Project Overview

This document contains everything needed to understand the ix-copilot codebase. It covers architecture, every microservice, every database table, every API endpoint, every TCP pattern, deployment modes, authentication, licensing, and inter-service communication.

---

## 1. What Is This Project?

ix-copilot is a **multi-tenant SaaS foundation layer** — the backend infrastructure that any SaaS product can build on top of. It provides tenant management, user management, role-based access control (RBAC), authentication, licensing/quota management, usage metering, and audit logging out of the box.

It supports **two deployment modes**:
- **Cloud (SaaS)**: You host it, multiple tenants share the infrastructure (`ON_PREM=false`)
- **On-Prem**: Customer hosts it on their own server with a signed license file (`ON_PREM=true`)

Same codebase, same Docker images — behavior is controlled entirely by environment variables.

---

## 2. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Language | TypeScript | 5.9.2 |
| Runtime | Node.js | 20.x |
| Framework | NestJS | 11.0.0 |
| Monorepo | Nx | 22.5.1 |
| Package Manager | pnpm | 9.x (with workspaces) |
| ORM | Prisma | 7.4.2 |
| Database | PostgreSQL | 15 |
| Cache | Redis (ioredis) | 7 |
| Auth | @nestjs/jwt + @nestjs/passport + passport-jwt | - |
| Validation | class-validator + class-transformer | - |
| API Docs | @nestjs/swagger (OpenAPI) | 11.2.6 |
| Scheduling | @nestjs/schedule | 6.1.1 |
| Bundler | Webpack (via @nx/webpack) with SWC | - |
| Container | Docker (multi-stage build) | - |
| Orchestration | Docker Compose | - |

---

## 3. Repository Structure

```
ix-copilot/
├── apps/
│   ├── auth-service/          # Authentication & credentials (7 tables)
│   ├── audit-service/         # Audit logging (2 tables)
│   ├── tenant-service/        # Tenant & billing management (4 tables)
│   ├── users-service/         # Users, roles, groups, RBAC (10 tables)
│   └── license-service/       # Plans, features, quotas, usage, on-prem (7 tables)
├── libs/
│   └── shared/                # @org/shared — DTOs, enums, interfaces, guards, modules
├── tools/
│   └── generate-license-keys.ts  # RSA key pair generator
├── docs/                      # All documentation
├── Dockerfile                 # Multi-stage build (all services)
├── docker-compose.yml         # Local Docker development stack
├── docker-compose.onprem.yml  # On-prem production deployment
├── .env.example               # Root env template
├── .env.docker.example        # Docker env template
├── .env.onprem.example        # On-prem env template
├── nx.json                    # Nx workspace config
├── pnpm-workspace.yaml        # pnpm workspace packages
├── tsconfig.base.json         # Shared TypeScript config
└── package.json               # Root dependencies
```

---

## 4. Shared Library (`libs/shared` / `@org/shared`)

All reusable code lives here. Services import via `@org/shared`.

### 4.1 Constants (`constants/services.ts`)

```
AUTH_SERVICE       = 'AUTH_SERVICE'        TCP: 3001   HTTP: 4001
AUDIT_SERVICE      = 'AUDIT_SERVICE'       TCP: 3002   HTTP: 4002
TENANT_SERVICE     = 'TENANT_SERVICE'      TCP: 3003   HTTP: 4003
USERS_SERVICE      = 'USERS_SERVICE'       TCP: 3004   HTTP: 4004
LICENSE_SERVICE    = 'LICENSE_SERVICE'      TCP: 3005   HTTP: 4005
```

### 4.2 Enums (17 total)

| Enum | Values |
|------|--------|
| `TenantStatus` | ACTIVE, INACTIVE, SUSPENDED |
| `UserStatus` | ACTIVE, INACTIVE, SUSPENDED |
| `AuthType` | PASSWORD, SSO_GOOGLE, SSO_MICROSOFT, SAML, MAGIC_LINK, LDAP |
| `SsoProviderType` | GOOGLE, MICROSOFT, SAML, OKTA, LDAP, CUSTOM |
| `MfaType` | EMAIL_OTP, SMS_OTP, AUTHENTICATOR_APP |
| `TokenStatus` | ACTIVE, REVOKED, EXPIRED |
| `LoginAttemptStatus` | SUCCESS, FAILED, BLOCKED |
| `BillingCycle` | MONTHLY, ANNUALLY |
| `BillingType` | PLAN_SUBSCRIPTION, TOP_UP |
| `PaymentStatus` | PENDING, PAID, FAILED, REFUNDED |
| `PaymentMethod` | CARD, BANK, UPI |
| `InvoiceStatus` | DRAFT, SENT, PAID, OVERDUE, CANCELLED |
| `PlanChangeType` | INITIAL, UPGRADE, DOWNGRADE |
| `QuotaType` | SHARED, INDIVIDUAL |
| `FeatureStatus` | ACTIVE, INACTIVE, DEPRECATED |
| `TopUpStatus` | ACTIVE, EXPIRED, FULLY_CONSUMED |
| `AuditLogStatus` | SUCCESS, FAILURE, PARTIAL |

### 4.3 Shared Modules

**BasePrismaService**: Extends `PrismaClient`, manages connection lifecycle, uses `PrismaPg` adapter. Each service creates its own `XxxPrismaService extends BasePrismaService`.

**PrismaModule**: Dynamic module (`PrismaModule.forRoot(ServiceClass)`) that provides the Prisma service.

**HealthModule**: Dynamic module (`HealthModule.forRootAsync()`) providing `GET /health` endpoint with optional Prisma database connectivity check.

**setupSwagger()**: Dynamically imports `@nestjs/swagger` only when `NODE_ENV !== 'production'`. Mounts Swagger UI at `/api`.

**AllExceptionsFilter**: Global exception filter. HTTP context returns JSON `{statusCode, timestamp, path, error, message}`. RPC context converts to `RpcException`.

**OnPremLicenseGuard**: Global guard for on-prem mode. When `ON_PREM=true`, validates `.lic` file on every request (cached 5 min). Whitelists `/health` and `/on-prem/license/status`. Returns 403 if license is expired/invalid.

**validateLicenseFile()**: Pure function that reads `.lic` from disk, verifies RSA-SHA256 signature with public key, checks expiry. Returns `LicenseValidationResult`.

### 4.4 DTOs

All DTOs use `class-validator` decorators + `@nestjs/swagger` `@ApiProperty()` decorators.

**Tenant DTOs**: CreateTenantDto, UpdateTenantDto, QueryTenantDto, CreateBillingDto, QueryBillingDto, CreateInvoiceDto, QueryInvoiceDto, CreatePlanHistoryDto, QueryPlanHistoryDto

**Users DTOs**: CreateUserDto, UpdateUserDto, QueryUserDto, AssignUserRolesDto, AssignUserGroupsDto, CreateRoleDto, QueryRoleDto, AssignRolePermissionsDto, CreateGroupDto, QueryGroupDto, AssignGroupRolesDto, CreateModuleDto, CreatePermissionDto

**Auth DTOs**: LoginDto, RefreshTokenDto, LoginResponseDto, RegisterCredentialsDto, ChangePasswordDto, MfaSetupDto, MfaVerifyDto, CreateAuthConfigDto, CreateSsoProviderDto

**License DTOs**: CreateFeatureDto, CreatePlanDto, SetPlanQuotaDto, CreatePlanPricingDto, CheckQuotaDto, RecordUsageDto, QueryLicenseDto

**Audit DTOs**: CreateAuditLogDto, QueryAuditLogDto

### 4.5 Interfaces

**PaginatedResponse\<T\>**: `{ data: T[], total: number, page: number, limit: number, totalPages: number }`

**AuthUser**: `{ id, tenantId, email, roles[], status }` — represents the validated JWT user.

Plus interfaces for every domain entity (Tenant, User, Role, Group, AuditLog, Plan, Feature, etc.)

---

## 5. Microservices — Detailed

### 5.1 Tenant Service (TCP: 3003, HTTP: 4003)

Manages tenant lifecycle, billing, invoices, and plan history.

#### Database Tables (4)

**tenants**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| plan_id | String | References plan in license-service |
| next_plan_id | String? | Upcoming plan change |
| quota_type | SHARED / INDIVIDUAL | How quotas are split |
| max_users | Int? | User limit |
| billing_cycle | MONTHLY / ANNUALLY | |
| cycle_start_date | Date | Current cycle start |
| tenant_name | String | |
| domain | String | Used for login resolution |
| status | ACTIVE / INACTIVE / SUSPENDED | |
| created_at, updated_at | DateTime | |

**tenant_plan_history**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants (cascade) |
| plan_id | String | |
| change_type | INITIAL / UPGRADE / DOWNGRADE | |
| start_date | Date | |
| end_date | Date? | |
| created_at | DateTime | |

**tenant_billings**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | FK → tenants (cascade) |
| billing_type | PLAN_SUBSCRIPTION / TOP_UP | |
| reference_id | String | |
| amount | Decimal(12,2) | |
| currency | String (default: USD) | |
| billing_date | Date | |
| next_billing_date | Date? | |
| payment_status | PENDING / PAID / FAILED / REFUNDED | |
| payment_method | CARD / BANK / UPI | |
| transaction_id | String? | |

**invoices**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | |
| billing_id | UUID | FK → tenant_billings (unique, cascade) |
| invoice_number | String | Unique |
| amount, tax_amount, total_amount | Decimal(12,2) | |
| invoice_date, due_date | Date | |
| status | DRAFT / SENT / PAID / OVERDUE / CANCELLED | |
| pdf_url | String? | |

#### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /tenants | Create tenant |
| GET | /tenants | Query tenants (paginated) |
| GET | /tenants/:id | Get tenant by ID |
| PATCH | /tenants/:id | Update tenant |
| POST | /billings | Create billing record |
| GET | /billings | Query billings (paginated) |
| GET | /billings/:id | Get billing by ID |
| POST | /invoices | Create invoice |
| GET | /invoices | Query invoices (paginated) |
| GET | /invoices/:id | Get invoice by ID |
| GET | /plan-history | Query plan history (paginated) |

#### TCP Patterns

| Pattern | Payload | Returns |
|---------|---------|---------|
| `{ cmd: 'get_tenant' }` | `{ id }` | Tenant |
| `{ cmd: 'get_tenant_status' }` | `{ id }` | `{ status }` |
| `{ cmd: 'create_tenant' }` | CreateTenantDto | Tenant |
| `{ cmd: 'update_tenant' }` | `{ id, ...UpdateTenantDto }` | Tenant |
| `{ cmd: 'get_tenant_billing' }` | `{ id }` | TenantBilling |
| `{ cmd: 'create_billing' }` | CreateBillingDto | TenantBilling |
| `{ cmd: 'get_invoice' }` | `{ id }` | Invoice |
| `{ cmd: 'create_invoice' }` | CreateInvoiceDto | Invoice |
| `{ cmd: 'get_plan_history' }` | QueryPlanHistoryDto | PaginatedResponse |
| `{ cmd: 'create_plan_history' }` | CreatePlanHistoryDto | TenantPlanHistory |

---

### 5.2 Users Service (TCP: 3004, HTTP: 4004)

Manages users, roles, groups, modules, and permissions. Implements RBAC (Role-Based Access Control).

#### RBAC Model

```
ModuleMaster (global)  ←→  PermissionMaster (global)
       ↕ ModulePermission (junction)
       ↕
Role (tenant-scoped) → RoleModulePermission (role can do X permission on Y module)
       ↕
User (tenant-scoped)  → UserRole (user has roles)
       ↕
Group (tenant-scoped) → GroupRole (group has roles), UserGroup (user in groups)
```

#### Database Tables (10)

**module_master** (global, no tenant_id)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| module_name | String | |
| module_key | String | Unique |
| description | String? | |
| status | ACTIVE / INACTIVE | |

**permission_master** (global, no tenant_id)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| permission_name | String | |
| permission_key | String | Unique |
| description | String? | |
| status | ACTIVE / INACTIVE | |

**module_permissions** (junction)
| Column | Type | Notes |
|--------|------|-------|
| module_id | UUID | Composite PK |
| permission_id | UUID | Composite PK |
| status | ACTIVE / INACTIVE | |

**roles** (tenant-scoped)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | |
| role_name | String | Unique per tenant |
| description | String? | |
| status | ACTIVE / INACTIVE | |

**role_module_permissions** (RBAC junction: role → module → permission)
| Column | Type | Notes |
|--------|------|-------|
| role_id | UUID | Composite PK |
| module_id | UUID | Composite PK |
| permission_id | UUID | Composite PK |
| is_enabled | Boolean | default true |

**groups** (tenant-scoped)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | |
| group_name | String | Unique per tenant |
| description | String? | |
| status | ACTIVE / INACTIVE | |

**group_roles** (junction)
| Column | Type | Notes |
|--------|------|-------|
| group_id | UUID | Composite PK |
| role_id | UUID | Composite PK |

**users** (tenant-scoped)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | |
| email | String | Unique per tenant |
| first_name | String | |
| last_name | String | |
| phone | String? | |
| status | ACTIVE / INACTIVE / SUSPENDED | |

**user_roles** (junction)
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID | Composite PK |
| role_id | UUID | Composite PK |

**user_groups** (junction)
| Column | Type | Notes |
|--------|------|-------|
| user_id | UUID | Composite PK |
| group_id | UUID | Composite PK |

#### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /users | Create user |
| GET | /users | Query users (paginated) |
| GET | /users/:id | Get user by ID |
| PATCH | /users/:id | Update user |
| GET | /users/:id/roles | Get user with roles |
| POST | /users/:id/roles | Assign roles to user |
| DELETE | /users/:id/roles | Remove roles from user |
| POST | /users/:id/groups | Assign groups to user |
| DELETE | /users/:id/groups | Remove groups from user |
| POST | /roles | Create role |
| GET | /roles | Query roles (paginated) |
| GET | /roles/:id | Get role by ID |
| PATCH | /roles/:id | Update role |
| GET | /roles/:id/permissions | Get role permissions |
| POST | /roles/:id/permissions | Assign permissions to role |
| DELETE | /roles/:id/permissions/:moduleId/:permissionId | Remove permission |
| POST | /groups | Create group |
| GET | /groups | Query groups (paginated) |
| GET | /groups/:id | Get group by ID |
| PATCH | /groups/:id | Update group |
| GET | /groups/:id/roles | Get group roles |
| POST | /groups/:id/roles | Assign roles to group |
| DELETE | /groups/:id/roles | Remove roles from group |
| POST | /modules | Create module |
| GET | /modules | List modules (paginated) |
| GET | /modules/:id | Get module by ID |
| PATCH | /modules/:id | Update module |
| GET | /modules/:id/permissions | Get module permissions |
| POST | /modules/:id/permissions | Assign permissions to module |
| DELETE | /modules/:id/permissions/:permissionId | Remove permission |
| POST | /permissions | Create permission |
| GET | /permissions | List permissions (paginated) |
| GET | /permissions/:id | Get permission by ID |
| PATCH | /permissions/:id | Update permission |

#### TCP Patterns

| Pattern | Payload | Returns |
|---------|---------|---------|
| `{ cmd: 'get_user_by_id' }` | `{ id }` | User |
| `{ cmd: 'get_user_by_email' }` | `{ tenantId, email }` | User |
| `{ cmd: 'get_user_roles' }` | `{ id }` | UserWithRoles |
| `{ cmd: 'check_permission' }` | `{ roleId, moduleId, permissionId }` | `{ allowed: boolean }` |

---

### 5.3 Auth Service (TCP: 3001, HTTP: 4001)

Handles authentication, JWT tokens, credentials, MFA, and per-tenant auth configuration.

**Depends on**: Users Service (TCP), Tenant Service (TCP)

#### JWT Token

**Access token payload (signed with HS256)**:
```json
{ "sub": "<userId>", "email": "<email>", "tenantId": "<uuid>", "roles": ["admin", "editor"] }
```
- Default expiry: 15 minutes (`JWT_EXPIRATION`)
- Extracted from: `Authorization: Bearer <token>` header

**Refresh token**: Random 40-byte hex string, SHA256 hashed before storage. Default validity: 7 days.

#### Login Flow

1. Resolve tenant by domain
2. Check tenant status is ACTIVE (TCP → tenant-service)
3. Get tenant auth config (lockout policy)
4. Check account lockout (count recent failed attempts)
5. Get user by email (TCP → users-service)
6. Verify password with bcrypt
7. Get user roles (TCP → users-service)
8. Generate JWT access token + refresh token
9. Store refresh token hash in DB
10. Log successful attempt in login_attempts table

#### Database Tables (7)

**tenant_auth_configs** (one per tenant)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | Unique |
| is_mfa_mandatory | Boolean | default false |
| allowed_auth_types | Json | default ["PASSWORD"] |
| password_min_length | Int | default 8 |
| password_require_uppercase | Boolean | default true |
| password_require_number | Boolean | default true |
| password_require_special_char | Boolean | default true |
| password_history_count | Int | default 3 |
| max_failed_attempts | Int | default 5 |
| lockout_duration_minutes | Int | default 30 |
| session_timeout_minutes | Int | default 60 |
| max_concurrent_sessions | Int | default 5 |
| refresh_token_validity_days | Int | default 7 |
| is_ldap_sync_enabled | Boolean | default false |
| ldap_sync_frequency | String? | |
| ldap_last_synced_at | DateTime? | |

**sso_provider_configs**
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenant_id | UUID | |
| provider_type | GOOGLE / MICROSOFT / SAML / OKTA / LDAP / CUSTOM | |
| client_id, client_secret | String | OAuth credentials |
| redirect_url, metadata_url | String? | |
| ldap_host, ldap_base_dn, ldap_bind_user, ldap_bind_password | String? | LDAP fields |
| status | ACTIVE / INACTIVE | |

**user_credentials** (one per user)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| user_id | UUID | Unique |
| tenant_id | UUID | |
| auth_type | PASSWORD / SSO_GOOGLE / SSO_MICROSOFT / SAML / MAGIC_LINK / LDAP | |
| password_hash | String? | bcrypt hash |
| sso_provider_id | UUID? | FK → sso_provider_configs |
| status | ACTIVE / INACTIVE / LOCKED | |

**password_history**: Tracks previous password hashes for rotation enforcement.

**refresh_tokens**: Stores SHA256 hashed refresh tokens with device info, IP, expiry, and status (ACTIVE/REVOKED/EXPIRED).

**mfa_configs** (one per user): MFA type (EMAIL_OTP/SMS_OTP/AUTHENTICATOR_APP), secret key, verification status.

**login_attempts**: Every login attempt (success/failure/blocked) with email, IP, device, location, failure reason.

#### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/login | Login (returns access + refresh token) |
| POST | /auth/refresh | Refresh tokens |
| POST | /auth/logout | Logout (revoke all refresh tokens) |
| POST | /credentials/register | Register user credentials |
| PATCH | /credentials/:userId/change-password | Change password |
| POST | /mfa/:userId/setup | Setup MFA |
| POST | /mfa/:userId/verify | Verify MFA code |
| DELETE | /mfa/:userId | Disable MFA |
| GET | /auth-config/:tenantId | Get tenant auth config |
| POST | /auth-config | Create auth config |
| PATCH | /auth-config/:tenantId | Update auth config |
| GET | /auth-config/:tenantId/sso-providers | List SSO providers |
| POST | /auth-config/sso-providers | Create SSO provider |
| PATCH | /auth-config/sso-providers/:id | Update SSO provider |

#### TCP Patterns

| Pattern | Payload | Returns |
|---------|---------|---------|
| `{ cmd: 'validate_user' }` | `{ token }` | `{ valid, user }` |
| `{ cmd: 'validate_token' }` | `{ token }` | AuthUser or null |
| `{ cmd: 'get_auth_config' }` | `{ tenantId }` | TenantAuthConfig |

---

### 5.4 Audit Service (TCP: 3002, HTTP: 4002)

Central event log for the platform. Other services emit fire-and-forget events.

#### Database Tables (2)

**audit_logs** (lightweight, indexed for fast queries)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenant_id | String | |
| user_id | String | |
| action | String | e.g. "USER_CREATED", "LOGIN" |
| resource | String | e.g. "user", "tenant" |
| resource_id | String? | |
| status | SUCCESS / FAILURE / PARTIAL | |
| ip_address | String? | |
| user_agent | String? | |
| duration | Int? | ms |
| source | String? | |
| timestamp | DateTime | |

**audit_log_details** (heavy JSON payloads, 1:1 with audit_logs)
| Column | Type | Notes |
|--------|------|-------|
| audit_log_id | UUID | PK + FK → audit_logs (cascade) |
| old_value | Json? | Previous state |
| new_value | Json? | New state |
| metadata | Json? | Extra context |

#### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /audit-logs | Query audit logs (paginated, filtered) |
| GET | /audit-logs/:id | Get audit log with detail |

#### TCP/Event Patterns

| Pattern | Type | Payload |
|---------|------|---------|
| `'audit_log_created'` | **EventPattern** (fire-and-forget) | CreateAuditLogDto |
| `{ cmd: 'get_audit_logs' }` | MessagePattern | QueryAuditLogDto |
| `{ cmd: 'get_audit_log_by_id' }` | MessagePattern | `{ id }` |

---

### 5.5 License Service (TCP: 3005, HTTP: 4005)

Manages plans, features, quotas, pricing, usage metering, and on-prem licensing.

**Depends on**: Tenant Service (TCP), Audit Service (TCP), Redis

#### Database Tables (7)

**feature_registry** (global feature catalog)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| featureKey | String | Unique (e.g. "api-calls", "storage-gb") |
| featureName | String | |
| description | String? | |
| status | ACTIVE / INACTIVE / DEPRECATED | |

**plan** (subscription plans)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| planName | String | Unique (e.g. "Free", "Pro", "Enterprise") |
| description | String? | |
| status | ACTIVE / INACTIVE | |

**plan_feature_quota** (how much of each feature a plan allows)
| Column | Type | Notes |
|--------|------|-------|
| planId | UUID | Composite PK |
| featureId | UUID | Composite PK |
| quotaLimit | Int? | null = unlimited |
| isEnabled | Boolean | default true |

**plan_pricing** (price per billing cycle)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| planId | UUID | FK → plan |
| billingCycle | MONTHLY / ANNUALLY | |
| price | Decimal(12,2) | |
| currency | String (default: USD) | |
| status | ACTIVE / INACTIVE | |
| Unique | [planId, billingCycle, currency] | |

**top_up_pricing** (one-time quota purchase options)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| featureId | UUID | FK → feature_registry |
| quotaAmount | Int | How much quota in this package |
| price | Decimal(12,2) | |
| currency | String | |
| validityDays | Int | How long the top-up is valid |

**quota_top_up** (actual top-ups purchased by tenants)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenantId | UUID | |
| userId | UUID? | Optional per-user tracking |
| featureId | UUID | FK → feature_registry |
| additionalQuota | Int | Amount purchased |
| consumed | Int | default 0 |
| purchasedDate | DateTime | |
| expiryDate | DateTime | |
| status | ACTIVE / EXPIRED / FULLY_CONSUMED | |

**usage_ledger** (consumption tracking per billing cycle)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| tenantId | UUID | |
| featureId | UUID | FK → feature_registry |
| userId | UUID? | Optional per-user tracking |
| consumed | Int | default 0, incremented on each use |
| cycleStartDate | DateTime | |
| cycleEndDate | DateTime | |

#### Quota Check Flow

1. Resolve feature by `featureKey` from FeatureRegistry
2. Get tenant's `planId` (TCP → tenant-service `get_tenant`)
3. Get plan's `quotaLimit` from PlanFeatureQuota
4. Get current `consumed` from Redis (key: `quota:{tenantId}:{featureKey}`) or fallback to UsageLedger
5. If `quotaLimit = null` → unlimited, return allowed
6. If `consumed < quotaLimit` → allowed
7. If exceeded → check active QuotaTopUps for remaining
8. If no top-ups → quota exhausted

#### HTTP Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | /features | Create feature |
| GET | /features | Query features (paginated) |
| GET | /features/:id | Get feature by ID |
| PATCH | /features/:id | Update feature |
| POST | /plans | Create plan |
| GET | /plans | Query plans (paginated) |
| GET | /plans/:id | Get plan by ID |
| PATCH | /plans/:id | Update plan |
| GET | /plans/:id/quotas | Get plan quotas |
| POST | /plans/:id/quotas | Set plan quota |
| DELETE | /plans/:id/quotas/:featureId | Remove quota |
| POST | /pricing/plan | Create plan pricing |
| GET | /pricing/plan | Query plan pricings |
| GET | /pricing/plan/:id | Get plan pricing |
| PATCH | /pricing/plan/:id | Update plan pricing |
| POST | /pricing/top-up | Create top-up pricing |
| GET | /pricing/top-up | Query top-up pricings |
| GET | /pricing/top-up/:id | Get top-up pricing |
| PATCH | /pricing/top-up/:id | Update top-up pricing |
| GET | /quota/check | Check quota (tenantId, featureKey) |
| POST | /quota/top-up | Purchase quota top-up |
| POST | /usage/record | Record usage event |
| GET | /usage | Query usage records |
| POST | /on-prem/license | Generate signed license (on-prem only) |
| GET | /on-prem/license/status | Check license status (on-prem only) |

#### TCP Patterns

| Pattern | Payload | Returns |
|---------|---------|---------|
| `{ cmd: 'get_feature' }` | `{ id }` | Feature |
| `{ cmd: 'get_feature_by_key' }` | `{ featureKey }` | Feature |
| `{ cmd: 'get_plan' }` | `{ id }` | Plan |
| `{ cmd: 'get_plan_quotas' }` | `{ planId }` | PlanFeatureQuota[] |
| `{ cmd: 'get_plan_pricing' }` | `{ planId }` | PlanPricing[] |
| `{ cmd: 'check_quota' }` | CheckQuotaDto | QuotaCheckResult |
| `{ cmd: 'record_usage' }` | RecordUsageDto | `{ recorded: true }` |
| `{ cmd: 'validate_license' }` | - | LicenseValidationResult |
| `{ cmd: 'query_licenses' }` | QueryLicenseDto | PaginatedResponse |

---

## 6. Inter-Service Communication

All inter-service calls use NestJS **TCP transport** (not HTTP).

```
auth-service ──TCP──→ users-service    (get_user_by_email, get_user_roles)
auth-service ──TCP──→ tenant-service   (get_tenant_status)
license-service ──TCP──→ tenant-service (get_tenant for plan info)
license-service ──TCP──→ audit-service  (audit_log_created event)
```

TCP hosts are configurable via env vars (`USERS_SERVICE_HOST`, `TENANT_SERVICE_HOST`, `AUDIT_SERVICE_HOST`), defaulting to `localhost` for local dev and using Docker container names in Docker.

---

## 7. Database Architecture

All 5 services share a **single PostgreSQL database** (`ix_db`) with **29 tables total**. Each service has its own Prisma schema and migrations, but they all point to the same `DATABASE_URL`.

| Service | Tables |
|---------|--------|
| tenant-service | tenants, tenant_plan_history, tenant_billings, invoices |
| users-service | module_master, permission_master, module_permissions, roles, role_module_permissions, groups, group_roles, users, user_roles, user_groups |
| auth-service | tenant_auth_configs, sso_provider_configs, user_credentials, password_history, refresh_tokens, mfa_configs, login_attempts |
| audit-service | audit_logs, audit_log_details |
| license-service | feature_registry, plan, plan_feature_quota, plan_pricing, top_up_pricing, quota_top_up, usage_ledger |

---

## 8. Authentication & Authorization

### JWT Flow

```
POST /auth/login (email, password, domain)
    ↓
Resolve tenant by domain (TCP → tenant-service)
    ↓
Get user by email (TCP → users-service)
    ↓
Verify password (bcrypt)
    ↓
Get user roles (TCP → users-service)
    ↓
Sign JWT: { sub: userId, email, tenantId, roles[] }
Generate refresh token (40-byte random hex)
    ↓
Return: { accessToken, refreshToken, expiresIn, user }
```

### Protecting Endpoints

Services use `JwtStrategy` (passport-jwt) to validate the `Authorization: Bearer <token>` header. The validated user (`{ id, email, tenantId, roles }`) is attached to the request.

---

## 9. On-Prem License System

### License File (.lic)

```json
{
  "payload": {
    "tenantId": "uuid",
    "startDate": "ISO-8601",
    "issuedAt": "ISO-8601",
    "expiresAt": "ISO-8601",
    "cycle": "ANNUALLY",
    "features": [{ "featureKey": "...", "featureName": "...", "quotaLimit": null }]
  },
  "signature": "RSA-SHA256-base64"
}
```

### Key Architecture

- **Private key** (RSA 2048, PKCS#8): Kept secret, signs licenses
- **Public key** (RSA SPKI): Shared with customers, verifies licenses
- Generated by: `npx ts-node tools/generate-license-keys.ts`
- Stored as Base64 in env vars: `ONPREM_LICENSE_PRIVATE_KEY`, `ONPREM_LICENSE_PUBLIC_KEY`

### Enforcement

- `OnPremLicenseGuard` (global, every request): If `ON_PREM=true`, validates `.lic` file. Blocks all endpoints if license is expired/invalid (except `/health` and `/on-prem/license/status`).
- `LicenseCronService`: Validates at startup + every day at midnight. Logs warnings/errors.
- `OnPremGuard`: Controls access to `/on-prem/*` endpoints (only accessible when `ON_PREM=true`).

---

## 10. Deployment Modes

### Local Development

- `pnpm install` → `prisma:generate` → `prisma:migrate:deploy` → `nx serve`
- All services run on localhost, PostgreSQL + Redis run locally
- Swagger available at `http://localhost:400X/api`

### Docker (Local Dev)

- `docker compose up -d` using `docker-compose.yml`
- Builds from source, `NODE_ENV=development`, `ON_PREM=false`
- Env file: `.env.docker`

### On-Prem (Customer Server)

- `docker compose --env-file .env.onprem -f docker-compose.onprem.yml up -d`
- Uses pre-built images from registry (`image:`, not `build:`)
- `NODE_ENV=production`, `ON_PREM=true`
- Requires `license.lic` volume mount + public key in env
- Env file: `.env.onprem`

### Cloud (SaaS)

- Same Docker images deployed to cloud platform (ECS/GKE/Cloud Run)
- `NODE_ENV=production`, `ON_PREM=false`
- Database: managed PostgreSQL (RDS/Cloud SQL)
- Redis: managed (ElastiCache/Memorystore)
- Env vars: cloud secrets manager
- No docker-compose — platform handles orchestration

---

## 11. Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - (required) |
| `NODE_ENV` | Runtime environment | `production` (in Dockerfile) |
| `ON_PREM` | Enable on-prem license mode | `false` |
| `JWT_SECRET` | JWT signing secret | `dev-secret` |
| `JWT_EXPIRATION` | Access token lifetime | `15m` |
| `JWT_REFRESH_EXPIRATION_DAYS` | Refresh token lifetime | `7` |
| `REDIS_HOST` | Redis hostname | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `USERS_SERVICE_HOST` | TCP host for users-service | `localhost` |
| `TENANT_SERVICE_HOST` | TCP host for tenant-service | `localhost` |
| `AUDIT_SERVICE_HOST` | TCP host for audit-service | `localhost` |
| `ONPREM_LICENSE_PRIVATE_KEY` | Base64 RSA private key (signing) | - |
| `ONPREM_LICENSE_PUBLIC_KEY` | Base64 RSA public key (validation) | - |
| `LICENSE_FILE_PATH` | Path to .lic file | `/opt/ix-copilot/license/license.lic` |
| `POSTGRES_PASSWORD` | PostgreSQL password (Docker) | - |
| `REGISTRY` | Docker registry URL (on-prem) | `ghcr.io/your-org` |
| `IMAGE_TAG` | Docker image version (on-prem) | `latest` |

---

## 12. Bootstrap Pattern (Every Service)

Every service follows the exact same `main.ts` pattern:

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,          // Strip unknown properties
    transform: true,          // Auto-transform to DTO class
    enableImplicitConversion: true,
  }));

  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger (auto-disabled in production)
  await setupSwagger(app, { title: 'Service Name', path: 'api' });

  // TCP microservice transport
  app.connectMicroservice({ transport: Transport.TCP, options: { host: '0.0.0.0', port: TCP_PORT } });
  await app.startAllMicroservices();

  // HTTP listener
  await app.listen(HTTP_PORT);
}
```

---

## 13. Dockerfile (Multi-Stage)

```
Stage 1: deps        → pnpm install (cached layer)
Stage 2: source      → COPY all source code (used by migrate service)
Stage 3: builder     → prisma generate + nx build (per service via SERVICE_NAME arg)
Stage 4: production  → node:20-alpine + node_modules + dist/main.js
```

Build any service: `docker build --build-arg SERVICE_NAME=tenant-service -t tenant-service .`
