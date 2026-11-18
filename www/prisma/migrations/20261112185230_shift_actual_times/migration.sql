-- AlterTable
ALTER TABLE "shifts" ADD COLUMN     "actual_ended_at" TIMESTAMP(3),
ADD COLUMN     "actual_started_at" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "shifts_user_id_actual_started_at_idx" ON "shifts"("user_id", "actual_started_at");
