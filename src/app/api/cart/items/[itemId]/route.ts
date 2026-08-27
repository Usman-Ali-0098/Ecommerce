import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import {
  cartItemParamsSchema,
  updateCartItemSchema,
} from "@/lib/validations/cart";

type RouteContext = {
  params: Promise<{
    itemId: string;
  }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
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

    const userId = user.id;

    const paramsValidation = validateRequest(
      cartItemParamsSchema,
      await context.params,
    );

    if (!paramsValidation.success) {
      return paramsValidation.response;
    }

    const bodyValidation = validateRequest(
      updateCartItemSchema,
      await request.json(),
    );

    if (!bodyValidation.success) {
      return bodyValidation.response;
    }

    const { itemId } = paramsValidation.data;
    const { quantity } = bodyValidation.data;

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,

        cart: {
          userId,
        },
      },

      include: {
        variant: {
          select: {
            id: true,
            stock: true,
            isActive: true,

            product: {
              select: {
                isActive: true,

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
    });

    if (!cartItem) {
      return NextResponse.json(
        {
          success: false,
          message: "Cart item not found.",
        },
        {
          status: 404,
        },
      );
    }

    const variant = cartItem.variant;

    if (
      !variant.isActive ||
      !variant.product.isActive ||
      !variant.product.category.isActive
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "This product is no longer available.",
        },
        {
          status: 400,
        },
      );
    }

    if (variant.stock <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "This item is out of stock.",
        },
        {
          status: 400,
        },
      );
    }

    if (quantity > variant.stock) {
      return NextResponse.json(
        {
          success: false,
          message: `Only ${variant.stock} item(s) are available.`,
        },
        {
          status: 400,
        },
      );
    }

    const updatedItem = await prisma.cartItem.update({
      where: {
        id: itemId,
      },

      data: {
        quantity,
      },

      include: {
        variant: {
          select: {
            price: true,
            stock: true,
          },
        },
      },
    });

    const unitPrice = Number(updatedItem.variant.price);

    const lineTotal = unitPrice * updatedItem.quantity;

    return NextResponse.json({
      success: true,
      message: "Cart quantity updated.",
      data: {
        id: updatedItem.id,
        quantity: updatedItem.quantity,
        stock: updatedItem.variant.stock,
        unitPrice,
        lineTotal,
      },
    });
  } catch (error) {
    console.error("Update cart item error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update cart item.",
      },
      {
        status: 500,
      },
    );
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
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

    const userId = user.id;

    const validation = validateRequest(
      cartItemParamsSchema,
      await context.params,
    );

    if (!validation.success) {
      return validation.response;
    }

    const { itemId } = validation.data;

    const cartItem = await prisma.cartItem.findFirst({
      where: {
        id: itemId,

        cart: {
          userId,
        },
      },

      select: {
        id: true,
      },
    });

    if (!cartItem) {
      return NextResponse.json(
        {
          success: false,
          message: "Cart item not found.",
        },
        {
          status: 404,
        },
      );
    }

    await prisma.cartItem.delete({
      where: {
        id: cartItem.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Product removed from cart.",
    });
  } catch (error) {
    console.error("Delete cart item error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to remove cart item.",
      },
      {
        status: 500,
      },
    );
  }
}
