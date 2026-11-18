-- CreateEnum
CREATE TYPE "BookingActionType" AS ENUM ('Created', 'Extended', 'Closed', 'Cancelled');

-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "duration_minutes" INTEGER NOT NULL DEFAULT 120;

-- CreateTable
CREATE TABLE "booking_actions" (
    "id" SERIAL NOT NULL,
    "booking_id" INTEGER NOT NULL,
    "type" "BookingActionType" NOT NULL,
    "user_ext_id" VARCHAR(64) NOT NULL,
    "minutes" INTEGER,
    "amount" INTEGER,
    "comment" VARCHAR(500),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "booking_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "booking_actions_booking_id_created_at_idx" ON "booking_actions"("booking_id", "created_at");

-- AddForeignKey
ALTER TABLE "booking_actions" ADD CONSTRAINT "booking_actions_booking_id_fkey" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
