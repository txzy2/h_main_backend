# API Routes

All routes prefixed with `/api/v1`.

## Health Check

| Method | Route | Guards | Description |
|---|---|---|---|
| `GET` | `/` | — | Returns `"Hello World!"` |

## Organizations (`/orgs`)

| Method | Route | Guards | Roles | Description |
|---|---|---|---|---|
| `POST` | `/orgs/register` | AuthGuard | — | Register new organization |
| `GET` | `/orgs` | AuthGuard, OrgActivityGuard | — | Get org info + locations |
| `PATCH` | `/orgs/update` | AuthGuard, RolesGuard | SuperUser | Update organization |

### POST /orgs/register
**Body:** `CreateOrgDto`
```json
{
  "name": "string",
  "inn": "string (10-12 digits)",
  "kpp": "string (9 digits)",
  "director": "string",
  "phone_number": "string (RU phone, 10-11 digits)",
  "plan": "Basic | Medium | Pro"
}
```
**Response:** `{ success: true, data: Organization }` (status: 201)

**Flow:**
1. Creates organization (status: Pending)
2. Registers license for the org + plan
3. Creates user linked to the org
4. All inside a Prisma transaction

### GET /orgs
**Auth:** Required
**Response:** `{ success: true, data: Organization with locations }`

### PATCH /orgs/update
**Auth:** SuperUser required
**Body:** `UpdateOrgDto`
```json
{
  "hash": "string (org unique hash)",
  "ticket_id": "string",
  "update_data": { "inn?": "string", "kpp?": "string", "director?": "string", "name?": "string" }
}
```
**Response:** `{ success: true, data: "Орагнизация обновлена" }`

**Flow:**
1. Verifies org exists by hash
2. Verifies pending ticket exists
3. Updates the organization
4. Approves the ticket
5. Enqueues email notification job

## Plans (`/plans`)

| Method | Route | Guards | Description |
|---|---|---|---|
| `GET` | `/plans/` | — | List all tariff plans |

**Response:** `{ success: true, data: Plans[] }`

## Locations (`/locations`)

| Method | Route | Guards | Roles | Description |
|---|---|---|---|---|
| `POST` | `/locations/add` | AuthGuard, RolesGuard | Admin, SuperUser | Add locations for org |

**Body:** `CreateLocationDto`
```json
{
  "org_id": 1,
  "locations": [
    { "name": "string", "address": "string", "phone": "string", "active_places": 10 }
  ]
}
```
**Response:** `{ success: true, data: null }` (status: 201)

## Tickets (`/tickets`)

| Method | Route | Guards | Roles | Description |
|---|---|---|---|---|
| `GET` | `/tickets/query` | AuthGuard, RolesGuard | SuperUser | Filter tickets with pagination |
| `POST` | `/tickets/org/update-request` | AuthGuard, RolesGuard | Admin, SuperUser | Create org update ticket |

### GET /tickets/query
**Query params:** `limit?` (default 50), `offset?` (default 0), `org_hash?`

**Response:** `{ success: true, data: FilterTicketResponseDto[] }`
```json
[{
  "ticket_id": "uuid",
  "org_id": 1,
  "status": "Pending | InProgress | Approved | Rejected",
  "reason": "string",
  "requested_data": {},
  "type_name": "string",
  "created_at": "ISO date"
}]
```

### POST /tickets/org/update-request
**Body:** `UpdateOrgTicketRequestDto`
```json
{
  "org_hash": "string",
  "reason": "string",
  "ticket_type": "string",
  "email": "string",
  "data": { "inn?": "string", "kpp?": "string", "director?": "string", "name?": "string" }
}
```
**Response:** `{ success: true, data: { ticket_id: "uuid", message: "string" } }`

## System

| Route | Description |
|---|---|
| `/docs` | Swagger UI |
| `/queues` | Bull Board dashboard (BullMQ monitoring) |
