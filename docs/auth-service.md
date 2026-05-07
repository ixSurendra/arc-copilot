# Auth Service

The auth service handles authentication, JWT token management, credential storage, password policies, MFA, SSO configuration, and login attempt tracking. It acts as the security gateway for the entire platform.

---

## Connection

| Transport  | Address            | Port   |
|------------|--------------------|--------|
| TCP (RPC)  | `0.0.0.0`          | `3001` |
| HTTP       | `http://localhost`  | `4001` |

---

## HTTP Endpoints

### Auth

| Method | Path             | Description |
|--------|------------------|-------------|
| POST   | `/auth/login`    | Authenticate with email + password + domain. Returns access token, refresh token, expiry, and user info. |
| POST   | `/auth/refresh`  | Exchange a refresh token for a new token pair. |
| POST   | `/auth/logout`   | Revoke all refresh tokens for a user. |

### Credentials

| Method | Path                                   | Description |
|--------|----------------------------------------|-------------|
| POST   | `/credentials/register`                | Register password or SSO credentials. |
| PATCH  | `/credentials/:userId/change-password` | Change user password. |

### MFA

| Method | Path                  | Description |
|--------|-----------------------|-------------|
| POST   | `/mfa/:userId/setup`  | Initialize MFA (generates secret key). |
| POST   | `/mfa/:userId/verify` | Verify MFA code to complete setup. |
| DELETE | `/mfa/:userId`        | Disable MFA for a user. |

### Auth Config

| Method | Path                                       | Description |
|--------|--------------------------------------------|-------------|
| GET    | `/auth-config/:tenantId`                   | Get tenant auth config. |
| POST   | `/auth-config`                             | Create tenant auth config. |
| PATCH  | `/auth-config/:tenantId`                   | Update tenant auth config. |
| GET    | `/auth-config/:tenantId/sso-providers`     | List SSO providers for tenant. |
| POST   | `/auth-config/sso-providers`               | Create SSO provider config. |
| PATCH  | `/auth-config/sso-providers/:id`           | Update SSO provider config. |

---

## TCP Patterns

| Pattern            | Type           | Description |
|--------------------|----------------|-------------|
| `validate_user`    | MessagePattern | Validate JWT token, return `{ valid, user }`. |
| `validate_token`   | MessagePattern | Validate JWT token, return `AuthUser` or null. |
| `get_auth_config`  | MessagePattern | Get tenant auth configuration. |

---

## Dependencies (Outbound TCP)

| Service         | Port | Patterns Used | Purpose |
|-----------------|------|---------------|---------|
| Tenant Service  | 3003 | `get_tenant`, `get_tenant_status` | Verify tenant exists and is active during login. |
| Users Service   | 3004 | `get_user_by_email`, `get_effective_roles` | Resolve user identity and fetch effective roles. |

---

## Effective Roles Integration

Both `login()` and `refreshTokens()` in `AuthService` call the users-service `get_effective_roles` TCP pattern (instead of the older `get_user_roles`). This ensures that the JWT token always contains the full, deduplicated set of roles a user holds -- including roles inherited through group membership.

### Login flow

1. Verify tenant exists and is active (via tenant-service).
2. Check account lockout status.
3. Resolve user by email (via users-service `get_user_by_email`).
4. Verify password with bcryptjs.
5. Fetch effective roles (via users-service `get_effective_roles`) -- returns direct + group-inherited roles, deduplicated.
6. Generate JWT access token with `{ sub, email, tenantId, roles }`.
7. Generate refresh token (random hex), store hash in auth_db.
8. Log successful login attempt.
9. Return `{ accessToken, refreshToken, expiresIn, user }`.

### Token refresh flow

1. Hash incoming refresh token with SHA-256.
2. Look up hash in auth_db `refresh_tokens` table.
3. Verify not expired and status is ACTIVE.
4. Revoke old refresh token.
5. Fetch current effective roles (via users-service `get_effective_roles`) so the new token reflects any role changes since the last login.
6. Issue new access + refresh tokens with up-to-date roles.
7. Return new token pair.

### JWT payload

```json
{
  "sub": "userId",
  "email": "userEmail",
  "tenantId": "tenantId",
  "roles": ["ADMIN", "USER"]
}
```

The `roles` array contains effective roles: the union of directly assigned roles and roles inherited from the user's groups, deduplicated by role ID.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `apps/auth-service/src/auth/auth.service.ts` | Core auth logic (`login`, `refreshTokens`, `logout`) |
| `apps/auth-service/src/auth/auth.controller.ts` | HTTP + TCP endpoints |
| `apps/auth-service/src/credentials/` | Credential management |
| `apps/auth-service/src/mfa/` | MFA setup, verify, disable |
| `apps/auth-service/src/auth-config/` | Per-tenant auth config + SSO providers |
| `apps/auth-service/src/strategies/` | JWT Passport strategy |
