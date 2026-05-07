# Users Service

The users service manages user accounts, roles, groups, modules, and permissions. It is the central RBAC engine for the platform. Other services (notably auth-service) communicate with it over TCP to resolve user identities and role assignments.

---

## Connection

| Transport  | Address            | Port   |
|------------|--------------------|--------|
| TCP (RPC)  | `0.0.0.0`          | `5004` |
| HTTP       | `http://localhost`  | `6004` |

---

## TCP Patterns

| Pattern               | Type             | Description |
|-----------------------|------------------|-------------|
| `get_user_by_id`      | MessagePattern   | Fetch user by numeric ID |
| `get_user_by_email`   | MessagePattern   | Fetch user by email within a tenant |
| `get_user_roles`      | MessagePattern   | Get directly assigned roles for a user |
| `get_effective_roles` | MessagePattern   | Get effective roles (direct + group-inherited, deduplicated) |
| `check_permission`    | MessagePattern   | Check if a role has a specific module-permission |
| `get_user_effective_permissions` | MessagePattern | Get effective permissions for a user across all modules |

---

## Effective Roles

The `get_effective_roles` TCP pattern was introduced to give callers a single, deduplicated list of all roles a user holds -- both roles assigned directly to the user **and** roles inherited through group membership.

### How it works

1. `UsersController` receives `{ cmd: 'get_effective_roles' }` with payload `{ id: number }`.
2. `UsersService.getEffectiveRoles(id)` is called.
3. `UsersRepository.findByIdWithEffectiveRoles(id)` performs a single Prisma query that includes:
   - `userRoles` (direct role assignments)
   - `groups -> groupRoles` (roles assigned to each group the user belongs to)
4. The service merges both lists, deduplicates by role ID, and returns `{ roles: Array<{ id, roleName }> }`.

### Edge cases

- User has no groups: only direct roles are returned.
- Group has no roles: that group is safely skipped.
- Duplicate roles across direct and group assignments: deduplicated by role ID.
- User not found: throws `NotFoundException`.

### Consumers

- **auth-service** -- both `login()` and `refreshTokens()` call `get_effective_roles` to populate the JWT `roles` claim.

---

## Effective Permissions

The `get_user_effective_permissions` TCP pattern returns the full set of module-level permissions a user holds, derived from all their effective roles (direct + group-inherited).

### How it works

1. `UsersController` receives `{ cmd: 'get_user_effective_permissions' }` with payload `{ userId: number }`.
2. `UsersService.getEffectivePermissions(userId)` is called.
3. The service first calls `getEffectiveRoles(userId)` to obtain the merged, deduplicated list of direct + group-inherited roles.
4. `UsersRepository.findPermissionsByRoleIds(roleIds)` queries `RoleModulePermission` with the associated module and permission details for all role IDs.
5. The service deduplicates permissions per module and returns the result in two shapes:
   - `modules[]` — array of `{ moduleId, moduleKey, moduleName, permissions[] }`, intended for rendering sidebar menus.
   - `permissionMap` — object keyed by `moduleKey` with an array of permission names, intended for fast O(1) access checks in route guards.

### Response format

```json
{
  "modules": [
    {
      "moduleId": 1,
      "moduleKey": "user_management",
      "moduleName": "User Management",
      "permissions": ["create", "delete", "read", "update"]
    }
  ],
  "permissionMap": {
    "user_management": ["create", "delete", "read", "update"]
  }
}
```

### Edge cases

- User has no roles: returns empty `modules` and empty `permissionMap`.
- Role has no module-permission assignments: that role is safely skipped.
- Duplicate permissions across multiple roles for the same module: deduplicated.
- User not found: throws `NotFoundException`.

### Consumers

- **admin-portal** — `GET /admin/users/me/permissions` reads `userId` from the JWT and proxies to this TCP pattern. Used by admin-ui to populate sidebar menus and enforce route-level permission checks.

---

## Key Source Files

| File | Purpose |
|------|---------|
| `apps/users-service/src/users/users.controller.ts` | TCP + HTTP endpoints |
| `apps/users-service/src/users/users.service.ts` | Business logic including `getEffectiveRoles()` and `getEffectivePermissions()` |
| `apps/users-service/src/users/users.repository.ts` | Prisma queries including `findByIdWithEffectiveRoles()` and `findPermissionsByRoleIds()` |
| `apps/users-service/src/roles/` | Role CRUD |
| `apps/users-service/src/groups/` | Group CRUD and group-role assignments |
| `apps/users-service/src/modules/` | Module and permission management |
