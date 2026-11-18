-- AlterTable
ALTER TABLE "bookings" ADD COLUMN     "amount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "guest_name" VARCHAR(255),
ADD COLUMN     "guest_phone" VARCHAR(20),
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "seated_at" TIMESTAMP(3),
ADD COLUMN     "table_id" INTEGER;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "position" VARCHAR(100);

-- CreateTable
CREATE TABLE "location_tables" (
    "id" SERIAL NOT NULL,
    "location_id" INTEGER NOT NULL,
    "name" VARCHAR(255) DEFAULT '',

    CONSTRAINT "location_tables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shifts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "org_id" INTEGER NOT NULL,
    "starts_at" TIMESTAMP(3) NOT NULL,
    "ends_at" TIMESTAMP(3),
    "bookings_goal" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "shifts_org_id_starts_at_idx" ON "shifts"("org_id", "starts_at");

-- CreateIndex
CREATE INDEX "shifts_user_id_starts_at_idx" ON "shifts"("user_id", "starts_at");

-- CreateIndex
CREATE INDEX "bookings_table_id_idx" ON "bookings"("table_id");

-- CreateIndex
CREATE INDEX "bookings_guest_phone_idx" ON "bookings"("guest_phone");

-- CreateIndex
CREATE INDEX "bookings_scheduled_at_idx" ON "bookings"("scheduled_at");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_table_id_fkey" FOREIGN KEY ("table_id") REFERENCES "location_tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "location_tables" ADD CONSTRAINT "location_tables_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shifts" ADD CONSTRAINT "shifts_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
