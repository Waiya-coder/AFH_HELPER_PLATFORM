-- AlterTable
ALTER TABLE "call_outs" ADD COLUMN "schedule_shift_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "call_outs_schedule_shift_id_key" ON "call_outs"("schedule_shift_id");

-- AddForeignKey
ALTER TABLE "call_outs" ADD CONSTRAINT "call_outs_schedule_shift_id_fkey" FOREIGN KEY ("schedule_shift_id") REFERENCES "schedule_shifts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
