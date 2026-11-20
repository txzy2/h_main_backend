-- AlterTable
ALTER TABLE "location_tables" ADD COLUMN     "seats" INTEGER NOT NULL DEFAULT 4;

-- CreateTable
CREATE TABLE "location_floor_plans" (
    "id" SERIAL NOT NULL,
    "location_id" INTEGER NOT NULL,
    "width" INTEGER NOT NULL DEFAULT 1200,
    "height" INTEGER NOT NULL DEFAULT 800,
    "layout" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_by" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "location_floor_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "location_floor_plans_location_id_key" ON "location_floor_plans"("location_id");

-- AddForeignKey
ALTER TABLE "location_floor_plans" ADD CONSTRAINT "location_floor_plans_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
