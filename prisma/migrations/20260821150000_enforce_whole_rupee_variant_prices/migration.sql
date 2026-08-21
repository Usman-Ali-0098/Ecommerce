ALTER TABLE "ProductVariant"
ADD CONSTRAINT "ProductVariant_price_whole_rupees_check"
CHECK (
  "price" > 0
  AND "price" = TRUNC("price")
);
