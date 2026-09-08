import Stripe from "stripe";

import { prisma } from "@/lib/prisma";
import {
  createReservedOrder,
  reserveExistingOrderForRetry,
} from "@/lib/services/order.service";
import { ensureStripeCustomer } from "@/lib/services/stripe-customer.service";
import { getStripe, getStripePublishableKey } from "@/lib/stripe";
import { publishNotificationUpdate } from "@/lib/notifications/socket-server";

// Stripe Checkout requires at least 30 minutes. Its expiration webhook releases
// abandoned reservations without requiring an application-level scheduler.
const STRIPE_CHECKOUT_EXPIRATION_SECONDS = 31 * 60;
const MAX_PAYMENT_ATTEMPTS = 3;
const CURRENCY = "pkr";

type CreateStripeCheckoutParams = {
  userId: number;
  cartItemIds: string[];
  returnUrlBase: string;
};

function toMinorUnits(amount: number) {
  return Math.round(amount * 100);
}

export class PaymentServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentServiceError";
  }
}

export async function createStripeCheckout({
  userId,
  cartItemIds,
  returnUrlBase,
}: CreateStripeCheckoutParams) {
  const customerId = await ensureStripeCustomer({ userId });
  const reservedOrder = await createReservedOrder({ userId, cartItemIds });
  return createCheckoutSessionForReservedOrder({
    userId,
    customerId,
    reservedOrder,
    returnUrlBase,
  });
}

export async function createStripeRetryCheckout({
  userId,
  orderId,
  returnUrlBase,
}: {
  userId: number;
  orderId: string;
  returnUrlBase: string;
}) {
  const customerId = await ensureStripeCustomer({ userId });
  const reservedOrder = await reserveExistingOrderForRetry(userId, orderId);
  return createCheckoutSessionForReservedOrder({
    userId,
    customerId,
    reservedOrder,
    returnUrlBase,
  });
}

