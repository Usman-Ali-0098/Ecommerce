-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('EMAIL', 'PRODUCT_IMPORT');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "type" "JobType" NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "requestedBy" INTEGER,
    "summary" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobRunItem" (
    "id" TEXT NOT NULL,
    "jobRunId" TEXT NOT NULL,
    "rowIndex" INTEGER,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "message" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "JobRunItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobRun_type_idx" ON "JobRun"("type");
CREATE INDEX "JobRun_status_idx" ON "JobRun"("status");
CREATE INDEX "JobRun_createdAt_idx" ON "JobRun"("createdAt");
CREATE INDEX "JobRunItem_jobRunId_idx" ON "JobRunItem"("jobRunId");
CREATE INDEX "JobRunItem_status_idx" ON "JobRunItem"("status");

-- AddForeignKey
ALTER TABLE "JobRunItem" ADD CONSTRAINT "JobRunItem_jobRunId_fkey" FOREIGN KEY ("jobRunId") REFERENCES "JobRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
