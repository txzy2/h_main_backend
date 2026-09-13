# Modules

## OrgsModule

**File:** `src/orgs/orgs.module.ts`
**Imports:** UserModule, LicensesModule, PlansModule, CommonHttpModule, BullModule (update-org queue)
**Exports:** OrgsService

### OrgsController (`@Controller('orgs')`)

| Method | Route | Guards | Roles |
|---|---|---|---|
| `POST` | `/register` | AuthGuard | — |
| `GET` | `/` | AuthGuard, OrgActivityGuard | — |
| `PATCH` | `/update` | AuthGuard, RolesGuard | SuperUser |

### OrgsService

| Method | Returns | Description |
|---|---|---|
| `getOrgInfo(user)` | OrgResponseDto | Org + locations for authenticated user |
| `getActiveOrg(orgId)` | OrgResponseDto | Active org by ID or throws |
| `ensureOrgExistsByHash(hash)` | Organization | Finds active org by uniqueHash |
| `generateOrgHashData(hashData)` | string | SHA-256 of `name:inn:kpp` |
| `validateOrgHashData(hash, hashData)` | boolean | Validates hash matches data |
| `ensureUserBelongsToOrgOrThrow(userId, orgId)` | void | Checks user belongs to org |
| `updateOrgOrThrow(data)` | void | Updates org by hash |
| `getOrgByParamsOrThrow(params)` | Organization | Finds org by arbitrary params |

### OrgsRepository

| Method | Returns |
|---|---|
| `findById(id)` | Organization \| null |
| `findOrgInfoById(orgId)` | OrgResponseDto \| null (includes locations) |
| `checkExistByParams(param)` | Organization \| null |
| `create(org, hash, tx?)` | Organization (status: Pending) |
| `update(org, tx?)` | Organization (by uniqueHash) |

### CreateOrgUseCase

`execute(dto: CreateOrgDto, user: AuthUser): Promise<Organization>`

Inside a Prisma transaction:
1. Creates organization (status: Pending)
2. Registers license for the org + plan
3. Creates user linked to the org
4. On P2002 conflict → throws `ORG_IS_ALREADY_EXIST`

### UpdateOrgUseCase

`execute(dto: UpdateOrgDto, user: AuthUser): Promise<string>`

1. Verifies org exists by hash
2. Verifies pending ticket exists
3. Updates the organization
4. Approves the ticket
5. Enqueues `update-org` job (email notification)

### DTOs

**CreateOrgDto:** `name`, `inn`, `kpp`, `director`, `phone_number` (RU phone), `plan` (enum: Basic/Medium/Pro)

**UpdateOrgDto:** `hash` (required), `ticket_id` (required), `update_data?` (PartialType of CreateOrgDto)

**OrgResponseDto:** Organization with `locations` included

---

## LicensesModule

**File:** `src/licenses/licenses.module.ts`
**Imports:** PrismaModule
**Exports:** LicensesService

### LicensesService

| Method | Returns | Description |
|---|---|---|
| `getExpiringLicenses()` | LicenseWithOrg[] | Licenses expiring within 7 days |
| `getLicenseByOrg(orgId)` | LicenseWithOrg | License by org ID (includes org) |
| `registrateLicense(orgId, planId, tx?)` | boolean | Creates license (Pending, 30-day expiry) |

### LicensesRepository

| Method | Returns |
|---|---|
| `findExpiringLicenses()` | LicenseWithOrg[] |
| `register(orgId, planId, tx?)` | boolean |
| `getLicense(orgId)` | LicenseWithOrg \| null |

---

## PlansModule

**File:** `src/plans/plans.module.ts`
**Exports:** PlansService

### PlansController (`@Controller('plans')`)

| Method | Route | Guards |
|---|---|---|
| `GET` | `/` | — |

### PlansService

| Method | Returns | Description |
|---|---|---|
| `getPlans()` | Plans[] | All plans |
| `getByName(name)` | Plans | Plan by name or throws |

### PlansRepository

| Method | Returns |
|---|---|
| `findByName(name)` | Plans \| null |
| `getPlans()` | Plans[] |

---

## UserModule

**File:** `src/user/user.module.ts`
**Exports:** UserService

### UserController (`@Controller('user')`)
No routes defined (service-only module).

