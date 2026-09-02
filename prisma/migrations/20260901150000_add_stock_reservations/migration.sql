ALTER TABLE "ProductVariant"
ADD COLUMN "reservedStock" INTEGER NOT NULL DEFAULT 0;

CREATE TYPE "StockReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED');

CREATE TABLE "StockReservation" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "paymentAttemptId" TEXT NOT NULL,
  "variantId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "status" "StockReservationStatus" NOT NULL DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "releasedAt" TIMESTAMP(3),
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StockReservation_paymentAttemptId_variantId_key"
ON "StockReservation"("paymentAttemptId", "variantId");
CREATE INDEX "StockReservation_orderId_idx" ON "StockReservation"("orderId");
CREATE INDEX "StockReservation_variantId_status_idx" ON "StockReservation"("variantId", "status");
CREATE INDEX "StockReservation_expiresAt_idx" ON "StockReservation"("expiresAt");

ALTER TABLE "StockReservation"
ADD CONSTRAINT "StockReservation_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockReservation"
ADD CONSTRAINT "StockReservation_paymentAttemptId_fkey"
FOREIGN KEY ("paymentAttemptId") REFERENCES "PaymentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StockReservation"
ADD CONSTRAINT "StockReservation_variantId_fkey"
FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Convert any checkout that was active before this migration from the old
-- "stock already decremented" representation into an explicit reservation.
INSERT INTO "StockReservation" (
  "id", "orderId", "paymentAttemptId", "variantId", "quantity", "status",
  "expiresAt", "createdAt", "updatedAt"
)
SELECT
  md5(random()::text || clock_timestamp()::text || oi."id" || pa."id"),
  pa."orderId",
  pa."id",
  oi."variantId",
  oi."quantity",
  'ACTIVE'::"StockReservationStatus",
  pa."expiresAt",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "PaymentAttempt" pa
JOIN "OrderItem" oi ON oi."orderId" = pa."orderId"
WHERE pa."stockReleasedAt" IS NULL
  AND pa."status" IN ('UNPAID', 'REQUIRES_ACTION', 'PROCESSING', 'FAILED')
  AND oi."variantId" IS NOT NULL
ON CONFLICT ("paymentAttemptId", "variantId") DO NOTHING;

UPDATE "ProductVariant" pv
SET
  "stock" = pv."stock" + totals.quantity,
  "reservedStock" = totals.quantity,
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  SELECT "variantId", SUM("quantity")::INTEGER AS quantity
  FROM "StockReservation"
  WHERE "status" = 'ACTIVE'
  GROUP BY "variantId"
) totals
WHERE pv."id" = totals."variantId";
