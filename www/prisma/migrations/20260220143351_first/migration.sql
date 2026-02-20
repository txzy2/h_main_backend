/*
  Warnings:

  - Added the required column `active_places` to the `locations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "locations" ADD COLUMN     "active_places" INTEGER NOT NULL;
