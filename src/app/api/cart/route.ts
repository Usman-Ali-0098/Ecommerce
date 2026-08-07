import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

    const userId = Number(session.user.id);

    if (!Number.isInteger(userId)) {
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

    const body = await request.json();

    const variantId =
      typeof body.variantId === "string"
        ? body.variantId.trim()
        : "";

    const quantity = Number(body.quantity);

    if (!variantId) {
      return NextResponse.json(
        {
          success: false,
          message: "Variant is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Quantity must be at least 1.",
        },
        {
          status: 400,
        }
      );
    }

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