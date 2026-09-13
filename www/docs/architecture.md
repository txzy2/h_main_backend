# Architecture

## Patterns

### 1. Repository Pattern
Every data-access module has a repository with:
- **Interface** defining the contract (e.g., `OrgsRepositoryInterface`)
- **Symbol injection token** (e.g., `ORGS_REPOSITORY`)
- **Implementation** using Prisma

```ts
// Token
export const ORGS_REPOSITORY = Symbol('ORGS_REPOSITORY');

// Interface
export interface OrgsRepositoryInterface {
    findById(id: number): Promise<Organization | null>;
    create(org: CreateOrgDto, hash: string, tx?: Prisma.TransactionClient): Promise<Organization>;
    // ...
}

// Module registration
providers: [{ provide: ORGS_REPOSITORY, useClass: OrgsRepository }]
```

### 2. Use-Case Pattern
Complex business flows are extracted into dedicated use-case classes:
- `CreateOrgUseCase` — transactional org + license + user creation
- `UpdateOrgUseCase` — org update + ticket approval + email queue
- `UpdateOrgTicketUseCase` — ticket creation with validation

### 3. Transaction Support
All repositories accept optional `Prisma.TransactionClient` parameter. Multi-step operations use `prisma.$transaction()`.

### 4. External Auth
Authentication is delegated to an external auth service (`AUTH_SERVICE_URL/user/me`). This service only validates JWT tokens — it does not issue them.

### 5. Queue-Based Async Processing
Email notifications are sent via BullMQ queues with retry logic (5 attempts, exponential backoff).

### 6. Global Modules
`LoggerModule`, `RedisModule`, `CommonHttpModule` are `@Global()` — available everywhere without explicit import.

### 7. Cron Scheduling
`@nestjs/schedule` for periodic tasks (license expiration checks at 20:07 UTC daily).

---

## Module Dependency Graph

```
AppModule
├── ConfigModule (global, .env)
├── PrismaModule
├── LoggerModule (global)
├── RedisModule (global)
├── CommonHttpModule (global)
├── BullModule.forRootAsync (Redis connection)
├── BullBoardModule (/queues dashboard)
├── ScheduleModule
├── OrgsModule
│   ├── UserModule
│   ├── LicensesModule
│   │   └── PrismaModule
│   ├── PlansModule
│   ├── CommonHttpModule
│   └── BullModule (update-org queue)
├── PlansModule
├── LicensesModule
├── UserModule
├── LocationsModule
│   ├── UserModule
│   └── OrgsModule
├── TicketsModule
│   ├── OrgsModule
│   └── PrismaModule
├── LicensesJobModule
│   └── LicensesModule
└── OrgsJobModule
    └── OrgsModule
```

---

## Request Lifecycle

```
Client Request
    ↓
Fastify HTTP Server
    ↓
Global Prefix: /api/v1
    ↓
Guards (AuthGuard → RolesGuard → OrgActivityGuard)
    ↓
Controller (route handler)
    ↓
Service (business logic)
    ↓
Repository (Prisma queries)
    ↓
PostgreSQL
```

---

## Configuration

All config via `.env`, validated with Joi:

| Variable | Type | Required | Description |
|---|---|---|---|
| `APP_PORT` | number | No (default: 3000) | Server port |
| `DATABASE_URL` | string | Yes | PostgreSQL connection string |
| `REDIS_URL` | string | Yes | Redis connection string |
| `AUTH_SERVICE_URL` | string | Yes | External auth service URL |
| `EMAIL_SERVICE_URL` | string | Yes | External email service URL |
| `MAIL_SECRET` | string | Yes | HMAC secret for mail signing |

Config shape in code:
```ts
{
  port: number,
  services: { auth_service_url: string, mail_service_url: string },
  database: { url: string },
  redis: { url: string },
  secrets: { mail: string }
}
```
