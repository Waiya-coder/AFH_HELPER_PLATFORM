-- Add facility join code and staff profile completion tracking
ALTER TABLE "facilities" ADD COLUMN IF NOT EXISTS "join_code" TEXT;

UPDATE "facilities" SET "join_code" = 'SUNR01' WHERE "join_code" IS NULL;

ALTER TABLE "facilities" ALTER COLUMN "join_code" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "facilities_join_code_key" ON "facilities"("join_code");

ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "profile_complete" BOOLEAN NOT NULL DEFAULT false;

UPDATE "staff" SET "profile_complete" = true WHERE "role" IN ('Administrator', 'Supervisor', 'Auditor');
