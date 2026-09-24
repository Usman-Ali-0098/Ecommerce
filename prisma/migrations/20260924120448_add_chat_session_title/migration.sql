-- AlterTable
ALTER TABLE "ChatSession" ADD COLUMN     "title" TEXT;

-- CreateIndex
CREATE INDEX "ChatSession_userId_lastActiveAt_idx" ON "ChatSession"("userId", "lastActiveAt");
