import { prisma } from "@/lib/prisma";

type GetUserOrdersParams = {
  userId: number;
  page?: number;
  pageSize?: number;
};

export async function getUserOrders({
  userId,
  page = 1,
  pageSize = 20,
}: GetUserOrdersParams) {
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

  const [orders, total] =
    await Promise.all([
      prisma.order.findMany({
        where: {
          userId,
        },

        orderBy: {
          createdAt:
            "desc",
        },

        skip,

        take:
          safePageSize,

        include: {
          items: {
            select: {
              quantity:
                true,
            },
          },
        },
      }),

      prisma.order.count({
        where: {
          userId,
        },
      }),
    ]);

  return {
    orders:
      orders.map(
        (order) => {
          const productCount =
            order.items.reduce(
              (
                sum,
                item
              ) =>
                sum +
                item.quantity,
              0
            );

          return {
            id:
              order.id,

            orderNumber:
              order.orderNumber,

            status:
              order.status,

            createdAt:
              order.createdAt,

            subtotal:
              Number(
                order.subtotal
              ),

            tax:
              Number(
                order.tax
              ),

            total:
              Number(
                order.total
              ),

            productCount,
          };
        }
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

export async function getUserOrderById(
  userId: number,
  orderId: string
) {
  const order =
    await prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },

      include: {
        user: {
          select: {
            fullName:
              true,
          },
        },

        items: {
          orderBy: {
            createdAt:
              "asc",
          },

          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      orderBy: [
                        {
                          isPrimary:
                            "desc",
                        },
                        {
                          position:
                            "asc",
                        },
                      ],

                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

  if (!order) {
    return null;
  }

  const productCount =
    order.items.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.quantity,
      0
    );

  return {
    id:
      order.id,

    orderNumber:
      order.orderNumber,

    status:
      order.status,

    createdAt:
      order.createdAt,

    user: {
      fullName:
        order.user
          .fullName,
    },

    subtotal:
      Number(
        order.subtotal
      ),

    tax:
      Number(
        order.tax
      ),

    total:
      Number(
        order.total
      ),

    productCount,

    /*
     * Historical values still come
     * from OrderItem snapshots.
     *
     * Only the image is read from
     * the current Product relation.
     */
    items:
      order.items.map(
        (item) => {
          const image =
            item.variant
              ?.product
              .images[0];

          return {
            id:
              item.id,

            productName:
              item.productName,

            sku:
              item.sku,

            colorName:
              item.colorName,

            sizeName:
              item.sizeName,

            unitPrice:
              Number(
                item.unitPrice
              ),

            quantity:
              item.quantity,

            lineTotal:
              Number(
                item.lineTotal
              ),

            image: image
              ? {
                  url:
                    image.url,

                  altText:
                    image.altText,
                }
              : null,
          };
        }
      ),
  };
}