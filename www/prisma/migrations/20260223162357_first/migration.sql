-- CreateEnum
CREATE TYPE "Activity" AS ENUM ('Active', 'Inactive', 'Pending', 'Closed');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('Pending', 'Confirmed', 'Cancelled', 'Completed');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "login" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" VARCHAR(11) NOT NULL,
    "ext_id" VARCHAR(64) NOT NULL,
    "org_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orgs" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "inn" VARCHAR(12) NOT NULL,
    "kpp" VARCHAR(9) NOT NULL,
    "director" VARCHAR(255) NOT NULL,
    "status" "Activity" NOT NULL,
    "unique_hash" VARCHAR(64) NOT NULL,
    "updated_by" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orgs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "unique_hash" VARCHAR(64) NOT NULL,
    "org_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(11),
    "active_places" INTEGER NOT NULL,
    "status" "Activity" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "location_id" INTEGER NOT NULL,
    "user_ext_id" VARCHAR(64) NOT NULL,
    "guests_count" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "comment" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "active" "Activity" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expired_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "max_locations" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "description" VARCHAR(255) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_types" (
    "id" SERIAL NOT NULL,
    "alias" VARCHAR(64) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ticket_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" SERIAL NOT NULL,
    "ticket_id" VARCHAR(64) NOT NULL,
    "org_id" INTEGER NOT NULL,
    "type_id" INTEGER NOT NULL,
    "requested_data" JSONB,
    "status" "RequestStatus" NOT NULL DEFAULT 'Pending',
    "reason" TEXT,
    "reviewed_by_ext_id" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_login_key" ON "users"("login");

-- CreateIndex
CREATE UNIQUE INDEX "users_ext_id_key" ON "users"("ext_id");

-- CreateIndex
CREATE INDEX "users_org_id_idx" ON "users"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "orgs_name_key" ON "orgs"("name");

-- CreateIndex
CREATE UNIQUE INDEX "orgs_inn_key" ON "orgs"("inn");

-- CreateIndex
CREATE UNIQUE INDEX "orgs_unique_hash_key" ON "orgs"("unique_hash");

-- CreateIndex
CREATE INDEX "orgs_status_idx" ON "orgs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "locations_unique_hash_key" ON "locations"("unique_hash");

-- CreateIndex
CREATE INDEX "locations_org_id_status_idx" ON "locations"("org_id", "status");

-- CreateIndex
CREATE INDEX "bookings_location_id_scheduled_at_idx" ON "bookings"("location_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "bookings_user_ext_id_idx" ON "bookings"("user_ext_id");

-- CreateIndex
CREATE INDEX "bookings_status_scheduled_at_idx" ON "bookings"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "licenses_org_id_active_idx" ON "licenses"("org_id", "active");

-- CreateIndex
CREATE INDEX "licenses_expired_at_idx" ON "licenses"("expired_at");

-- CreateIndex
CREATE UNIQUE INDEX "plans_name_key" ON "plans"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ticket_types_alias_key" ON "ticket_types"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_id_key" ON "tickets"("ticket_id");

-- CreateIndex
CREATE INDEX "tickets_org_id_status_idx" ON "tickets"("org_id", "status");

-- CreateIndex
CREATE INDEX "tickets_type_id_status_idx" ON "tickets"("type_id", "status");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "licenses" ADD CONSTRAINT "licenses_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "ticket_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
