# Infrastructure

## Guards

### AuthGuard (`src/guards/auth.guard.ts`)
- Extracts Bearer token from `Authorization` header
- Calls external auth service: `GET {AUTH_SERVICE_URL}/user/me`
- Attaches `AuthUser` to `request.user`
- Throws: `UnauthorizedException` (no token / expired), `ServiceUnavailableException` (auth service down)

### RolesGuard (`src/guards/roles.guard.ts`)
- Reads `ROLES_KEY` metadata set by `@Roles()` decorator
- If no roles required → allows access
- Compares `request.user.role` against required roles
- Throws: `UnauthorizedException` (no user), `ForbiddenException` (wrong role)

### OrgActivityGuard (`src/guards/org_activity.guard.ts`)
- Gets user from request, looks up their org via license
- Checks both `license.org.status === Active` AND `license.active === Active`
- Throws: `UnauthorizedException` (no user), `BadRequestException` (org/license not active)

---

## Decorators

### @CurrentUser (`src/common/decorators/current-user.decorator.ts`)
`createParamDecorator` — extracts `request.user` (or a specific key of `AuthUser`)

```ts
@CurrentUser() user: AuthUser
@CurrentUser('sub') userId: string
```

### @Roles (`src/common/decorators/roles.decorator.ts`)
`SetMetadata(ROLES_KEY, ...roles)` — used with `RolesGuard`

```ts
@Roles(USER_ROLES.ADMIN, USER_ROLES.SUPER_USER)
```

---

## Filters

### HttpExceptionFilter (`src/common/filters/http-exception.filter.ts`)
Catches all `HttpException`, returns:
```json
{ "success": false, "error": "message" }
```
Normalizes string/object/array error messages.

---

## Jobs & Queues

### Licenses Queue (`src/jobs/licenses/`)

**Queue name:** `licenses`

**LicensesJob** (`@Processor('licenses')`, extends `WorkerHost`):
- `process(job)` dispatches by `job.name`:
  - `check_expiring`: finds licenses expiring within 7 days, logs them (TODO: send notifications)
  - `disable_expired`: not implemented

**LicensesScheduler** (`@Injectable`):
- `@Cron('07 20 * * *')` — daily at 20:07 UTC, enqueues `check_expiring` job

### Orgs Queue (`src/jobs/orgs/`)

**Queue name:** `update-org`
**Default options:** 5 attempts, exponential backoff (3s delay), removeOnComplete

**UpdateOrgJob** (`@Processor('update-org')`, extends `WorkerHost`):
- Sends email notification via external mail service
- Generates HMAC SHA-256 `X-Signature` header
- POSTs to `{EMAIL_SERVICE_URL}/send-mail` with `{email, updated_data, type}`

**Job payload:**
```ts
type UpdateOrgEmailPayload = {
    email: string;
    updatedData: object;
    type: string;
};
```

### Bull Board Dashboard
- Available at `/queues` (Fastify adapter)
- Monitors: `licenses`, `update-org` queues

---

## Common Utilities

### ApiResponse (`src/common/api-response.ts`)
```ts
ApiResponse.ok<T>(data)    → { success: true, data }
ApiResponse.err(message)   → { success: false, message, statusCode }
```

### ApiErrors (`src/common/errors/api-errors.ts`)
All error message constants:
- `INTERNAL_SERVER_ERROR`, `TOKEN_NOT_PROVIDED`, `TOKEN_IS_EXPIRED`, `ACCESS_DENIED`
- `USER_NOT_FOUND`, `USER_ALREADY_EXIST`, `USER_NOT_FOUND_BY_PARAM(param)`
- `ORG_IS_ALREADY_EXIST`, `ORG_STATUS_IS_PENDING`, `ORG_NOT_FOUND_OR_INACTIVE`
- `TARIF_PLAN_NOT_FOUND`
- `LOCATION_IS_ALREADY_EXIST(name)`
- `TICKET_NOT_FOUND`, `TICKET_TYPE_NOT_FOUND`, `TICKET_ALREADY_EXIST`

