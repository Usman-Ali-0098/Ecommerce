-- Return to the order-first inventory model. Active reservations are converted
-- back into immediate stock deductions before the ledger is removed.
UPDATE "ProductVariant"
SET
  "stock" = "stock" - "reservedStock",
  "reservedStock" = 0,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "reservedStock" > 0;

DROP TABLE "StockReservation";
DROP TYPE "StockReservationStatus";
ALTER TABLE "ProductVariant" DROP COLUMN "reservedStock";
