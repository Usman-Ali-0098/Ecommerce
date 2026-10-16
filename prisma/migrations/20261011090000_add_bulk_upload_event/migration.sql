-- Reuse JobRun as the durable CSV import event and JobRunItem for product
-- outcomes. Existing non-import jobs leave these new fields NULL/defaulted.
ALTER TABLE "JobRun"
    ADD COLUMN "cloudinaryPublicId" TEXT,
    ADD COLUMN "cloudinarySecureUrl" TEXT,
    ADD COLUMN "cloudinaryVersion" TEXT,
    ADD COLUMN "originalFilename" TEXT,
    ADD COLUMN "sizeBytes" INTEGER,
    ADD COLUMN "idempotencyKey" TEXT,
    ADD COLUMN "celeryTaskId" TEXT,
    ADD COLUMN "phase" TEXT,
    ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "totalRows" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "totalItems" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "processedItems" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "successCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "failedCount" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "enqueueAttempts" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN "enqueueError" TEXT,
    ADD COLUMN "enqueuedAt" TIMESTAMP(3),
    ADD COLUMN "heartbeatAt" TIMESTAMP(3),
    ADD COLUMN "cleanupAt" TIMESTAMP(3);

ALTER TABLE "JobRunItem"
    ADD COLUMN "itemKey" TEXT,
    ADD COLUMN "productName" TEXT,
    ADD COLUMN "skuSummary" TEXT,
    ADD COLUMN "attempt" INTEGER NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX "JobRun_cloudinaryPublicId_key" ON "JobRun"("cloudinaryPublicId");
CREATE UNIQUE INDEX "JobRun_idempotencyKey_key" ON "JobRun"("idempotencyKey");
CREATE UNIQUE INDEX "JobRunItem_jobRunId_itemKey_key" ON "JobRunItem"("jobRunId", "itemKey");
