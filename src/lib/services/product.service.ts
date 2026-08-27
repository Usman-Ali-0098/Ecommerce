import type { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

export type ProductSort = "newest" | "oldest" | "price-low" | "price-high";

type GetPublicProductsParams = {
  userId?: number;
  category?: string;
  search?: string;
  sort?: ProductSort;
  page?: number;
  pageSize?: number;
};

// "When you fetch the Product, also fetch its related category and images."
const publicProductInclude = {
  category: true,

  images: {
    orderBy: {
      position: "asc",
    },
  },
  // Which variants should I return with the product?
  variants: {
    where: {
      isActive: true,
    },

    orderBy: {
      createdAt: "asc",
    },

    include: {
      color: true,
      size: true,
    },
  },
} satisfies Prisma.ProductInclude;

type ProductWithRelations = Prisma.ProductGetPayload<{
  include: typeof publicProductInclude;
}>;

// main function here
export async function getPublicProducts({
  userId,
  category,
  search,
  sort = "newest",
  page = 1,
  pageSize = 12,
}: GetPublicProductsParams = {}) {
  const safePage = Math.max(page, 1);

  const safePageSize = Math.min(Math.max(pageSize, 1), 100);

  const skip = (safePage - 1) * safePageSize;

  const where: Prisma.ProductWhereInput = {
    isActive: true,

    category: {
      isActive: true,

      ...(category
        ? {
            slug: category,
          }
        : {}),
    },
    // Should this product be included at all?
    variants: {
      some: {
        isActive: true,
      },
    },

    ...(search
      ? {
          name: {
            contains: search,
            mode: "insensitive",
          },
        }
      : {}),
  };

  //  NEWEST / OLDEST sort

  if (sort === "newest" || sort === "oldest") {
    const direction = sort === "oldest" ? "asc" : "desc";

    const orderBy: Prisma.ProductOrderByWithRelationInput[] = [
      { createdAt: direction },
      { id: direction },
    ];

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,

        orderBy,

        skip,

        take: safePageSize,

        include: publicProductInclude,
      }),

      prisma.product.count({
        where,
      }),
    ]);

    const publicProducts = await addCartAvailability(
      products.map(mapPublicProduct),
      userId,
    );

    return {
      products: publicProducts,

      pagination: {
        page: safePage,

        pageSize: safePageSize,

        total,

        totalPages: Math.ceil(total / safePageSize),
      },
    };
  }

  //  PRICE SORTING

  const products = await prisma.product.findMany({
    where,

    include: publicProductInclude,
  });

  const mappedProducts = products.map(mapPublicProduct);

  mappedProducts.sort((a, b) => {
    if (sort === "price-low") {
      return a.minPrice - b.minPrice || a.id.localeCompare(b.id);
    }

    return b.minPrice - a.minPrice || b.id.localeCompare(a.id);
  });

  const total = mappedProducts.length;

  const paginatedProducts = await addCartAvailability(
    mappedProducts.slice(skip, skip + safePageSize),
    userId,
  );

  return {
    products: paginatedProducts,

    pagination: {
      page: safePage,

      pageSize: safePageSize,

      total,

      totalPages: Math.ceil(total / safePageSize),
    },
  };
}

async function addCartAvailability(
  products: ReturnType<typeof mapPublicProduct>[],
  userId?: number,
) {
  const variantIds = products.flatMap((product) =>
    product.variants.map((variant) => variant.id),
  );

  const cartItems =
    userId && variantIds.length > 0
      ? await prisma.cartItem.findMany({
          where: {
            variantId: { in: variantIds },
            cart: { userId },
          },
          select: {
            variantId: true,
            quantity: true,
          },
        })
      : [];

  const cartQuantityByVariant = new Map(
    cartItems.map((item) => [item.variantId, item.quantity]),
  );

  return products.map((product) => {
    const variants = product.variants.map((variant) => {
      const cartQuantity = cartQuantityByVariant.get(variant.id) ?? 0;

      return {
        ...variant,
        cartQuantity,
        availableToAdd: Math.max(0, variant.stock - cartQuantity),
      };
    });

    return {
      ...product,
      variants,
      totalAvailableToAdd: variants.reduce(
        (total, variant) => total + variant.availableToAdd,
        0,
      ),
    };
  });
}

//  MAP PUBLIC PRODUCT

function mapPublicProduct(product: ProductWithRelations) {
  /*
   * Find primary image.
   */
  const primaryImage =
    product.images.find((image) => image.isPrimary) ??
    product.images[0] ??
    null;

  const orderedImages = primaryImage
    ? [
        primaryImage,

        ...product.images.filter((image) => image.id !== primaryImage.id),
      ]
    : [];

  const variants = product.variants.map((variant) => ({
    id: variant.id,

    sku: variant.sku,

    price: Number(variant.price),

    stock: variant.stock,

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

          sortOrder: variant.size.sortOrder,
        }
      : null,
  }));

  const prices = variants.map((variant) => variant.price);

  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;

  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  const totalStock = variants.reduce(
    (total, variant) => total + variant.stock,

    0,
  );

  return {
    id: product.id,

    name: product.name,

    slug: product.slug,

    description: product.description,

    category: {
      id: product.category.id,

      name: product.category.name,

      slug: product.category.slug,
    },

    image: primaryImage
      ? {
          id: primaryImage.id,

          url: primaryImage.url,

          altText: primaryImage.altText ?? product.name,

          isPrimary: primaryImage.isPrimary,

          position: primaryImage.position,

          colorId: primaryImage.colorId,
        }
      : null,

    /*
     * NEW:
     * full image gallery.
     */
    images: orderedImages.map((image) => ({
      id: image.id,

      url: image.url,

      altText: image.altText ?? product.name,

      isPrimary: image.isPrimary,

      position: image.position,

      colorId: image.colorId,
    })),

    variants,

    minPrice,

    maxPrice,

    totalStock,
  };
}
