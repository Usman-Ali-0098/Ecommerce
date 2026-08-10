import { prisma } from "@/lib/prisma";

type GetAdminOrdersParams = {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export async function getAdminOrders({
  search = "",
  status = "",
  page = 1,
  pageSize = 20,
}: GetAdminOrdersParams) {
  const safePage =
    page > 0 ? page : 1;

  const where = {
    ...(status
      ? {
          status:
            status as
              | "PENDING"
              | "PROCESSING"
              | "SHIPPED"
              | "DELIVERED"
              | "CANCELLED",
        }
      : {}),

    ...(search
      ? {
          OR: [
            {
              orderNumber: {
                contains:
                  search,
                mode:
                  "insensitive" as const,
              },
            },

            {
              user: {
                email: {
                  contains:
                    search,
                  mode:
                    "insensitive" as const,
                },
              },
            },

            {
              user: {
                fullName: {
                  contains:
                    search,
                  mode:
                    "insensitive" as const,
                },
              },
            },
          ],
        }
      : {}),
  };

  const [
    orders,
    total,
    amountSummary,
    unitsSummary,
  ] =
    await Promise.all([
      /*
       * Paginated order list
       */
      prisma.order.findMany({
        where,

        orderBy: {
          createdAt:
            "desc",
        },

        skip:
          (safePage - 1) *
          pageSize,

        take:
          pageSize,

        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },

          _count: {
            select: {
              items: true,
            },
          },
        },
      }),

      /*
       * Total number of orders
       * matching current filters.
       */
      prisma.order.count({
        where,
      }),

      /*
       * Total amount across
       * matching orders.
       */
      prisma.order.aggregate({
        where,

        _sum: {
          total: true,
        },
      }),

      /*
       * Total number of units
       * purchased across matching
       * orders.
       *
       * OrderItem quantity represents
       * actual units, not just distinct
       * line items.
       */
      prisma.orderItem.aggregate({
        where: {
          order: where,
        },

        _sum: {
          quantity: true,
        },
      }),
    ]);

  return {
    orders:
      orders.map(
        (order) => ({
          id:
            order.id,

          orderNumber:
            order.orderNumber,

          customer: {
            id:
              order.user.id,

            fullName:
              order.user
                .fullName,

            email:
              order.user.email,
          },

          itemCount:
            order._count
              .items,

          total:
            Number(
              order.total
            ),

          status:
            order.status,

          createdAt:
            order.createdAt,
        })
      ),

    /*
     * Dashboard summary cards.
     *
     * These totals represent ALL
     * matching orders, not just
     * the current pagination page.
     */
    summary: {
      totalOrders:
        total,

      totalUnits:
        unitsSummary._sum
          .quantity ?? 0,

      totalAmount:
        Number(
          amountSummary._sum
            .total ?? 0
        ),
    },

    pagination: {
      page:
        safePage,

      pageSize,

      total,

      totalPages:
        Math.max(
          1,
          Math.ceil(
            total /
              pageSize
          )
        ),
    },
  };
}

export type AdminOrder =
  Awaited<
    ReturnType<
      typeof getAdminOrders
    >
  >["orders"][number];

/*
 * --------------------------------
 * ORDER DETAIL
 * --------------------------------
 */

export async function getAdminOrderById(
  orderId: string
) {
  const order =
    await prisma.order.findUnique({
      where: {
        id: orderId,
      },

      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },

        items: {
          orderBy: {
            createdAt:
              "asc",
          },

          include: {
            variant: {
              select: {
                id: true,
                stock: true,

                product: {
                  select: {
                    images: {
                      orderBy: {
                        position:
                          "asc",
                      },

                      select: {
                        url: true,
                        altText:
                          true,
                        isPrimary:
                          true,
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

  if (!order) {
    return null;
  }

  return {
    id:
      order.id,

    orderNumber:
      order.orderNumber,

    status:
      order.status,

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

    createdAt:
      order.createdAt,

    updatedAt:
      order.updatedAt,

    customer: {
      id:
        order.user.id,

      fullName:
        order.user.fullName,

      email:
        order.user.email,
    },

    items:
      order.items.map(
        (item) => {
          const images =
            item.variant
              ?.product
              .images ?? [];

          const primaryImage =
            images.find(
              (image) =>
                image.isPrimary
            ) ??
            images[0] ??
            null;

          return {
            id:
              item.id,

            variantId:
              item.variantId,

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

            currentStock:
              item.variant
                ?.stock ??
              null,

            image:
              primaryImage
                ? {
                    url:
                      primaryImage
                        .url,

                    altText:
                      primaryImage
                        .altText,
                  }
                : null,
          };
        }
      ),
  };
}

export type AdminOrderDetail =
  NonNullable<
    Awaited<
      ReturnType<
        typeof getAdminOrderById
      >
    >
  >;