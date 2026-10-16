ALTER TYPE "AdminNotificationType" ADD VALUE 'PRODUCT_IMPORT';

ALTER TABLE "AdminNotification"
    ADD COLUMN "jobRunId" TEXT;

CREATE UNIQUE INDEX "AdminNotification_jobRunId_key"
    ON "AdminNotification"("jobRunId");

ALTER TABLE "AdminNotification"
    ADD CONSTRAINT "AdminNotification_jobRunId_fkey"
    FOREIGN KEY ("jobRunId") REFERENCES "JobRun"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
