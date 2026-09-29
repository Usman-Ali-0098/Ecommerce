import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getUserCart } from "@/lib/services/cart.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { addCartItemSchema, deleteCartItemsSchema } from "@/lib/validations/cart";

// Matches the tax calculation already used by /checkout's own page.tsx --
// duplicated here rather than shared since it's a single line, and this is
// the chat widget's read of the same cart before it hands cartItemIds off
// to the same <CheckoutForm> component /checkout itself renders.
const TAX_RATE = 0.1;

/** Used by the chat widget to know what's currently in the signed-in
 * customer's cart before opening the in-widget checkout flow -- the widget
 * needs real cartItemIds and a real total to pass into <CheckoutForm>,
 * the same component /checkout renders, not a re-derived one.
 *
 * Optional `?itemIds=a,b,c` scopes the response to just those cart items --
 * used when the chat widget wants to check out only what the customer
 * added *through the conversation*, not everything already sitting in
 * their cart from browsing elsewhere. Filtering (and the subtotal/tax/total
 * math for that subset) happens here, server-side, rather than in the
 * widget, so the 10% tax rate stays defined in exactly one place. */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id || session.user.role !== "USER") {
      return NextResponse.json(
        { success: false, message: "You must be logged in to view your cart." },
        { status: 401 },
      );
    }

    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Invalid user session." },
        { status: 401 },
      );
    }

    const cart = await getUserCart(user.id);

    const itemIdsParam = new URL(request.url).searchParams.get("itemIds");
    const filterIds = itemIdsParam
      ? new Set(itemIdsParam.split(",").map((id) => id.trim()).filter(Boolean))
      : null;
    const items = filterIds ? cart.items.filter((item) => filterIds.has(item.id)) : cart.items;

    const subtotal = Math.round(items.reduce((sum, item) => sum + item.lineTotal, 0));
    const tax = Math.round(subtotal * TAX_RATE);

    return NextResponse.json({
      success: true,
      data: {
        cartItemIds: items.map((item) => item.id),
        totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
        subtotal,
        tax,
        total: subtotal + tax,
        items: items.map((item) => ({
          id: item.id,
          product: item.product.name,
          color: item.variant.color?.name ?? null,
          size: item.variant.size?.name ?? null,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        })),
      },
    });
  } catch (error) {
    console.error("Get cart error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to load your cart." },
      { status: 500 },
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

export async function DELETE(request: Request) {
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

    const body = await request.json();
    const validation = validateRequest(deleteCartItemsSchema, body);

    if (!validation.success) {
      return validation.response;
    }

    const { itemIds } = validation.data;

    // Scoped to the selected items only — this is "delete selected", not
    // "clear the whole cart". cart.userId still enforces that a user can
    // only ever delete their own rows.
    const deleted = await prisma.cartItem.deleteMany({
      where: {
        id: { in: itemIds },
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
    console.error("Delete cart items error:", error);

    return NextResponse.json(
      { success: false, message: "Unable to remove the selected products." },
      { status: 500 },
    );
  }
}
