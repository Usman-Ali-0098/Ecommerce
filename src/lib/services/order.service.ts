import { prisma } from "@/lib/prisma";
import { resolveProductImage } from "@/lib/product-image";
import { publishNotificationUpdate } from "@/lib/notifications/socket-server";

const TAX_RATE = 0.1;

const DEFAULT_PAGE_SIZE = 20;

const MAX_PAGE_SIZE = 100;

type OrderServiceErrorCode =
  | "INVALID_CART_ITEMS"
  | "PRODUCT_UNAVAILABLE"
  | "INVALID_QUANTITY"
  | "INSUFFICIENT_STOCK"
  | "CART_CHANGED"
  | "ORDER_NOT_RETRYABLE";

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

type CheckoutShipping = {
  shippingName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
};

type CreateOrderParams = {
  userId: number;
  cartItemIds: string[];
  paymentMethod?: "CARD" | "CASH_ON_DELIVERY";
  shipping?: CheckoutShipping;
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

// TESTING VALUE: 10 minutes, so the expiry/stock-release job is easy to
// exercise end-to-end. Swap back to a real window (e.g. 3 days) before
// shipping: 3 * 24 * 60 * 60 * 1000.
export const PAYMENT_RETRY_LIFETIME_MS = 10 * 60 * 1000;

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
                  category: {
                    select: {
                      isActive: true,
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
        select: { status: true, stockReleasedAt: true, stripeCheckoutSessionId: true, expiresAt: true, createdAt: true },
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

  // Reorder needs to know how much of each variant is already sitting in
  // the cart, so a revisit shows "already in your cart" instead of a blank
  // "Add to cart" button that would just pile more on top on every click.
  // Only fetched for cancelled orders — every other order status renders
  // exactly as before, at no extra query cost.
  const cartQuantityByVariant: Record<string, number> = {};
  if (order.status === "CANCELLED") {
    const variantIds = order.items
      .map((item) => item.variantId)
      .filter((id): id is string => Boolean(id));

    if (variantIds.length > 0) {
      const cartItems = await prisma.cartItem.findMany({
        where: {
          cart: { userId },
          variantId: { in: variantIds },
        },
        select: { variantId: true, quantity: true },
      });

      for (const cartItem of cartItems) {
        cartQuantityByVariant[cartItem.variantId] = cartItem.quantity;
      }
    }
  }

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

    // Whether there's an attempt currently in flight — used only to pick
    // banner wording ("resume" vs "start a new attempt"), never to decide
    // whether the retry button shows at all. The previous version gated
    // visibility on this (and specifically on stripeCheckoutSessionId,
    // which retry-created attempts never set since they're PaymentIntent-
    // based), so the button vanished the instant a retry was started but
    // not finished. createStripeRetryPaymentIntent already resumes an
    // open attempt instead of duplicating it, so visibility only needs to
    // track the order-level retry budget below.
    hasActivePaymentAttempt: Boolean(
      order.paymentAttempts.find((attempt) =>
        ["UNPAID", "PROCESSING", "REQUIRES_ACTION"].includes(attempt.status) &&
        !attempt.stockReleasedAt,
      ),
    ),

    // No attempt-count cap — paymentRetryExpiresAt is the sole deadline for
    // how long an order can still be paid, so that's the only thing that
    // should gate this off.
    canRetryPayment:
      order.status === "PENDING" &&
      order.paymentMethod === "CARD" &&
      order.paymentStatus !== "PAID" &&
      Boolean(order.paymentRetryExpiresAt && order.paymentRetryExpiresAt > new Date()) &&
      !order.stockReleasedAt,

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

      // Reorder needs to know, per item, whether it can still be bought
      // today — the variant/product/category can all have been deactivated
      // or sold out since this order was placed, independent of each other.
      const isPurchasable = Boolean(
        item.variant &&
        item.variant.isActive &&
        item.variant.product.isActive &&
        item.variant.product.category.isActive,
      );
      const currentStock = isPurchasable ? item.variant!.stock : 0;

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

        availability: {
          variantId: item.variantId,
          available: currentStock > 0,
          stock: currentStock,
          inCartQuantity: item.variantId
            ? (cartQuantityByVariant[item.variantId] ?? 0)
            : 0,
        },
      };
    }),
  };
}

