ALTER TABLE "Order"
ADD COLUMN "shippingName" TEXT,
ADD COLUMN "shippingPhone" TEXT,
ADD COLUMN "shippingAddress" TEXT,
ADD COLUMN "shippingCity" TEXT,
ADD COLUMN "shippingPostalCode" TEXT,
ADD COLUMN "shippingCountry" TEXT,
ADD COLUMN "paymentRetryExpiresAt" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3);

CREATE INDEX "Order_paymentRetryExpiresAt_idx"
ON "Order"("paymentRetryExpiresAt");
