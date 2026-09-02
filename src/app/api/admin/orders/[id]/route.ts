import {
  NextResponse,
} from "next/server";

import {
  getAdminSession,
} from "@/lib/admin-auth";

import {
  prisma,
} from "@/lib/prisma";
import { validateRequest } from "@/lib/validate-request";
import {
  adminIdParamsSchema,
  adminOrderStatusSchema,
} from "@/lib/validations/admin";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

const allowedTransitions:
  Record<
    OrderStatus,
    OrderStatus[]
  > = {
  PENDING: [
    "PROCESSING",
  ],

  PROCESSING: [
    "SHIPPED",
  ],

  SHIPPED: [
    "DELIVERED",
  ],

  DELIVERED: [],

  CANCELLED: [],
};

class ConcurrentOrderUpdateError extends Error {}

function getNotificationData(
  orderNumber: string,
  status: OrderStatus
) {
  switch (status) {
    case "PROCESSING":
      return {
        type:
          "ORDER_PROCESSING" as const,

        title:
          "Order Processing",

        message:
          `Your order ${orderNumber} is now being processed.`,
      };

    case "SHIPPED":
      return {
        type:
          "ORDER_SHIPPED" as const,

        title:
          "Order Shipped",

        message:
          `Your order ${orderNumber} has been shipped.`,
      };

    case "DELIVERED":
      return {
        type:
          "ORDER_DELIVERED" as const,

        title:
          "Order Delivered",

        message:
          `Your order ${orderNumber} has been delivered.`,
      };

    default:
      return null;
  }
}

export async function PATCH(
  request: Request,
  { params }: RouteContext
) {
  try {
    /*
     * Admin auth.
     */
    const admin =
      await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Admin authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const paramsValidation = validateRequest(adminIdParamsSchema, await params);

    if (!paramsValidation.success) {
      return paramsValidation.response;
    }

    const bodyValidation = validateRequest(
      adminOrderStatusSchema,
      await request.json(),
    );

    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    const { id } = paramsValidation.data;
    const newStatus = bodyValidation.data.status;

    /*
     * Load order.
     */
    const order =
      await prisma.order.findUnique({
        where: {
          id,
        },

      });

    if (!order) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order not found.",
        },
        {
          status: 404,
        }
      );
    }

    const currentStatus =
      order.status as
        OrderStatus;

    if (order.paymentMethod === "CARD" && order.paymentStatus !== "PAID") {
      return NextResponse.json(
        {
          success: false,
          message: "Card payment must be confirmed before this order can be processed.",
        },
        { status: 409 },
      );
    }

    if (
      currentStatus ===
      newStatus
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Order already has this status.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Protect order lifecycle.
     */
    if (
      !allowedTransitions[
        currentStatus
      ].includes(
        newStatus
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          message:
            `Order cannot move from ${currentStatus} to ${newStatus}.`,
        },
        {
          status: 400,
        }
      );
    }

    const notification =
      getNotificationData(
        order.orderNumber,
        newStatus
      );

    /*
     * Everything important happens
     * in one transaction.
     */
    await prisma.$transaction(
      async (tx) => {
        const statusUpdate = await tx.order.updateMany({
          where: {
            id,
            status: currentStatus,
            OR: [
              { paymentMethod: { not: "CARD" } },
              { paymentStatus: "PAID" },
            ],
          },

          data: {
            status:
              newStatus,
          },
        });

        if (statusUpdate.count !== 1) {
          throw new ConcurrentOrderUpdateError(
            "Order status changed while this request was being processed.",
          );
        }

        /*
         * Customer notification.
         */
        if (notification) {
          await tx.notification.create({
            data: {
              userId:
                order.userId,

              orderId:
                order.id,

              type:
                notification.type,

              title:
                notification.title,

              message:
                notification.message,
            },
          });
        }
      },
      {
        maxWait: 10_000,
        timeout: 30_000,
      },
    );

    return NextResponse.json({
      success: true,

      message:
        `Order status changed to ${newStatus.toLowerCase()}.`,
    });
  } catch (error) {
    if (error instanceof ConcurrentOrderUpdateError) {
      return NextResponse.json(
        {
          success: false,
          message: "This order was updated by another request. Refresh and try again.",
        },
        { status: 409 },
      );
    }

    console.error(
      "Admin order status update error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        message:
          "Something went wrong while updating the order.",
      },
      {
        status: 500,
      }
    );
  }
}
