import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getUserSession } from "@/lib/user-auth";

import {
  createOrder,
  getUserOrders,
  OrderServiceError,
} from "@/lib/services/order.service";

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

    const parsedPage = Number(searchParams.get("page"));

    const parsedPageSize = Number(searchParams.get("pageSize"));

    const page =
      Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;

    const pageSize =
      Number.isInteger(parsedPageSize) && parsedPageSize > 0
        ? Math.min(parsedPageSize, 100)
        : 20;

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

    const rawCartItemIds = body?.cartItemIds;

    if (!Array.isArray(rawCartItemIds)) {
      return NextResponse.json(
        {
          success: false,
          message: "Cart item IDs are required.",
        },
        {
          status: 400,
        },
      );
    }

    const cartItemIds = [
      ...new Set(
        rawCartItemIds
          .filter((id): id is string => typeof id === "string")
          .map((id) => id.trim())
          .filter((id) => id.length > 0),
      ),
    ];

    if (cartItemIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Please select at least one cart item.",
        },
        {
          status: 400,
        },
      );
    }

    const order = await createOrder({
      userId: user.id,
      cartItemIds,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Order placed successfully.",
        data: order,
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
