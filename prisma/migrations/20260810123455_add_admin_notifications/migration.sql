-- CreateEnum
CREATE TYPE "AdminNotificationType" AS ENUM ('NEW_ORDER', 'ORDER_CANCELLED');

-- CreateTable
CREATE TABLE "AdminNotification" (
    "id" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "AdminNotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdminNotification_isRead_idx" ON "AdminNotification"("isRead");

-- CreateIndex
CREATE INDEX "AdminNotification_createdAt_idx" ON "AdminNotification"("createdAt");

-- CreateIndex
CREATE INDEX "AdminNotification_orderId_idx" ON "AdminNotification"("orderId");

-- AddForeignKey
ALTER TABLE "AdminNotification" ADD CONSTRAINT "AdminNotification_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
