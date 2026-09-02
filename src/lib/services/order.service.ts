import { prisma } from "@/lib/prisma";
import { resolveProductImage } from "@/lib/product-image";

const TAX_RATE = 0.1;

const DEFAULT_PAGE_SIZE = 20;

const MAX_PAGE_SIZE = 100;

type OrderServiceErrorCode =
  | "INVALID_CART_ITEMS"
  | "PRODUCT_UNAVAILABLE"
  | "INVALID_QUANTITY"
  | "INSUFFICIENT_STOCK"
  | "CART_CHANGED"
  | "ORDER_NOT_RETRYABLE"
  | "RETRY_LIMIT_REACHED";

export class OrderServiceError extends Error {
  code: OrderServiceErrorCode;

  constructor(code: OrderServiceErrorCode, message: string) {
    super(message);

    this.name = "OrderServiceError";

    this.code = code;
  }
}

type GetUserOrdersParams = {
  userId: number;
  page?: number;
  pageSize?: number;
};

type CreateOrderParams = {
  userId: number;
  cartItemIds: string[];
};

type SaveShippingSnapshotParams = {
  userId: number;
  orderId: string;
  shippingName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
};

function roundMoney(value: number) {
  return Math.round(value);
}

function createOrderNumber() {
  const timestamp = Date.now().toString().slice(-8);

  const random = Math.floor(1000 + Math.random() * 9000);

  return `ORD-${timestamp}-${random}`;
}

