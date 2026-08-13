import { prisma } from "@/lib/prisma";

type GetAdminProductsParams = {
  search?: string;
  category?: string;
  page?: number;
  pageSize?: number;
};

export async function getAdminProducts({
  search = "",
  category = "",
  page = 1,
  pageSize = 20,
}: GetAdminProductsParams) {
  const safePage = Math.max(page, 1);

  const safePageSize = Math.min(Math.max(pageSize, 1), 100);

  const skip = (safePage - 1) * safePageSize;

  const where = {
    ...(search
      ? {
          OR: [
            {
              name: {
                contains: search,

                mode: "insensitive" as const,
              },
            },

            {
              description: {
                contains: search,

                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),

    ...(category
      ? {
          category: {
            slug: category,
          },
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      skip,

      take: safePageSize,

      include: {
        category: true,

        images: {
          orderBy: {
            position: "asc",
          },
        },

        variants: {
          orderBy: {
            createdAt: "asc",
          },

          select: {
            id: true,
            sku: true,
            price: true,
            stock: true,
            isActive: true,

            /*
             * IMPORTANT:
             * Load optional
             * variant image.
             */
            imageUrl: true,
            imagePublicId: true,

            color: {
              select: {
                id: true,
                name: true,
                hexacode: true,
              },
            },

            size: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }),

    prisma.product.count({
      where,
    }),
  ]);

  const mappedProducts = products.map((product) => {
    const primaryImage =
      product.images.find((image) => image.isPrimary) ??
      product.images[0] ??
      null;

    const prices = product.variants.map((variant) => Number(variant.price));

    const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

    const totalStock = product.variants.reduce(
      (total, variant) => total + variant.stock,

      0,
    );

    return {
      id: product.id,

      name: product.name,

      slug: product.slug,

      description: product.description,

      isActive: product.isActive,

      category: {
        id: product.category.id,

        name: product.category.name,

        slug: product.category.slug,
      },

      image: primaryImage
        ? {
            url: primaryImage.url,

            altText: primaryImage.altText ?? product.name,
          }
        : null,

      minPrice,

      maxPrice,

      totalStock,

      variantCount: product.variants.length,

      activeVariantCount: product.variants.filter((variant) => variant.isActive)
        .length,

      variants: product.variants.map((variant) => ({
        id: variant.id,

        sku: variant.sku,

        price: Number(variant.price),

        stock: variant.stock,

        isActive: variant.isActive,

        /*
         * IMPORTANT:
         * Pass image to
         * AdminProductsTable.
         */
        imageUrl: variant.imageUrl,

        imagePublicId: variant.imagePublicId,

        color: variant.color
          ? {
              id: variant.color.id,

              name: variant.color.name,

              hexacode: variant.color.hexacode,
            }
          : null,

        size: variant.size
          ? {
              id: variant.size.id,

              name: variant.size.name,
            }
          : null,
      })),

      createdAt: product.createdAt,
    };
  });

  return {
    products: mappedProducts,

    pagination: {
      page: safePage,

      pageSize: safePageSize,

      total,

      totalPages: Math.ceil(total / safePageSize),
    },
  };
}
