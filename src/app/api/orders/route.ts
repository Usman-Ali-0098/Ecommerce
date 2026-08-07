import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const TAX_RATE = 0.1;

export async function POST(request: Request) {
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

    /*
     * Frontend sends:
     *
     * {
     *   cartItemIds: ["id1", "id2"]
     * }
     */
    const cartItemIds = Array.isArray(
      body.cartItemIds
    )
      ? body.cartItemIds.filter(
          (id: unknown): id is string =>
            typeof id === "string" &&
            id.trim().length > 0
        )
      : [];

    /*
     * Remove duplicate IDs.
     */
    const uniqueCartItemIds = [
      ...new Set(cartItemIds),
    ];

    if (uniqueCartItemIds.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Please select at least one cart item.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Get selected cart items from database.
     *
     * Important:
     * cart.userId ensures these items
     * actually belong to the logged-in user.
     */
    const cartItems =
      await prisma.cartItem.findMany({
        where: {
          id: {
            in: uniqueCartItemIds,
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
                },
              },
            },
          },
        },
      });

    /*
     * Example:
     *
     * Browser sent 3 item IDs
     * Database found only 2
     *
     * This can mean:
     * - invalid ID
     * - another user's cart item
     * - item already deleted
     */
    if (
      cartItems.length !==
      uniqueCartItemIds.length
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more selected cart items are invalid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * First validation before transaction.
     */
    for (const item of cartItems) {
      const variant = item.variant;
      const product = variant.product;

      if (
        !variant.isActive ||
        !product.isActive ||
        !product.category.isActive
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `${product.name} is no longer available.`,
          },
          {
            status: 400,
          }
        );
      }

      if (variant.stock <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: `${product.name} is out of stock.`,
          },
          {
            status: 400,
          }
        );
      }

      if (
        item.quantity > variant.stock
      ) {
        return NextResponse.json(
          {
            success: false,
            message: `Only ${variant.stock} item(s) of ${product.name} are available.`,
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * Calculate order amounts using
     * CURRENT DATABASE prices.
     *
     * Never trust subtotal/tax/total
     * sent from the frontend.
     */
    const subtotal = cartItems.reduce(
      (sum, item) => {
        const unitPrice = Number(
          item.variant.price
        );

        return (
          sum +
          unitPrice * item.quantity
        );
      },
      0
    );

    const tax =
      subtotal * TAX_RATE;

    const total =
      subtotal + tax;

    /*
     * Human-readable order number.
     *
     * Database still has its own cuid ID.
     */
    const orderNumber =
      createOrderNumber();

    /*
     * TRANSACTION
     *
     * Everything inside this block
     * succeeds together.
     *
     * If one operation fails,
     * everything is rolled back.
     */
    const order =
      await prisma.$transaction(
        async (tx) => {
          /*
           * STEP 1:
           * Recheck every variant inside
           * the transaction.
           */
          for (const item of cartItems) {
            const currentVariant =
              await tx.productVariant.findUnique({
                where: {
                  id: item.variant.id,
                },

                select: {
                  id: true,
                  stock: true,
                  isActive: true,

                  product: {
                    select: {
                      name: true,
                      isActive: true,

                      category: {
                        select: {
                          isActive: true,
                        },
                      },
                    },
                  },
                },
              });

            if (
              !currentVariant ||
              !currentVariant.isActive ||
              !currentVariant.product
                .isActive ||
              !currentVariant.product
                .category.isActive
            ) {
              throw new Error(
                `VARIANT_UNAVAILABLE:${item.variant.product.name}`
              );
            }

            if (
              currentVariant.stock <
              item.quantity
            ) {
              throw new Error(
                `INSUFFICIENT_STOCK:${item.variant.product.name}:${currentVariant.stock}`
              );
            }
          }

          /*
           * STEP 2:
           * Create main Order row.
           */
          const newOrder =
            await tx.order.create({
              data: {
                orderNumber,
                userId,

                subtotal,
                tax,
                total,

                status: "PENDING",
              },
            });

          /*
           * STEP 3:
           * Create OrderItem snapshots.
           *
           * These values remain historically
           * correct even if product data changes
           * in the future.
           */
          await tx.orderItem.createMany({
            data: cartItems.map(
              (item) => {
                const unitPrice = Number(
                  item.variant.price
                );

                return {
                  orderId:
                    newOrder.id,

                  variantId:
                    item.variant.id,

                  productName:
                    item.variant.product.name,

                  sku:
                    item.variant.sku,

                  colorName:
                    item.variant.color
                      ?.name ?? null,

                  sizeName:
                    item.variant.size
                      ?.name ?? null,

                  unitPrice,

                  quantity:
                    item.quantity,

                  lineTotal:
                    unitPrice *
                    item.quantity,
                };
              }
            ),
          });

          /*
           * STEP 4:
           * Reduce stock for each
           * purchased variant.
           */
          for (const item of cartItems) {
            await tx.productVariant.update({
              where: {
                id: item.variant.id,
              },

              data: {
                stock: {
                  decrement:
                    item.quantity,
                },
              },
            });
          }

          /*
           * STEP 5:
           * Remove ONLY ordered cart items.
           *
           * Unselected items stay in cart.
           */
          await tx.cartItem.deleteMany({
            where: {
              id: {
                in: uniqueCartItemIds,
              },

              cart: {
                userId,
              },
            },
          });

          return newOrder;
        }
      );

    return NextResponse.json(
      {
        success: true,
        message:
          "Order placed successfully.",

        data: {
          id: order.id,

          orderNumber:
            order.orderNumber,

          subtotal: Number(
            order.subtotal
          ),

          tax: Number(
            order.tax
          ),

          total: Number(
            order.total
          ),

          status:
            order.status,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "Place order error:",
      error
    );

    /*
     * Transaction stock error.
     */
    if (
      error instanceof Error &&
      error.message.startsWith(
        "INSUFFICIENT_STOCK:"
      )
    ) {
      const parts =
        error.message.split(":");

      const productName =
        parts[1] ??
        "Product";

      const stock =
        parts[2] ??
        "0";

      return NextResponse.json(
        {
          success: false,
          message: `Only ${stock} item(s) of ${productName} are currently available.`,
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Product/variant became unavailable
     * while transaction was running.
     */
    if (
      error instanceof Error &&
      error.message.startsWith(
        "VARIANT_UNAVAILABLE:"
      )
    ) {
      const parts =
        error.message.split(":");

      const productName =
        parts[1] ??
        "Product";

      return NextResponse.json(
        {
          success: false,
          message: `${productName} is no longer available.`,
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message:
          "Unable to place order.",
      },
      {
        status: 500,
      }
    );
  }
}

function createOrderNumber() {
  const timestamp = Date.now()
    .toString()
    .slice(-8);

  const random = Math.floor(
    1000 +
      Math.random() * 9000
  );

  return `ORD-${timestamp}-${random}`;
}