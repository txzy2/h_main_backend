/*
  Warnings:

  - A unique constraint covering the columns `[unique_hash]` on the table `locations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `unique_hash` to the `locations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "unique_hash" VARCHAR(64) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "locations_unique_hash_key" ON "locations"("unique_hash");
