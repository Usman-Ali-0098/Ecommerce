import type { getPublicProducts } from "@/lib/services/product.service";

type PublicProductsResult =
  Awaited<
    ReturnType<typeof getPublicProducts>
  >;

export type PublicProduct =
  PublicProductsResult["products"][number];

export type PublicProductVariant =
  PublicProduct["variants"][number];