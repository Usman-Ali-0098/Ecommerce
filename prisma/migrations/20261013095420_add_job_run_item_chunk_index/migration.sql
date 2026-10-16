-- AlterTable
ALTER TABLE "JobRunItem" ADD COLUMN     "chunkIndex" INTEGER;

-- CreateIndex
CREATE INDEX "JobRunItem_jobRunId_chunkIndex_idx" ON "JobRunItem"("jobRunId", "chunkIndex");