/** Starts Stripe only after the customer explicitly selects card payment. */
export async function createStripeCheckoutForOrder({
  userId,
  orderId,
  returnUrlBase,
}: {
  userId: number;
  orderId: string;
  returnUrlBase: string;
}) {
  const reservedOrder = await prisma.paymentAttempt.findFirst({
    where: {
      order: {
        id: orderId,
        userId,
        status: "PENDING",
        paymentMethod: "CARD",
        paymentStatus: "UNPAID",
      },
      status: "UNPAID",
      stockReleasedAt: null,
    },
    include: { order: { include: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (!reservedOrder) {
    throw new PaymentServiceError("This order is not available for card payment.");
  }

  const customerId = await ensureStripeCustomer({ userId });
  return createCheckoutSessionForReservedOrder({
    userId,
    customerId,
    reservedOrder: {
      id: reservedOrder.order.id,
      orderNumber: reservedOrder.order.orderNumber,
      subtotal: Number(reservedOrder.order.subtotal),
      tax: Number(reservedOrder.order.tax),
      total: Number(reservedOrder.order.total),
      paymentAttemptId: reservedOrder.id,
      items: reservedOrder.order.items.map((item) => ({
        productName: item.productName,
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
      })),
    },
    returnUrlBase,
  });
}

async function createCheckoutSessionForReservedOrder({
  userId,
  customerId,
  reservedOrder,
  returnUrlBase,
}: {
  userId: number;
  customerId: string;
  reservedOrder: {
    id: string;
    orderNumber: string;
    subtotal: number;
    tax: number;
    total: number;
    paymentAttemptId: string;
    items: Array<{ productName: string; unitPrice: number; quantity: number }>;
  };
  returnUrlBase: string;
}) {
  const stripe = getStripe();
  const now = Math.floor(Date.now() / 1000);
  const stripeExpiresAt = now + STRIPE_CHECKOUT_EXPIRATION_SECONDS;

  try {
    const session = await stripe.checkout.sessions.create(
      {
        ui_mode: "elements",
        mode: "payment",
        customer: customerId,
        payment_method_types: ["card"],
        billing_address_collection: "auto",
        return_url: `${returnUrlBase}/payment/complete?session_id={CHECKOUT_SESSION_ID}`,
        expires_at: stripeExpiresAt,
        saved_payment_method_options: {
          payment_method_save: "enabled",
          payment_method_remove: "enabled",
        },
        line_items: [
          ...reservedOrder.items.map((item) => ({
            quantity: item.quantity,
            price_data: {
              currency: CURRENCY,
              unit_amount: toMinorUnits(item.unitPrice),
              product_data: { name: item.productName },
            },
          })),
          ...(reservedOrder.tax > 0
            ? [
                {
                  quantity: 1,
                  price_data: {
                    currency: CURRENCY,
                    unit_amount: toMinorUnits(reservedOrder.tax),
                    product_data: { name: "Tax" },
                  },
                },
              ]
            : []),
        ],
        metadata: {
          localOrderId: reservedOrder.id,
          localPaymentAttemptId: reservedOrder.paymentAttemptId,
          localUserId: userId.toString(),
        },
        payment_intent_data: {
          setup_future_usage: "off_session",
          metadata: {
            localOrderId: reservedOrder.id,
            localPaymentAttemptId: reservedOrder.paymentAttemptId,
            localUserId: userId.toString(),
          },
        },
      },
      { idempotencyKey: `checkout:${reservedOrder.paymentAttemptId}` },
    );

    if (!session.client_secret) {
      throw new Error("Stripe Checkout Session did not return a client secret.");
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id ?? null;

    await prisma.paymentAttempt.update({
      where: { id: reservedOrder.paymentAttemptId },
      data: {
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: paymentIntentId,
        expiresAt: new Date(stripeExpiresAt * 1000),
      },
    });

    return {
      orderId: reservedOrder.id,
      orderNumber: reservedOrder.orderNumber,
      paymentAttemptId: reservedOrder.paymentAttemptId,
      sessionId: session.id,
      clientSecret: session.client_secret,
      publishableKey: getStripePublishableKey(),
    };
  } catch (error) {
    await closePaymentAttempt({
      paymentAttemptId: reservedOrder.paymentAttemptId,
      status: "FAILED",
      failureCode: "checkout_session_creation_failed",
    });

    throw error;
  }
}

export async function placeCashOnDeliveryOrder(userId: number, orderId: string) {
  const attempt = await prisma.paymentAttempt.findFirst({
    where: {
      orderId,
      order: { userId, status: "PENDING", paymentStatus: "UNPAID" },
      status: "UNPAID",
      stockReleasedAt: null,
    },
    include: { order: true },
  });

  if (!attempt) {
    throw new PaymentServiceError("This order is not available for cash on delivery.");
  }

  // A direct COD selection never reaches Stripe. If the customer first opened
  // card payment and then changed their mind, invalidate that already-created
  // session so it cannot be paid after the order becomes COD.
  if (attempt.stripeCheckoutSessionId) {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(attempt.stripeCheckoutSessionId);
    if (session.status === "open" && session.payment_status !== "paid") {
      await stripe.checkout.sessions.expire(attempt.stripeCheckoutSessionId);
    }
    if (session.payment_status === "paid") {
      throw new PaymentServiceError("This order has already been paid.");
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const current = await tx.paymentAttempt.findUnique({
      where: { id: attempt.id },
      include: { order: true },
    });

    if (!current || current.order.paymentStatus === "PAID") {
      throw new PaymentServiceError("This order has already been paid.");
    }

    await tx.paymentAttempt.updateMany({
      where: { id: current.id, status: { not: "PAID" } },
      data: { status: "CANCELED", failureCode: "cash_on_delivery_selected" },
    });

    const order = await tx.order.update({
      where: { id: current.orderId },
      data: {
        paymentMethod: "CASH_ON_DELIVERY",
        paymentStatus: "UNPAID",
        status: "PENDING",
      },
    });

    await tx.notification.create({
      data: {
        userId,
        orderId: order.id,
        type: "ORDER_PLACED",
        title: "Order Placed",
        message: `Cash on delivery order ${order.orderNumber} was placed successfully.`,
      },
    });
    await tx.adminNotification.create({
      data: {
        orderId: order.id,
        type: "NEW_ORDER",
        title: "New Cash on Delivery Order",
        message: `Cash on delivery order ${order.orderNumber} was placed for Rs. ${Math.round(Number(order.total)).toLocaleString("en-PK")}.`,
      },
    });

    return { orderId: order.id, orderNumber: order.orderNumber };
  });

  publishNotificationUpdate({ userId, notifyAdmins: true });

  return result;
}

export async function getCheckoutForDisplay(userId: number, sessionId: string) {
  const attempt = await prisma.paymentAttempt.findFirst({
    where: {
      stripeCheckoutSessionId: sessionId,
      order: { userId },
    },
    include: {
      order: {
        include: {
          user: { select: { fullName: true, email: true, mobile: true } },
          items: { orderBy: { createdAt: "asc" } },
        },
      },
    },
  });

  if (!attempt || ["PAID", "EXPIRED", "CANCELED"].includes(attempt.status)) {
    return null;
  }

  const session = await getStripe().checkout.sessions.retrieve(sessionId);

  if (!session.client_secret) {
    return null;
  }

  return {
    sessionId,
    clientSecret: session.client_secret,
    publishableKey: getStripePublishableKey(),
    orderId: attempt.order.id,
    orderNumber: attempt.order.orderNumber,
    subtotal: Number(attempt.order.subtotal),
    tax: Number(attempt.order.tax),
    total: Number(attempt.order.total),
    items: attempt.order.items.map((item) => ({
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
      shippingName: attempt.order.shippingName ?? attempt.order.user.fullName,
      shippingEmail: attempt.order.shippingEmail ?? attempt.order.user.email,
      shippingPhone: attempt.order.shippingPhone ?? attempt.order.user.mobile ?? "",
      shippingAddress: attempt.order.shippingAddress ?? "",
      shippingCity: attempt.order.shippingCity ?? "",
      shippingPostalCode: attempt.order.shippingPostalCode ?? "",
      shippingCountry: attempt.order.shippingCountry ?? "Pakistan",
    },
  };
}

type ClosePaymentAttemptParams = {
  paymentAttemptId: string;
  status: "FAILED" | "EXPIRED" | "CANCELED";
  failureCode?: string;
};

async function closePaymentAttempt({
  paymentAttemptId,
  status,
  failureCode,
}: ClosePaymentAttemptParams) {
  await prisma.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({
      where: { id: paymentAttemptId },
      include: {
        order: {
          include: {
            paymentAttempts: { select: { id: true } },
          },
        },
      },
    });

    if (
      !attempt ||
      attempt.status === "PAID" ||
      attempt.status === "CANCELED" ||
      attempt.order.paymentMethod === "CASH_ON_DELIVERY"
    ) {
      return;
    }

    const claimed = await tx.paymentAttempt.updateMany({
      where: {
        id: attempt.id,
        status: { not: "PAID" },
      },
      data: {
        status,
        failureCode: failureCode ?? attempt.failureCode,
      },
    });

    if (claimed.count !== 1) {
      return;
    }

    const retryWindowEnded =
      !attempt.order.paymentRetryExpiresAt ||
      attempt.order.paymentRetryExpiresAt <= new Date();
    const finalFailure =
      attempt.order.paymentAttempts.length >= MAX_PAYMENT_ATTEMPTS ||
      retryWindowEnded;

    await tx.order.update({
      where: { id: attempt.orderId },
      data: {
        status: finalFailure ? "CANCELLED" : "PENDING",
        paymentStatus: finalFailure ? "CANCELED" : status,
        ...(finalFailure ? { cancelledAt: new Date() } : {}),
      },
    });
  });
}

async function finalizePaidAttempt(
  paymentAttemptId: string,
  paymentIntentId?: string | null,
) {
  const notificationTarget = await prisma.$transaction(async (tx) => {
    const attempt = await tx.paymentAttempt.findUnique({
      where: { id: paymentAttemptId },
      include: { order: true },
    });

    if (
      !attempt ||
      attempt.status === "PAID" ||
      attempt.status === "CANCELED" ||
      attempt.stockReleasedAt
    ) {
      return;
    }

    const updated = await tx.paymentAttempt.updateMany({
      where: {
        id: attempt.id,
        status: { not: "PAID" },
        stockReleasedAt: null,
      },
      data: {
        status: "PAID",
        paidAt: new Date(),
        failureCode: null,
        ...(paymentIntentId ? { stripePaymentIntentId: paymentIntentId } : {}),
      },
    });

    if (updated.count !== 1) {
      return;
    }

    await tx.order.update({
      where: { id: attempt.orderId },
      data: { paymentStatus: "PAID" },
    });

    await tx.notification.create({
      data: {
        userId: attempt.order.userId,
        orderId: attempt.order.id,
        type: "ORDER_PLACED",
        title: "Payment Successful",
        message: `Payment for order ${attempt.order.orderNumber} was successful.`,
      },
    });

    await tx.adminNotification.create({
      data: {
        orderId: attempt.order.id,
        type: "NEW_ORDER",
        title: "New Paid Order",
        message: `Payment was confirmed for order ${attempt.order.orderNumber} for Rs. ${Math.round(
          Number(attempt.order.total),
        ).toLocaleString("en-PK")}.`,
      },
    });

    return { userId: attempt.order.userId };
  });

  if (notificationTarget) {
    publishNotificationUpdate({
      userId: notificationTarget.userId,
      notifyAdmins: true,
    });
  }
}

function paymentIntentIdFromSession(session: Stripe.Checkout.Session) {
  return typeof session.payment_intent === "string"
    ? session.payment_intent
    : session.payment_intent?.id ?? null;
}

async function findAttemptIdForSession(session: Stripe.Checkout.Session) {
  const metadataId = session.metadata?.localPaymentAttemptId;

  if (metadataId) {
    return metadataId;
  }

  const attempt = await prisma.paymentAttempt.findUnique({
    where: { stripeCheckoutSessionId: session.id },
    select: { id: true },
  });

  return attempt?.id ?? null;
}

async function rememberSuccessfulPaymentMethod(session: Stripe.Checkout.Session) {
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const paymentIntentId = paymentIntentIdFromSession(session);

  if (!customerId || !paymentIntentId) return;

  try {
    const intent = await getStripe().paymentIntents.retrieve(paymentIntentId);
    const paymentMethodId =
      typeof intent.payment_method === "string"
        ? intent.payment_method
        : intent.payment_method?.id;

    if (!paymentMethodId) return;

    await getStripe().customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
    await prisma.user.updateMany({
      where: { stripeCustomerId: customerId },
      data: { stripeDefaultPaymentMethodId: paymentMethodId },
    });
  } catch (error) {
    // Payment finalization must not fail because default-card preference failed.
    console.error("Unable to remember Stripe default payment method:", error);
  }
}

export async function processStripeWebhook(event: Stripe.Event) {
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });

  if (existing) {
    return;
  }

  if (
    event.type === "checkout.session.completed" ||
    event.type === "checkout.session.async_payment_succeeded"
  ) {
    const session = event.data.object as Stripe.Checkout.Session;
    const attemptId = await findAttemptIdForSession(session);

    if (attemptId && session.payment_status === "paid") {
      await finalizePaidAttempt(attemptId, paymentIntentIdFromSession(session));
      await rememberSuccessfulPaymentMethod(session);
    } else if (attemptId) {
      await prisma.paymentAttempt.updateMany({
        where: { id: attemptId, status: { not: "PAID" } },
        data: { status: "PROCESSING" },
      });
      await prisma.order.updateMany({
        where: {
          paymentStatus: { not: "PAID" },
          paymentAttempts: { some: { id: attemptId } },
        },
        data: { paymentStatus: "PROCESSING" },
      });
    }
  } else if (event.type === "checkout.session.async_payment_failed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const attemptId = await findAttemptIdForSession(session);

    if (attemptId) {
      await closePaymentAttempt({
        paymentAttemptId: attemptId,
        status: "FAILED",
        failureCode: "async_payment_failed",
      });
    }
  } else if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const attemptId = await findAttemptIdForSession(session);

    if (attemptId) {
      await closePaymentAttempt({
        paymentAttemptId: attemptId,
        status: "EXPIRED",
        failureCode: "checkout_session_expired",
      });
    }
  } else if (
    event.type === "payment_intent.processing" ||
    event.type === "payment_intent.payment_failed"
  ) {
    const intent = event.data.object as Stripe.PaymentIntent;
    const attemptId = intent.metadata.localPaymentAttemptId;

    if (attemptId) {
      const status =
        event.type === "payment_intent.processing" ? "PROCESSING" : "FAILED";
      await prisma.paymentAttempt.updateMany({
        where: { id: attemptId, status: { not: "PAID" } },
        data: {
          status,
          stripePaymentIntentId: intent.id,
          failureCode: intent.last_payment_error?.decline_code ??
            intent.last_payment_error?.code ?? null,
        },
      });
      await prisma.order.updateMany({
        where: {
          paymentStatus: { not: "PAID" },
          paymentAttempts: { some: { id: attemptId } },
        },
        data: { paymentStatus: status },
      });
    }
  } else if (event.type === "payment_intent.canceled") {
    const intent = event.data.object as Stripe.PaymentIntent;
    const attemptId = intent.metadata.localPaymentAttemptId;

    if (attemptId) {
      await closePaymentAttempt({
        paymentAttemptId: attemptId,
        status: "CANCELED",
        failureCode: "payment_intent_canceled",
      });
    }
  }

  await prisma.stripeWebhookEvent.create({
    data: { id: event.id, eventType: event.type },
  });
}

export async function getCheckoutResult(userId: number, sessionId: string) {
  const attempt = await prisma.paymentAttempt.findFirst({
    where: {
      stripeCheckoutSessionId: sessionId,
      order: { userId },
    },
    include: { order: true },
  });

  if (!attempt) {
    return null;
  }

  if (attempt.status !== "PAID") {
    const session = await getStripe().checkout.sessions.retrieve(sessionId);

    if (session.payment_status === "paid") {
      await finalizePaidAttempt(attempt.id, paymentIntentIdFromSession(session));
      await rememberSuccessfulPaymentMethod(session);
    }
  }

  const current = await prisma.paymentAttempt.findUnique({
    where: { id: attempt.id },
    include: { order: true },
  });

  if (!current) {
    return null;
  }

  return {
    orderId: current.order.id,
    orderNumber: current.order.orderNumber,
    paymentMethod: current.order.paymentMethod,
    paymentStatus: current.status,
    amount: Number(current.amount),
  };
}
