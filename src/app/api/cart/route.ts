import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { addCartItemSchema } from "@/lib/validations/cart";

export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message: "You must be logged in to add items to cart.",
        },
        {
          status: 401,
        }
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
        }
      );
    }

    const userId = user.id;

    const body = await request.json();
    const validation = validateRequest(addCartItemSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { variantId, quantity } = validation.data;

    const variant =
      await prisma.productVariant.findFirst({
        where: {
          id: variantId,
          isActive: true,

          product: {
            isActive: true,

            category: {
              isActive: true,
            },
          },
        },

        select: {
          id: true,
          stock: true,
        },
      });

    if (!variant) {
      return NextResponse.json(
        {
          success: false,
          message: "Product variant is not available.",
        },
        {
          status: 404,
        }
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
        }
      );
    }

    const cart = await prisma.cart.upsert({
      where: {
        userId,
      },

      update: {},

      create: {
        userId,
      },
    });

    const existingItem =
      await prisma.cartItem.findUnique({
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId,
          },
        },
      });

    const newQuantity =
      (existingItem?.quantity ?? 0) +
      quantity;

    if (newQuantity > variant.stock) {
      return NextResponse.json(
        {
          success: false,
          message: `Only ${variant.stock} item(s) are available.`,
        },
        {
          status: 400,
        }
      );
    }

    const cartItem =
      await prisma.cartItem.upsert({
        where: {
          cartId_variantId: {
            cartId: cart.id,
            variantId,
          },
        },

        update: {
          quantity: newQuantity,
        },

        create: {
          cartId: cart.id,
          variantId,
          quantity,
        },
      });

    return NextResponse.json(
      {
        success: true,
        message: "Product added to cart.",
        data: {
          cartItem,
          stock: variant.stock,
          availableToAdd: Math.max(0, variant.stock - cartItem.quantity),
        },
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Add to cart error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to add product to cart.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: "Unauthorized." },
        { status: 401 },
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
        { success: false, message: "Invalid user session." },
        { status: 401 },
      );
    }

    const deleted = await prisma.cartItem.deleteMany({
      where: {
        cart: {
          userId: user.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message:
        deleted.count === 1
          ? "Product removed from cart."
          : `${deleted.count} products removed from cart.`,
      data: {
        deletedCount: deleted.count,
      },
    });
  } catch (error) {
    console.error("Delete all cart items error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to clear the cart." },
      { status: 500 },
    );
  }
}
