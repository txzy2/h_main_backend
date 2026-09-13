# HookahBooking Main Backend

Backend service for a hookah booking platform. Manages organizations, locations, licenses/plans, tickets (approval workflows), users, and bookings.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | NestJS 11.x on Fastify |
| Runtime | Node.js (Bun has module deduplication issues with NestJS) |
| Language | TypeScript 5.7+ |
| Database | PostgreSQL 16 via Prisma 7.4 (`@prisma/adapter-pg`) |
| Queue | BullMQ 5.x + Redis (ioredis) |
| API Docs | Swagger at `/docs` |
| Logging | Winston (custom `AppLoggerService`) |
| Testing | Jest 30.x + ts-jest |

## Quick Start

```bash
npm install
npx prisma migrate dev
npm run start:dev
```

## Project Structure

```
src/
├── main.ts                  # App bootstrap (Fastify, pipes, filters, swagger)
├── app.module.ts            # Root module
├── core/                    # Config, constants, bull-board
├── common/                  # Shared: ApiResponse, errors, decorators, logger, http
├── guards/                  # AuthGuard, RolesGuard, OrgActivityGuard
├── prisma/                  # PrismaService (global)
├── redis/                   # RedisService (global, pub/sub + cache)
├── orgs/                    # Organizations CRUD + use-cases
├── licenses/                # License management
├── plans/                   # Tariff plans
├── user/                    # User management
├── locations/               # Venues/locations
├── tickets/                 # Approval workflow tickets
├── jobs/                    # BullMQ processors + cron schedulers
│   ├── licenses/            # Expiring license checks
│   └── orgs/                # Org update email notifications
├── types/                   # Shared TypeScript types
└── __mocks__/               # Jest mocks + fixtures
```

## Key Files

| File | Purpose |
|---|---|
| [Architecture](./architecture.md) | Patterns, module structure, dependency graph |
| [API Routes](./api.md) | All HTTP endpoints with guards and roles |
| [Database](./database.md) | Prisma schema, models, relations, enums |
| [Modules](./modules.md) | Every module: services, repositories, use-cases, DTOs |
| [Infrastructure](./infrastructure.md) | Guards, decorators, jobs, config, utilities |
