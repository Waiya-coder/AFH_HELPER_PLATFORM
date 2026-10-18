-- CreateTable
CREATE TABLE "schedule_shifts" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "created_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schedule_shifts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "schedule_shifts_facility_id_start_at_idx" ON "schedule_shifts"("facility_id", "start_at");

-- CreateIndex
CREATE INDEX "schedule_shifts_staff_id_start_at_idx" ON "schedule_shifts"("staff_id", "start_at");

-- AddForeignKey
ALTER TABLE "schedule_shifts" ADD CONSTRAINT "schedule_shifts_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_shifts" ADD CONSTRAINT "schedule_shifts_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "schedule_shifts" ADD CONSTRAINT "schedule_shifts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
