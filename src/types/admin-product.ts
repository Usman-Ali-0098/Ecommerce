    import type { getAdminProducts } from "@/lib/services/admin-product.service";

type AdminProductsResult =
  Awaited<
    ReturnType<
      typeof getAdminProducts
    >
  >;

export type AdminProduct =
  AdminProductsResult["products"][number];