### getErrorMessage (`src/common/errors/get-error-message.ts`)
Extracts error message from `unknown` (Error, string, or JSON.stringify fallback).

### Roles Constants (`src/common/constants/roles.constants.ts`)
```ts
USER_ROLES = { ADMIN: 'Admin', SUPER_USER: 'SuperUser' }
type UserRole = 'Admin' | 'SuperUser'
```

### Business Constants (`src/core/constants.ts`)
```ts
THROTTLE.DEFAULT_TTL = 60000        // 1 min
THROTTLE.DEFAULT_LIMIT = 100
THROTTLE.AUTH_TTL = 60000
THROTTLE.AUTH_LIMIT = 10
THROTTLE.BOOKING_TTL = 60000
THROTTLE.BOOKING_LIMIT = 5

BUSINESS_LIMITS.MAX_ACTIVE_BOOKINGS_PER_USER = 5
BUSINESS_LIMITS.MAX_GUESTS_PER_BOOKING = 20
BUSINESS_LIMITS.LICENSE_EXPARATION_DAYS = 604800000         // 7 days
BUSINESS_LIMITS.CREATE_LICENSE_EXPARATION_DAYS = 2592000000 // 30 days
```

### Mail Helper (`src/common/helpers/mail.helper.ts`)
```ts
generateMailXSignature(data: MailSignaturePayload): string
// HMAC SHA-256 of (method + path + timestamp + body) using MAIL_SECRET
```

---

## Global Services

### CommonHttpService (`src/common/http/http.service.ts`)
Wraps `@nestjs/axios` HttpService:
- `get<T>(url, token?): Promise<T>`
- `post<T>(url, body, token?, customHeaders?): Promise<T>`
- `patch<T>(url, body, token?): Promise<T>`

### AppLoggerService (`src/common/logger/logger.service.ts`)
Winston-based logger:
- Console transport (colorized)
- File transports per level: `debug.log`, `info.log`, `warn.log`, `error.log`
- Date-based directory: `logs/YYYY/MM/DD/`
- Methods: `log()`, `debug()`, `warn()`, `error()`, `setContext()`

### PrismaService (`src/prisma/prisma.service.ts`)
Extends `PrismaClient` with `PrismaPg` adapter:
- `onModuleInit()` — connects
- `onModuleDestroy()` — disconnects
- `runTransaction<T>(fn)` — wraps `$transaction`

### RedisService (`src/redis/redis.service.ts`)
Two ioredis clients (pub/sub separation):
- `publish(channel, message)`
- `subscribe(channel, handler)`
- `get(key)`, `set(key, value, ttlSeconds?)`, `del(key)`

---

## Types (`src/types/`)

| Type | Definition |
|---|---|
| `AuthUser` | `{ sub, email, login, name, role, active, sid }` |
| `OrgHashData` | `{ inn, kpp, name }` |
| `LicenseWithOrg` | `Prisma.LicenseGetPayload<{ include: { org: true } }>` |
| `PlanTier` | `enum { Basic, Medium, Pro }` |
| `CreateTicketInput` | `{ ticketId, orgId, typeId, requestedData, reason?, status, email, userExtId }` |

---

## Testing

**Test files:**
- `src/licenses/licenses.service.spec.ts`
- `src/orgs/orgs.service.spec.ts`
- `src/user/user.service.spec.ts`

**Mocks (`src/__mocks__/`):**
- Service mocks: `mockPrismaService`, `mockLoggerService`, `mockUserService`, `mockLicensesService`, `mockPlansService`
- Repository mocks: `mockUserRepository`, `mockOrgsRepository`, `mockLicensesRepository`, `mockPlansRepository`
- Fixtures: `mockAuthUser`, `mockCreateUser`, `mockOrganization`, `mockActiveOrgResponse`, `mockCreateOrgDto`, `mockCreateLocationDto`, `mockPlan`

**Run tests:**
```bash
npm test
npm run test:cov
```
