import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUserSession } from "@/lib/user-auth";

import {
  createReservedOrder,
  getUserOrders,
  OrderServiceError,
} from "@/lib/services/order.service";
import { validateRequest } from "@/lib/validate-request";
import { orderListQuerySchema } from "@/lib/validations/order";
import { createCheckoutSchema } from "@/lib/validations/payment";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in to view your orders.",
        },
        {
          status: 401,
        },
      );
    }

    if (session.user.role !== "USER") {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 },
      );
    }

    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user session.",
        },
        {
          status: 401,
        },
      );
    }

    const { searchParams } = new URL(request.url);
    const validation = validateRequest(
      orderListQuerySchema,
      Object.fromEntries(searchParams),
    );

    if (!validation.success) {
      return validation.response;
    }

    const { page, pageSize } = validation.data;

    const result = await getUserOrders({
      userId: user.id,
      page,
      pageSize,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Get orders error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load orders.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in to place an order.",
        },
        {
          status: 401,
        },
      );
    }

    if (session.user.role !== "USER") {
      return NextResponse.json(
        { success: false, message: "Forbidden." },
        { status: 403 },
      );
    }

    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid user session.",
        },
        {
          status: 401,
        },
      );
    }

    const body = await request.json();
    const validation = validateRequest(createCheckoutSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { cartItemIds } = validation.data;

    const order = await createReservedOrder({
      userId: user.id,
      cartItemIds,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Order placed successfully.",
        data: { orderId: order.id },
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    console.error("Place order error:", error);

    if (error instanceof OrderServiceError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
        },
        {
          status: 400,
        },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while placing your order.",
      },
      {
        status: 500,
      },
    );
  }
}
