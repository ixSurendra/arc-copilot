# Audit Service

The audit service is the central event log for the platform. It records who did what, when, and on which resource. Other microservices emit fire-and-forget events to create audit logs, and can query the log via message patterns or HTTP.

---

## Connection

| Transport  | Address               | Port   |
|------------|-----------------------|--------|
| TCP (RPC)  | `0.0.0.0`             | `5002` |
| HTTP       | `http://localhost`    | `6002` |

The constants are exported from `@arc/shared`:

```ts
import { AUDIT_SERVICE_PORT, AUDIT_SERVICE_HTTP_PORT } from '@arc/shared';
```

---

## Registering the Client in Your Module

Use `ClientsModule.register` (static) or `ClientsModule.registerAsync` (config-driven):

```ts
import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { AUDIT_SERVICE, AUDIT_SERVICE_PORT } from '@arc/shared';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: AUDIT_SERVICE,
        transport: Transport.TCP,
        options: { host: 'audit-service', port: AUDIT_SERVICE_PORT },
      },
    ]),
  ],
})
export class YourModule {}
```

Inject the client in a service:

```ts
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { AUDIT_SERVICE } from '@arc/shared';

@Injectable()
export class YourService {
  constructor(
    @Inject(AUDIT_SERVICE) private readonly auditClient: ClientProxy,
  ) {}
}
```

---

## Imports from `@arc/shared`

Everything you need is exported from the shared library. Never define your own types locally.

```ts
import {
  // DTOs
  CreateAuditLogDto,
  QueryAuditLogDto,

  // Interfaces
  AuditLog,
  AuditLogWithDetail,
  PaginatedResponse,

  // Enum
  AuditLogStatus,

  // Constants
  AUDIT_SERVICE,
  AUDIT_SERVICE_PORT,
  AUDIT_SERVICE_HTTP_PORT,
} from '@arc/shared';
```

---

## Microservice Patterns

### 1. Emit an audit event (fire-and-forget)

**Pattern:** `audit_log_created` (EventPattern — no response expected)

Use this for the common case: record that something happened and move on. The audit service persists the log asynchronously.

```ts
import { CreateAuditLogDto, AuditLogStatus } from '@arc/shared';

const payload: CreateAuditLogDto = {
  tenantId: 'tenant-abc',         // required — isolates data per tenant
  userId: 'user-123',
  action: 'USER_LOGIN',
  resource: 'auth',
  resourceId: 'user-123',        // optional
  status: AuditLogStatus.SUCCESS, // optional, defaults to SUCCESS
  ipAddress: '192.168.1.1',      // optional
  userAgent: 'Mozilla/5.0',      // optional
  duration: 45,                   // optional, milliseconds
  source: 'web-app',              // optional, originating service
  oldValue: undefined,            // optional, previous resource state
  newValue: { role: 'admin' },   // optional, new resource state
  metadata: { browser: 'Chrome' }, // optional, free-form context
};

this.auditClient.emit('audit_log_created', payload);
```

> Do **not** `subscribe()` or `await` this call — it is fire-and-forget.

---

### 2. Query audit logs (request-response)

**Pattern:** `{ cmd: 'get_audit_logs' }` (MessagePattern — returns paginated list)

```ts
import { QueryAuditLogDto, AuditLog, PaginatedResponse } from '@arc/shared';
import { lastValueFrom } from 'rxjs';

const query: QueryAuditLogDto = {
  tenantId: 'tenant-abc', // optional — strongly recommended to scope results
  userId: 'user-123',     // optional
  action: 'USER_LOGIN',   // optional
  resource: 'auth',       // optional
  resourceId: 'res-456',  // optional
  status: AuditLogStatus.SUCCESS, // optional
  startDate: '2026-01-01T00:00:00.000Z', // optional, ISO 8601
  endDate: '2026-12-31T23:59:59.999Z',   // optional, ISO 8601
  page: 1,   // optional, default 1
  limit: 20, // optional, default 20, max 100
};

const result = await lastValueFrom(
  this.auditClient.send<PaginatedResponse<AuditLog>>(
    { cmd: 'get_audit_logs' },
    query,
  ),
);

// result shape:
// {
//   data: AuditLog[],
//   total: number,
//   page: number,
//   limit: number,
//   totalPages: number,
// }
```

---

### 3. Get a single audit log by ID (request-response)

**Pattern:** `{ cmd: 'get_audit_log_by_id' }` (MessagePattern — returns full log with detail)

```ts
import { AuditLogWithDetail } from '@arc/shared';
import { lastValueFrom } from 'rxjs';

const log = await lastValueFrom(
  this.auditClient.send<AuditLogWithDetail>(
    { cmd: 'get_audit_log_by_id' },
    { id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' },
  ),
);

// log.detail contains oldValue, newValue, metadata (may be null)
```

> Throws an RPC exception (mapped from `NotFoundException`) if the ID does not exist.

---

## HTTP Endpoints

The HTTP API is primarily for internal tooling, dashboards, and Swagger exploration. For service-to-service communication prefer the TCP patterns above.

### `GET /audit-logs`

Returns a paginated list of audit logs. All query parameters are optional.