### UserService

| Method | Returns | Description |
|---|---|---|
| `createUser(user, tx?)` | void | Creates user; throws if exists |
| `checkExistUser(params, tx?)` | boolean | Checks if user exists |
| `getUserByParam(param, tx?)` | User | Gets user or throws |

### UsersRepository

| Method | Returns |
|---|---|
| `create(user, tx?)` | void |
| `checkExistByParams(param, tx?)` | User \| null |
| `findUserByParam(param, tx?)` | User \| null |

### CreateUserDto
`name`, `login`, `phoneNumber` (10-11 chars, RU), `extId`, `orgId`

---

## LocationsModule

**File:** `src/locations/locations.module.ts`
**Imports:** UserModule, OrgsModule

### LocationsController (`@Controller('locations')`)

| Method | Route | Guards | Roles |
|---|---|---|---|
| `POST` | `/add` | AuthGuard, RolesGuard | Admin, SuperUser |

### LocationsService

| Method | Returns | Description |
|---|---|---|
| `addLocationForOrg(data, user)` | void | Validates user+org, generates hashes, bulk inserts |
| `generateUniqueLocationHash(orgId, locData)` (private) | string | SHA-256 of `orgId:name:phone` |

### LocationsRepository

| Method | Returns |
|---|---|
| `findLocationByParams(params, tx?)` | boolean |
| `createLocation(locData, orgId, uniqueHash, tx?)` | Location |
| `createManyLocations(data[], orgId, tx?)` | void (skipDuplicates) |

### CreateLocationDto
`org_id: number`, `locations: ReqLocation[]` where each has `name`, `address`, `phone`, `active_places` (max 50)

---

## TicketsModule

**File:** `src/tickets/tickets.module.ts`
**Imports:** OrgsModule, PrismaModule
**Exports:** TicketsService, TicketTypesService

### TicketsController (`@Controller('tickets')`)

| Method | Route | Guards | Roles |
|---|---|---|---|
| `GET` | `/query` | AuthGuard, RolesGuard | SuperUser |
| `POST` | `/org/update-request` | AuthGuard, RolesGuard | Admin, SuperUser |

### TicketsService

| Method | Returns | Description |
|---|---|---|
| `getOrgRequestTicketByParamsOrThrow(params, tx?)` | Tickets | Gets ticket or throws |
| `getTicketByParams(params, tx?)` | Tickets \| null | Gets ticket by params |
| `createUpdateOrgTicket(data, ticketTypeId, orgId, userExtId, tx?)` | Tickets | Creates ticket with UUID |
| `getQueryTickets(data)` | FilterTicketResponseDto[] | Filtered + paginated tickets |
| `updateTicket(ticketId, params, tx?)` | void | Updates ticket by ticketId |

### TicketTypesService

| Method | Returns | Description |
|---|---|---|
| `getTicketTypeByParamsOrThrow(params, tx?)` | TicketType | Gets ticket type or throws |

### TicketsRepository

| Method | Returns |
|---|---|
| `findByParams(params, tx?)` | Tickets \| null |
| `findWithLimits(data, orgId?, tx?)` | TicketsWithType[] |
| `create(data, tx?)` | Tickets \| null |
| `update(ticketId, data, tx?)` | Tickets |

### TicketTypesRepository

| Method | Returns |
|---|---|
| `getTicketTypeByParam(params, tx?)` | TicketType \| null |

### UpdateOrgTicketUseCase

`execute(data, user): Promise<BaseTicketCreateResponseDto>`

1. Ensures org exists by hash
2. Ensures user belongs to org
3. Gets ticket type with alias `org.update`
4. Checks no duplicate ticket exists
5. Creates the ticket
6. Returns `{ticket_id, message}`

### DTOs

**UpdateOrgTicketRequestDto:** `org_hash`, `reason`, `ticket_type`, `email`, `data: { inn?, kpp?, director?, name? }`

**FilterTicketsRequestQueryDto:** `limit?` (50), `offset?` (0), `org_hash?`

**FilterTicketResponseDto:** `ticket_id`, `org_id`, `status`, `reason`, `requested_data`, `type_name`, `created_at`

**BaseTicketCreateResponseDto:** `ticket_id`, `message`
