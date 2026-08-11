import type {
  Prisma,
} from "@/generated/prisma/client";

import {
  prisma,
} from "@/lib/prisma";

export type ProductSort =
  | "newest"
  | "oldest"
  | "price-low"
  | "price-high";

type GetPublicProductsParams = {
  category?: string;
  search?: string;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};

const publicProductInclude = {
  category: true,

  images: {
    orderBy: {
      position:
        "asc",
    },
  },

  variants: {
    where: {
      isActive: true,
    },

    orderBy: {
      createdAt:
        "asc",
    },

    include: {
      color: true,
      size: true,
    },
  },
} satisfies Prisma.ProductInclude;

type ProductWithRelations =
  Prisma.ProductGetPayload<{
    include:
      typeof publicProductInclude;
  }>;

export async function getPublicProducts({
  category,
  search,
  sort = "newest",
  page = 1,
  pageSize = 12,
}: GetPublicProductsParams = {}) {
  const safePage =
    Math.max(
      page,
      1
    );

  const safePageSize =
    Math.min(
      Math.max(
        pageSize,
        1
      ),
      100
    );

  const skip =
    (safePage - 1) *
    safePageSize;

  const where: Prisma.ProductWhereInput =
    {
      isActive: true,

      category: {
        isActive: true,

        ...(category
          ? {
              slug:
                category,
            }
          : {}),
      },

      variants: {
        some: {
          isActive: true,
        },
      },

      ...(search
        ? {
            OR: [
              {
                name: {
                  contains:
                    search,

                  mode:
                    "insensitive",
                },
              },

              {
                description:
                  {
                    contains:
                      search,

                    mode:
                      "insensitive",
                  },
              },
            ],
          }
        : {}),
    };

  /*
   * Newest / Oldest can be
   * sorted directly by Prisma.
   */
  if (
    sort === "newest" ||
    sort === "oldest"
  ) {
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      {
        createdAt:
          sort === "oldest"
            ? "asc"
            : "desc",
      };

    const [
      products,
      total,
    ] =
      await Promise.all([
        prisma.product.findMany({
          where,
          orderBy,
          skip,

          take:
            safePageSize,

          include:
            publicProductInclude,
        }),

        prisma.product.count({
          where,
        }),
      ]);

    return {
      products:
        products.map(
          mapPublicProduct
        ),

      pagination: {
        page:
          safePage,

        pageSize:
          safePageSize,

        total,

        totalPages:
          Math.ceil(
            total /
              safePageSize
          ),
      },
    };
  }

  /*
   * Product price lives on
   * ProductVariant.
   *
   * Prisma cannot simply order
   * Product rows by the minimum
   * price of a one-to-many
   * variants relation.
   *
   * Therefore for price sorting
   * we load matching products,
   * calculate minPrice, sort,
   * then paginate.
   */
  const products =
    await prisma.product.findMany({
      where,

      include:
        publicProductInclude,
    });

  const mappedProducts =
    products.map(
      mapPublicProduct
    );

  mappedProducts.sort(
    (a, b) => {
      if (
        sort ===
        "price-low"
      ) {
        return (
          a.minPrice -
          b.minPrice
        );
      }

      return (
        b.minPrice -
        a.minPrice
      );
    }
  );

  const total =
    mappedProducts.length;

  const paginatedProducts =
    mappedProducts.slice(
      skip,
      skip +
        safePageSize
    );

  return {
    products:
      paginatedProducts,

    pagination: {
      page:
        safePage,

      pageSize:
        safePageSize,

      total,

      totalPages:
        Math.ceil(
          total /
            safePageSize
        ),
    },
  };
}

function mapPublicProduct(
  product:
    ProductWithRelations
) {
  const primaryImage =
    product.images.find(
      (image) =>
        image.isPrimary
    ) ??
    product.images[0] ??
    null;

  const variants =
    product.variants.map(
      (variant) => ({
        id:
          variant.id,

        sku:
          variant.sku,

        price:
          Number(
            variant.price
          ),

        stock:
          variant.stock,

        color:
          variant.color
            ? {
                id:
                  variant
                    .color
                    .id,

                name:
                  variant
                    .color
                    .name,

                hexacode:
                  variant
                    .color
                    .hexacode,
              }
            : null,

        size:
          variant.size
            ? {
                id:
                  variant
                    .size
                    .id,

                name:
                  variant
                    .size
                    .name,

                sortOrder:
                  variant
                    .size
                    .sortOrder,
              }
            : null,
      })
    );

  const prices =
    variants.map(
      (variant) =>
        variant.price
    );

  const minPrice =
    prices.length > 0
      ? Math.min(
          ...prices
        )
      : 0;

  const maxPrice =
    prices.length > 0
      ? Math.max(
          ...prices
        )
      : 0;

  const totalStock =
    variants.reduce(
      (
        total,
        variant
      ) =>
        total +
        variant.stock,
      0
    );

  return {
    id:
      product.id,

    name:
      product.name,

    slug:
      product.slug,

    description:
      product.description,

    category: {
      id:
        product
          .category.id,

      name:
        product
          .category.name,

      slug:
        product
          .category.slug,
    },

    image:
      primaryImage
        ? {
            id:
              primaryImage.id,

            url:
              primaryImage.url,

            altText:
              primaryImage.altText ??
              product.name,
          }
        : null,

    variants,

    minPrice,
    maxPrice,
    totalStock,
  };
}