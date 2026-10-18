CREATE TABLE "facility_checklist_status" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "item_key" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "updated_by_user_id" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "facility_checklist_status_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "facility_checklist_status_facility_id_item_key_key" ON "facility_checklist_status"("facility_id", "item_key");

ALTER TABLE "facility_checklist_status" ADD CONSTRAINT "facility_checklist_status_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
