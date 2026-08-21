ALTER TABLE "ProductImage"
ADD COLUMN "colorId" TEXT;

ALTER TABLE "ProductImage"
ADD CONSTRAINT "ProductImage_colorId_fkey"
FOREIGN KEY ("colorId") REFERENCES "Color"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "ProductImage_colorId_idx"
ON "ProductImage"("colorId");

ALTER TABLE "OrderItem"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "imageAltText" TEXT;