export async function createOrder({
  userId,
  cartItemIds,
  paymentMethod = "CARD",
  shipping,
}: CreateOrderParams) {
  const orderNumber = createOrderNumber();
  const resolvedPaymentMethod = paymentMethod ?? "CARD";

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

      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { fullName: true, email: true, mobile: true },
      });

      const newOrder = await tx.order.create({
        data: {
          orderNumber,

          userId,

          status: "PENDING",

          paymentMethod: resolvedPaymentMethod,

          paymentStatus: "UNPAID",

          subtotal,

          tax,

          total,

          shippingName: shipping?.shippingName || user?.fullName || "",
          shippingEmail: shipping?.shippingEmail || user?.email || "",
          shippingPhone: shipping?.shippingPhone || user?.mobile || "",
          shippingAddress: shipping?.shippingAddress || "",
          shippingCity: shipping?.shippingCity || "",
          shippingPostalCode: shipping?.shippingPostalCode || "",
          shippingCountry: shipping?.shippingCountry || "Pakistan",

          paymentRetryExpiresAt: resolvedPaymentMethod === "CARD" ? new Date(Date.now() + PAYMENT_RETRY_LIFETIME_MS) : null,
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
          provider: resolvedPaymentMethod === "CARD" ? "STRIPE" : "CASH_ON_DELIVERY",
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

      if (resolvedPaymentMethod === "CASH_ON_DELIVERY") {
        await tx.notification.create({
          data: {
            userId,
            orderId: newOrder.id,
            type: "ORDER_PLACED",
            title: "Order Placed",
            message: `Cash on delivery order ${newOrder.orderNumber} was placed successfully.`,
          },
        });
        await tx.adminNotification.create({
          data: {
            orderId: newOrder.id,
            type: "NEW_ORDER",
            title: "New Cash on Delivery Order",
            message: `Cash on delivery order ${newOrder.orderNumber} was placed for Rs. ${Math.round(total).toLocaleString("en-PK")}.`,
          },
        });
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

  if (resolvedPaymentMethod === "CASH_ON_DELIVERY") {
    publishNotificationUpdate({ userId, notifyAdmins: true });
  }

  return {
    id: order.order.id,

    orderNumber: order.order.orderNumber,

    status: order.order.status,

    paymentMethod: order.order.paymentMethod,

    subtotal: Number(order.order.subtotal),

    tax: Number(order.order.tax),

    total: Number(order.order.total),

    paymentAttemptId: order.paymentAttempt.id,

    items: order.items,
  };
}

export const createReservedOrder = createOrder;

export async function getOrderCheckoutForDisplay(userId: number, orderId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId, status: "PENDING", paymentStatus: "UNPAID" },
    include: {
      user: { select: { fullName: true, email: true, mobile: true } },
      items: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) return null;

  return {
    orderId: order.id,
    orderNumber: order.orderNumber,
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    total: Number(order.total),
    items: order.items.map((item) => ({
      id: item.id,
      productName: item.productName,
      sku: item.sku,
      colorName: item.colorName,
      sizeName: item.sizeName,
      quantity: item.quantity,
      lineTotal: Number(item.lineTotal),
      imageUrl: item.imageUrl,
      imageAltText: item.imageAltText,
    })),
    shipping: {
      shippingName: order.shippingName ?? order.user.fullName,
      shippingEmail: order.shippingEmail ?? order.user.email,
      shippingPhone: order.shippingPhone ?? order.user.mobile ?? "",
      shippingAddress: order.shippingAddress ?? "",
      shippingCity: order.shippingCity ?? "",
      shippingPostalCode: order.shippingPostalCode ?? "",
      shippingCountry: order.shippingCountry ?? "Pakistan",
    },
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
      stockReleasedAt: null,
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
      },
    });

    if (
      !order ||
      order.status !== "PENDING" ||
      !["FAILED", "EXPIRED"].includes(order.paymentStatus) ||
      !order.paymentRetryExpiresAt ||
      order.paymentRetryExpiresAt <= new Date() ||
      order.stockReleasedAt !== null
    ) {
      throw new OrderServiceError(
        "ORDER_NOT_RETRYABLE",
        "This order is no longer eligible for payment retry.",
      );
    }

    // No cap on attempt count — a customer can retry as many times as they
    // like, as long as they're still inside paymentRetryExpiresAt. That
    // fixed deadline (not an attempt tally) is what actually determines
    // whether the order is still payable.
    const claimed = await tx.order.updateMany({
      where: {
        id: order.id,
        paymentStatus: { in: ["FAILED", "EXPIRED"] },
        stockReleasedAt: null,
      },
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
