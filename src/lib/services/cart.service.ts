import { prisma } from "@/lib/prisma";
import { resolveProductImage } from "@/lib/product-image";

export async function getUserCart(userId: number) {
  const cart = await prisma.cart.findUnique({
    where: {
      userId,
    },

    include: {
      items: {
        orderBy: {
          createdAt: "desc",
        },

        include: {
          variant: {
            include: {
              color: true,
              size: true,

              product: {
                include: {
                  images: {
                    orderBy: {
                      position: "asc",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!cart) {
    return {
      id: null,
      items: [],
      totalItems: 0,
      subtotal: 0,
    };
  }

  const items = cart.items.map((item) => {
    const product = item.variant.product;

    const primaryImage = resolveProductImage({
      images: product.images,
      colorId: item.variant.colorId,
      variantImageUrl: item.variant.imageUrl,
      fallbackAltText: product.name,
    });

    const unitPrice = Number(item.variant.price);

    const lineTotal = unitPrice * item.quantity;

    return {
      id: item.id,

      quantity: item.quantity,

      variant: {
        id: item.variant.id,
        sku: item.variant.sku,
        price: unitPrice,
        stock: item.variant.stock,

        color: item.variant.color
          ? {
              id: item.variant.color.id,
              name: item.variant.color.name,
            }
          : null,

        size: item.variant.size
          ? {
              id: item.variant.size.id,
              name: item.variant.size.name,
            }
          : null,
      },

      product: {
        id: product.id,
        name: product.name,
        slug: product.slug,

        image: primaryImage
          ? {
              url: primaryImage.url,

              altText: primaryImage.altText ?? product.name,
            }
          : null,
      },

      lineTotal,
    };
  });

  const subtotal = items.reduce((total, item) => total + item.lineTotal, 0);

  const totalItems = items.reduce((total, item) => total + item.quantity, 0);

  return {
    id: cart.id,
    items,
    totalItems,
    subtotal,
  };
}

// Used by the header.
export async function getCartCount(userId: number) {
  const count = await prisma.cartItem.count({
    where: {
      cart: {
        userId,
      },
    },
  });

  return count;
}