| Parameter    | Type     | Description                          | Default |
|--------------|----------|--------------------------------------|---------|
| `tenantId`   | string   | Filter by tenant ID                  | —       |
| `userId`     | string   | Filter by user ID                    | —       |
| `action`     | string   | Filter by action string              | —       |
| `resource`   | string   | Filter by resource type              | —       |
| `resourceId` | string   | Filter by specific resource ID       | —       |
| `status`     | string   | `SUCCESS` \| `FAILURE` \| `PARTIAL` | —       |
| `startDate`  | ISO 8601 | Records on or after this date        | —       |
| `endDate`    | ISO 8601 | Records on or before this date       | —       |
| `page`       | number   | Page number (1-indexed)              | `1`     |
| `limit`      | number   | Items per page (max 100)             | `20`    |

**Response:**

```json
{
  "data": [
    {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "tenantId": "tenant-abc",
      "userId": "user-123",
      "action": "USER_LOGIN",
      "resource": "auth",
      "resourceId": "user-123",
      "status": "SUCCESS",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0",
      "duration": 45,
      "source": "web-app",
      "timestamp": "2026-03-03T10:00:00.000Z"
    }
  ],
  "total": 142,
  "page": 1,
  "limit": 20,
  "totalPages": 8
}
```

---

### `GET /audit-logs/:id`

Returns a single audit log with its detail payload.

| Segment | Type   | Description          |
|---------|--------|----------------------|
| `id`    | UUID   | Audit log identifier |

**Response:**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "tenantId": "tenant-abc",
  "userId": "user-123",
  "action": "ROLE_CHANGED",
  "resource": "users",
  "resourceId": "user-456",
  "status": "SUCCESS",
  "ipAddress": "10.0.0.1",
  "userAgent": "Mozilla/5.0",
  "duration": 120,
  "source": "admin-service",
  "timestamp": "2026-03-03T10:00:00.000Z",
  "detail": {
    "oldValue": { "role": "user" },
    "newValue": { "role": "admin" },
    "metadata": { "changedBy": "admin-001" }
  }
}
```

Returns `404` if the ID does not exist.

---

## Data Shapes

### `AuditLog` — list item (no detail payload)

```ts
interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  action: string;
  resource: string;
  resourceId?: string | null;
  status: AuditLogStatus;          // 'SUCCESS' | 'FAILURE' | 'PARTIAL'
  ipAddress?: string | null;
  userAgent?: string | null;
  duration?: number | null;        // milliseconds
  source?: string | null;
  timestamp: Date;
}
```

### `AuditLogWithDetail` — single record (includes detail payload)

```ts
interface AuditLogDetail {
  oldValue?: Record<string, unknown> | null;
  newValue?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
}

interface AuditLogWithDetail extends AuditLog {
  detail: AuditLogDetail | null;
}
```

### `PaginatedResponse<T>`

```ts
interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### `AuditLogStatus`

```ts
enum AuditLogStatus {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL',
}
```

---

## `CreateAuditLogDto` Field Reference

| Field        | Type                | Required | Description                                       |
|--------------|---------------------|----------|---------------------------------------------------|
| `tenantId`   | `string`            | Yes      | Tenant identifier — all logs are scoped to this  |
| `userId`     | `string`            | Yes      | ID of the user who triggered the action           |
| `action`     | `string`            | Yes      | Free-form action label, e.g. `USER_LOGIN`         |
| `resource`   | `string`            | Yes      | Resource type, e.g. `auth`, `users`, `orders`     |
| `resourceId` | `string`            | No       | ID of the affected resource instance              |
| `status`     | `AuditLogStatus`    | No       | Outcome; defaults to `SUCCESS`                    |
| `oldValue`   | `Record<string, unknown>` | No | Previous state of the resource                  |
| `newValue`   | `Record<string, unknown>` | No | New state of the resource                       |
| `metadata`   | `Record<string, unknown>` | No | Free-form contextual data (browser, session, …) |
| `ipAddress`  | `string`            | No       | Client IP address                                 |
| `userAgent`  | `string`            | No       | HTTP user agent string                            |
| `duration`   | `number`            | No       | Action duration in milliseconds (>= 0)            |
| `source`     | `string`            | No       | Name of the originating service or module         |

---

## Common Action Naming Conventions

Use a consistent `NOUN_VERB` or `RESOURCE_ACTION` pattern so logs remain queryable. Suggested conventions:

| Category       | Action examples                                   |
|----------------|---------------------------------------------------|
| Authentication | `USER_LOGIN`, `USER_LOGOUT`, `TOKEN_REFRESH`      |
| User mgmt      | `USER_CREATED`, `USER_UPDATED`, `USER_DELETED`    |
| Roles/Perms    | `ROLE_ASSIGNED`, `PERMISSION_REVOKED`             |
| Data access    | `RECORD_VIEWED`, `EXPORT_TRIGGERED`               |
| Failures       | `LOGIN_FAILED`, `PAYMENT_FAILED`                  |

---

## Health Check

The audit service exposes a standard health endpoint:

```
GET http://localhost:6002/health
```

Returns `200 OK` when the service and its database connection are healthy.

---

## Environment Variables

| Variable               | Required | Default       | Description                   |
|------------------------|----------|---------------|-------------------------------|
| `DATABASE_URL`         | Yes      | —             | PostgreSQL connection string  |
| `NODE_ENV`             | No       | `development` | Runtime environment           |
| `AUDIT_SERVICE_PORT`   | No       | `5002`        | TCP microservice port         |
| `AUDIT_SERVICE_HTTP_PORT` | No    | `6002`        | HTTP server port              |

---

## Swagger UI

When `NODE_ENV !== 'production'` the interactive API docs are available at:

```
http://localhost:6002/api
```
