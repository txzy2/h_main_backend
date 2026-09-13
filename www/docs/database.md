# Database (Prisma)

## Enums

| Enum | Values |
|---|---|
| `Activity` | `Active`, `Inactive`, `Pending`, `Closed` |
| `BookingStatus` | `Pending`, `Confirmed`, `Cancelled`, `Completed` |
| `RequestStatus` | `Pending`, `InProgress`, `Approved`, `Rejected` |

## Models

### User (`users`)

| Field | Type | Attributes |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `login` | String | unique |
| `name` | String | |
| `phoneNumber` | String | `@map("phone")`, VarChar(11) |
| `extId` | String | unique, `@map("ext_id")`, VarChar(64) |
| `orgId` | Int | `@map("org_id")` |
| `createdAt` | DateTime | default: now() |
| `updatedAt` | DateTime | default: now() |

**Relations:** `org` → Organization, `tickets` → Tickets[]
**Indexes:** `@@index([orgId])`

---

### Organization (`orgs`)

| Field | Type | Attributes |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `name` | String | unique |
| `inn` | String | unique, VarChar(12) |
| `kpp` | String | VarChar(9) |
| `director` | String | VarChar(255) |
| `status` | Activity | |
| `uniqueHash` | String | unique, `@map("unique_hash")`, VarChar(64) |
| `updatedBy` | String? | `@map("updated_by")`, VarChar(64) |
| `createdAt` | DateTime | default: now() |
| `updatedAt` | DateTime | @updatedAt |

**Relations:** `licenses` → License[], `locations` → Location[], `users` → User[], `tickets` → Tickets[]
**Indexes:** `@@index([status])`

---

### Location (`locations`)

| Field | Type | Attributes |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `uniqueHash` | String | unique, VarChar(64) |
| `orgId` | Int | `@map("org_id")` |
| `name` | String | VarChar(255) |
| `address` | String | VarChar(255) |
| `phone` | String? | VarChar(11) |
| `activePlaces` | Int | `@map("active_places")`, Integer |
| `status` | Activity | |
| `createdAt` | DateTime | default: now() |
| `updatedAt` | DateTime | @updatedAt |

**Relations:** `org` → Organization, `bookings` → Booking[]
**Indexes:** `@@index([orgId, status])`

---

### Booking (`bookings`)

| Field | Type | Attributes |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `locationId` | Int | `@map("location_id")` |
| `userExtId` | String | `@map("user_ext_id")`, VarChar(64) |
| `guestsCount` | Int | `@map("guests_count")` |
| `status` | BookingStatus | |
| `scheduledAt` | DateTime | `@map("scheduled_at")` |
| `comment` | String? | VarChar(255) |
| `createdAt` | DateTime | default: now() |
| `updatedAt` | DateTime | @updatedAt |

**Relations:** `location` → Location
**Indexes:** `@@index([locationId, scheduledAt])`, `@@index([userExtId])`, `@@index([status, scheduledAt])`

---

### License (`licenses`)

| Field | Type | Attributes |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `orgId` | Int | `@map("org_id")` |
| `planId` | Int | `@map("plan_id")` |
| `active` | Activity | |
| `createdAt` | DateTime | default: now() |
| `expiredAt` | DateTime | |

**Relations:** `org` → Organization, `plan` → Plans
**Indexes:** `@@index([orgId, active])`, `@@index([expiredAt])`

---

### Plans (`plans`)

| Field | Type | Attributes |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `name` | String | unique, VarChar(255) |
| `maxLocations` | Int | `@map("max_locations")` |
| `price` | Int | |
| `description` | String | VarChar(255) |

**Relations:** `licenses` → License[]

---

### TicketType (`ticket_types`)

| Field | Type | Attributes |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `alias` | String | unique, VarChar(64) |
| `name` | String | VarChar(255) |
| `isActive` | Boolean | default: true |

**Relations:** `tickets` → Tickets[]

---

### Tickets (`tickets`)

| Field | Type | Attributes |
|---|---|---|
| `id` | Int | PK, autoincrement |
| `ticketId` | String | unique, `@map("ticket_id")`, VarChar(64) |
| `orgId` | Int | `@map("org_id")` |
| `typeId` | Int | `@map("type_id")` |
| `requestedData` | Json? | `@map("requested_data")` |
| `status` | RequestStatus | default: Pending |
| `reason` | String? | Text |
| `email` | String | VarChar(255) |
| `userByExtId` | String | `@map("user_by_ext_id")`, VarChar(64) |
| `reviewedByExtId` | String? | `@map("reviewed_by_ext_id")`, VarChar(64) |
| `createdAt` | DateTime | default: now() |
| `updatedAt` | DateTime | @updatedAt |

**Relations:** `organization` → Organization, `type` → TicketType, `user` → User (via `userByExtId` → `extId`)
**Indexes:** `@@index([orgId, status])`, `@@index([typeId, status])`

---

## ER Diagram (text)

```
Organization 1──* License *──1 Plans
Organization 1──* Location 1──* Booking
Organization 1──* User 1──* Tickets
Organization 1──* Tickets *──1 TicketType
```

## Business Constants

| Constant | Value | Description |
|---|---|---|
| `LICENSE_EXPARATION_DAYS` | 604800000 ms (7 days) | Expiring license threshold |
| `CREATE_LICENSE_EXPARATION_DAYS` | 2592000000 ms (30 days) | New license expiration |
| `MAX_ACTIVE_BOOKINGS_PER_USER` | 5 | Booking limit per user |
| `MAX_GUESTS_PER_BOOKING` | 20 | Guest limit per booking |
