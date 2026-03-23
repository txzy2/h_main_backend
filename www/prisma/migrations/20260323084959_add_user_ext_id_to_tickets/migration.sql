/*
  Warnings:

  - Added the required column `user_by_ext_id` to the `tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "user_by_ext_id" VARCHAR(64) NOT NULL;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_by_ext_id_fkey" FOREIGN KEY ("user_by_ext_id") REFERENCES "users"("ext_id") ON DELETE RESTRICT ON UPDATE CASCADE;