export async function getUserOrders({
  userId,
  page = 1,
  pageSize = DEFAULT_PAGE_SIZE,
}: GetUserOrdersParams) {
  const safePage = Math.max(page, 1);

  const safePageSize = Math.min(Math.max(pageSize, 1), MAX_PAGE_SIZE);

  const skip = (safePage - 1) * safePageSize;

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where: {
        userId,
      },

      orderBy: {
        createdAt: "desc",
      },

      skip,

      take: safePageSize,

      include: {
        items: {
          select: {
            quantity: true,
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
    orders: orders.map((order) => {
      const productCount = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );

      return {
        id: order.id,

        orderNumber: order.orderNumber,

        status: order.status,

        paymentStatus: order.paymentStatus,

        paymentMethod: order.paymentMethod,

        createdAt: order.createdAt,

        subtotal: Number(order.subtotal),

        tax: Number(order.tax),

        total: Number(order.total),

        productCount,
      };
    }),

    pagination: {
      page: safePage,

      pageSize: safePageSize,

      total,

      totalPages: Math.ceil(total / safePageSize),
    },
  };
}

export async function getUserOrderById(userId: number, orderId: string) {
  const order = await prisma.order.findFirst({
    where: {
      id: orderId,
      userId,
    },

    include: {
      user: {
        select: {
          fullName: true,
        },
      },

      items: {
        orderBy: {
          createdAt: "asc",
        },

        include: {
          variant: {
            include: {
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
      paymentAttempts: {
        orderBy: { createdAt: "desc" },
        select: { status: true, stockReleasedAt: true, createdAt: true },
      },
    },
  });

  if (!order) {
    return null;
  }

  const productCount = order.items.reduce(
    (sum, item) => sum + item.quantity,
    0,
  );

  return {
    id: order.id,

    orderNumber: order.orderNumber,

    status: order.status,

    paymentStatus: order.paymentStatus,

    paymentMethod: order.paymentMethod,

    createdAt: order.createdAt,

    user: {
      fullName: order.user.fullName,
    },

    subtotal: Number(order.subtotal),

    tax: Number(order.tax),

    total: Number(order.total),

    productCount,

    shipping: order.shippingName ? {
      name: order.shippingName,
      email: order.shippingEmail,
      phone: order.shippingPhone,
      address: order.shippingAddress,
      city: order.shippingCity,
      postalCode: order.shippingPostalCode,
      country: order.shippingCountry,
    } : null,

    paymentAttemptCount: order.paymentAttempts.length,

    paymentRetryExpiresAt: order.paymentRetryExpiresAt,

    canRetryPayment:
      order.status === "PENDING" &&
      ["FAILED", "EXPIRED"].includes(order.paymentStatus) &&
      order.paymentAttempts.length < 3 &&
      Boolean(order.paymentRetryExpiresAt && order.paymentRetryExpiresAt > new Date()) &&
      Boolean(order.paymentAttempts[0]),

    items: order.items.map((item) => {
      const currentImage = item.variant
        ? resolveProductImage({
            images: item.variant.product.images,
            colorId: item.variant.colorId,
            variantImageUrl: item.variant.imageUrl,
            fallbackAltText: item.productName,
          })
        : null;
      const image = item.imageUrl
        ? {
            url: item.imageUrl,
            altText: item.imageAltText,
          }
        : currentImage;

      return {
        id: item.id,

        productName: item.productName,

        sku: item.sku,

        colorName: item.colorName,

        sizeName: item.sizeName,

        unitPrice: Number(item.unitPrice),

        quantity: item.quantity,

        lineTotal: Number(item.lineTotal),

        image: image
          ? {
              url: image.url,

              altText: image.altText,
            }
          : null,
      };
    }),
  };
}

export async function createReservedOrder({
  userId,
  cartItemIds,
}: CreateOrderParams) {
  const orderNumber = createOrderNumber();

  const order = await prisma.$transaction(
    async (tx) => {
      const cartItems = await tx.cartItem.findMany({
      where: {
        id: {
          in: cartItemIds,
        },

        cart: {
          userId,
        },
      },

      include: {
        variant: {
          include: {
            color: true,
            size: true,

            product: {
              include: {
                category: true,
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
    });

    if (cartItems.length !== cartItemIds.length) {
      throw new OrderServiceError(
        "INVALID_CART_ITEMS",
        "One or more selected cart items are invalid.",
      );
    }

    for (const item of cartItems) {
      const variant = item.variant;

      const product = variant.product;

      if (
        !variant.isActive ||
        !product.isActive ||
        !product.category.isActive
      ) {
        throw new OrderServiceError(
          "PRODUCT_UNAVAILABLE",
          `${product.name} is currently unavailable.`,
        );
      }

      if (item.quantity < 1) {
        throw new OrderServiceError(
          "INVALID_QUANTITY",
          `Invalid quantity for ${product.name}.`,
        );
      }

      if (variant.stock < item.quantity) {
        throw new OrderServiceError(
          "INSUFFICIENT_STOCK",
          variant.stock === 0
            ? `${product.name} is out of stock.`
            : `Only ${variant.stock} item(s) of ${product.name} are available.`,
        );
      }
    }

    const subtotal = roundMoney(
      cartItems.reduce(
        (sum, item) => sum + Number(item.variant.price) * item.quantity,
        0,
      ),
    );

    const tax = roundMoney(subtotal * TAX_RATE);

    const total = subtotal + tax;

    const newOrder = await tx.order.create({
      data: {
        orderNumber,

        userId,

        status: "PENDING",

        subtotal,

        tax,

        total,

        paymentRetryExpiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      },
    });

    await tx.orderItem.createMany({
      data: cartItems.map((item) => {
        const variant = item.variant;

        const product = variant.product;

        const unitPrice = Number(variant.price);
        const image = resolveProductImage({
          images: product.images,
          colorId: variant.colorId,
          variantImageUrl: variant.imageUrl,
          fallbackAltText: product.name,
        });

        return {
          orderId: newOrder.id,

          variantId: variant.id,

          productName: product.name,

          sku: variant.sku,

          colorName: variant.color?.name ?? null,

          sizeName: variant.size?.name ?? null,

          imageUrl: image?.url ?? null,

          imageAltText: image?.altText ?? product.name,

          unitPrice,

          quantity: item.quantity,

          lineTotal: roundMoney(unitPrice * item.quantity),
        };
      }),
    });

    const paymentAttempt = await tx.paymentAttempt.create({
      data: {
        orderId: newOrder.id,
        amount: total,
        currency: "pkr",
      },
    });

    for (const item of cartItems) {
      const deducted = await tx.productVariant.updateMany({
        where: {
          id: item.variantId,
          isActive: true,
          stock: { gte: item.quantity },
          product: { isActive: true, category: { isActive: true } },
        },
        data: { stock: { decrement: item.quantity } },
      });

      if (deducted.count !== 1) {
        throw new OrderServiceError(
          "INSUFFICIENT_STOCK",
          `${item.variant.product.name} no longer has enough stock. Please review your cart and try again.`,
        );
      }

    }

    const deleted = await tx.cartItem.deleteMany({
      where: {
        id: {
          in: cartItemIds,
        },

        cart: {
          userId,
        },
      },
    });

    if (deleted.count !== cartItemIds.length) {
      throw new OrderServiceError(
        "CART_CHANGED",
        "Your cart changed while placing the order. Please refresh your cart and try again.",
      );
    }

      return {
        order: newOrder,
        paymentAttempt,
        items: cartItems.map((item) => ({
          productName: item.variant.product.name,
          unitPrice: Number(item.variant.price),
          quantity: item.quantity,
        })),
      };
    },
    {
      maxWait: 10_000,
      timeout: 30_000,
    },
  );

  return {
    id: order.order.id,

    orderNumber: order.order.orderNumber,

    status: order.order.status,

    subtotal: Number(order.order.subtotal),

    tax: Number(order.order.tax),

    total: Number(order.order.total),

    paymentAttemptId: order.paymentAttempt.id,

    items: order.items,
  };
}

export async function saveOrderShippingSnapshot({
  userId,
  orderId,
  ...shipping
}: SaveShippingSnapshotParams) {
  const updated = await prisma.order.updateMany({
    where: {
      id: orderId,
      userId,
      status: "PENDING",
      paymentStatus: { in: ["UNPAID", "FAILED", "REQUIRES_ACTION"] },
      paymentAttempts: {
        some: {
          stockReleasedAt: null,
          status: { in: ["UNPAID", "FAILED", "REQUIRES_ACTION"] },
        },
      },
    },
    data: shipping,
  });

  if (updated.count !== 1) {
    throw new OrderServiceError(
      "ORDER_NOT_RETRYABLE",
      "Delivery details can no longer be changed for this order.",
    );
  }
}

export async function reserveExistingOrderForRetry(userId: number, orderId: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { id: orderId, userId },
      include: {
        items: true,
        paymentAttempts: { select: { id: true } },
      },
    });

    if (
      !order ||
      order.status !== "PENDING" ||
      !["FAILED", "EXPIRED"].includes(order.paymentStatus) ||
      !order.paymentRetryExpiresAt ||
      order.paymentRetryExpiresAt <= new Date()
    ) {
      throw new OrderServiceError(
        "ORDER_NOT_RETRYABLE",
        "This order is no longer eligible for payment retry.",
      );
    }

    if (order.paymentAttempts.length >= 3) {
      throw new OrderServiceError(
        "RETRY_LIMIT_REACHED",
        "The maximum number of payment attempts has been reached.",
      );
    }

    const claimed = await tx.order.updateMany({
      where: { id: order.id, paymentStatus: { in: ["FAILED", "EXPIRED"] } },
      data: { paymentStatus: "UNPAID" },
    });

    if (claimed.count !== 1) {
      throw new OrderServiceError(
        "ORDER_NOT_RETRYABLE",
        "Another payment attempt is already active for this order.",
      );
    }

    const attempt = await tx.paymentAttempt.create({
      data: { orderId: order.id, amount: order.total, currency: "pkr" },
    });

    return {
      id: order.id,
      orderNumber: order.orderNumber,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      total: Number(order.total),
      paymentAttemptId: attempt.id,
      items: order.items.map((item) => ({
        productName: item.productName,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
      })),
    };
  }, { maxWait: 10_000, timeout: 30_000 });
}
