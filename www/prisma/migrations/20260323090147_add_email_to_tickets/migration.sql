/*
  Warnings:

  - Added the required column `email` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "email" VARCHAR(255) NOT NULL;
