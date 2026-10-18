-- Drop call-out feature
DROP TABLE IF EXISTS "call_outs";

-- Clients
CREATE TYPE "ClientStatus" AS ENUM ('active', 'archived');

CREATE TABLE "clients" (
    "id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "date_of_birth" DATE NOT NULL,
    "health_problems" TEXT,
    "needs" TEXT,
    "daily_care_plan" TEXT,
    "status" "ClientStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_staff_assignments" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "staff_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_staff_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "client_documents" (
    "id" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "facility_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "upload_date" TIMESTAMP(3) NOT NULL,
    "uploaded_by_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "client_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "clients_facility_id_status_idx" ON "clients"("facility_id", "status");

CREATE UNIQUE INDEX "client_staff_assignments_client_id_staff_id_key" ON "client_staff_assignments"("client_id", "staff_id");

ALTER TABLE "clients" ADD CONSTRAINT "clients_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "client_staff_assignments" ADD CONSTRAINT "client_staff_assignments_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_staff_assignments" ADD CONSTRAINT "client_staff_assignments_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "client_documents" ADD CONSTRAINT "client_documents_facility_id_fkey" FOREIGN KEY ("facility_id") REFERENCES "facilities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
