/*
  Warnings:

  - You are about to drop the `contractors` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[inn]` on the table `orgs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `address` to the `orgs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `director` to the `orgs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inn` to the `orgs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kpp` to the `orgs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `orgs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `orgs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `org_id` to the `users` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Activity" AS ENUM ('Active', 'Inactive', 'Closed');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('Pending', 'Confirmed', 'Cancelled', 'Completed');

-- AlterTable
ALTER TABLE "orgs" ADD COLUMN     "address" VARCHAR(255) NOT NULL,
ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "director" VARCHAR(255) NOT NULL,
ADD COLUMN     "inn" VARCHAR(12) NOT NULL,
ADD COLUMN     "kpp" VARCHAR(9) NOT NULL,
ADD COLUMN     "status" "Activity" NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "org_id" INTEGER NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;

-- DropTable
DROP TABLE "contractors";

-- CreateTable
CREATE TABLE "locations" (
    "id" SERIAL NOT NULL,
    "org_id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phone" TEXT,
    "status" "Activity" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" SERIAL NOT NULL,
    "location_id" INTEGER NOT NULL,
    "user_ext_id" TEXT NOT NULL,
    "guests_count" INTEGER NOT NULL,
    "status" "BookingStatus" NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "comment" TEXT,
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
CREATE UNIQUE INDEX "orgs_inn_key" ON "orgs"("inn");

-- CreateIndex
CREATE INDEX "orgs_status_idx" ON "orgs"("status");

-- CreateIndex
CREATE INDEX "users_org_id_idx" ON "users"("org_id");

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
