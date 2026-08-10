import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const TAX_RATE = 0.1;

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function createOrderNumber() {
  const timestamp = Date.now()
    .toString()
    .slice(-8);

  const random = Math.floor(
    1000 + Math.random() * 9000
  );

  return `ORD-${timestamp}-${random}`;
}

export async function POST(request: Request) {
  try {
    /*
     * 1. Authentication
     */
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          message:
            "You must be logged in to place an order.",
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

    /*
     * 2. Read request body
     */
    const body = await request.json();

    const rawCartItemIds =
      body?.cartItemIds;

    if (!Array.isArray(rawCartItemIds)) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Cart item IDs are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Remove invalid IDs and duplicates.
     */
    const cartItemIds = [
      ...new Set(
        rawCartItemIds.filter(
          (id): id is string =>
            typeof id === "string" &&
            id.trim().length > 0
        )
      ),
    ];

    if (cartItemIds.length === 0) {
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
     * 3. Load only selected cart items
     * belonging to this user.
     */
    const cartItems =
      await prisma.cartItem.findMany({
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
                },
              },
            },
          },
        },
      });

    /*
     * If the browser sent 3 IDs but only
     * 2 are found, one ID is invalid or
     * belongs to another user.
     */
    if (
      cartItems.length !== cartItemIds.length
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
     * 4. Initial availability checks
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
            message: `${product.name} is currently unavailable.`,
          },
          {
            status: 400,
          }
        );
      }

      if (item.quantity < 1) {
        return NextResponse.json(
          {
            success: false,
            message: `Invalid quantity for ${product.name}.`,
          },
          {
            status: 400,
          }
        );
      }

      if (variant.stock < item.quantity) {
        return NextResponse.json(
          {
            success: false,

            message:
              variant.stock === 0
                ? `${product.name} is out of stock.`
                : `Only ${variant.stock} item(s) of ${product.name} are available.`,
          },
          {
            status: 400,
          }
        );
      }
    }

    /*
     * 5. Calculate all money on server.
     *
     * Never trust subtotal/tax/total
     * sent from the browser.
     */
    const subtotal = roundMoney(
      cartItems.reduce(
        (sum, item) =>
          sum +
          Number(item.variant.price) *
            item.quantity,
        0
      )
    );

    const tax = roundMoney(
      subtotal * TAX_RATE
    );

    const total = roundMoney(
      subtotal + tax
    );

    const orderNumber =
      createOrderNumber();

    /*
     * 6. Entire checkout is one
     * database transaction.
     */
    const order =
      await prisma.$transaction(
        async (tx) => {
          /*
           * STEP A
           * Atomically reserve/decrease stock.
           *
           * The database only updates a
           * variant when:
           *
           * stock >= ordered quantity
           */
          for (const item of cartItems) {
            const stockUpdate =
              await tx.productVariant.updateMany({
                where: {
                  id: item.variantId,

                  isActive: true,

                  stock: {
                    gte: item.quantity,
                  },

                  product: {
                    isActive: true,

                    category: {
                      isActive: true,
                    },
                  },
                },

                data: {
                  stock: {
                    decrement:
                      item.quantity,
                  },
                },
              });

            /*
             * If count is zero, stock or
             * product availability changed
             * after our initial check.
             */
            if (
              stockUpdate.count !== 1
            ) {
              throw new Error(
                `INSUFFICIENT_STOCK:${item.variant.product.name}`
              );
            }
          }

          /*
           * STEP B
           * Create the order.
           */
          const newOrder =
            await tx.order.create({
              data: {
                orderNumber,
                userId,

                status: "PENDING",

                subtotal,
                tax,
                total,
              },
            });

          /*
           * STEP C
           * Create permanent order-item
           * snapshots.
           */
          await tx.orderItem.createMany({
            data: cartItems.map(
              (item) => {
                const variant =
                  item.variant;

                const product =
                  variant.product;

                const unitPrice =
                  Number(variant.price);

                return {
                  orderId:
                    newOrder.id,

                  variantId:
                    variant.id,

                  productName:
                    product.name,

                  sku:
                    variant.sku,

                  colorName:
                    variant.color?.name ??
                    null,

                  sizeName:
                    variant.size?.name ??
                    null,

                  unitPrice,

                  quantity:
                    item.quantity,

                  lineTotal:
                    roundMoney(
                      unitPrice *
                        item.quantity
                    ),
                };
              }
            ),
          });

          /*
           * STEP D
           * Create customer notification.
           *
           * This is inside the same
           * transaction, which means the
           * notification cannot exist if
           * checkout fails.
           */
          await tx.notification.create({
            data: {
              userId,

              orderId:
                newOrder.id,

              type:
                "ORDER_PLACED",

              title:
                "Order Placed Successfully",

              message: `Your order ${newOrder.orderNumber} has been placed successfully.`,
            },
          });






          await tx.adminNotification.create({
  data: {
    orderId:
      newOrder.id,

    type:
      "NEW_ORDER",

    title:
      "New Order Placed",

    message: `A customer placed order ${newOrder.orderNumber} for Rs. ${Number(
      newOrder.total
    ).toLocaleString("en-PK")}.`,
  },
});


          /*
           * STEP E
           * Remove ONLY the selected items
           * from the user's cart.
           *
           * Unselected products remain.
           */
          const deleted =
            await tx.cartItem.deleteMany({
              where: {
                id: {
                  in: cartItemIds,
                },

                cart: {
                  userId,
                },
              },
            });

          /*
           * Extra protection against the cart
           * changing during checkout.
           */
          if (
            deleted.count !==
            cartItemIds.length
          ) {
            throw new Error(
              "CART_CHANGED"
            );
          }

          return newOrder;
        }
      );

    /*
     * 7. Checkout succeeded.
     */
    return NextResponse.json(
      {
        success: true,

        message:
          "Order placed successfully.",

        data: {
          id: order.id,

          orderNumber:
            order.orderNumber,

          status:
            order.status,

          subtotal:
            Number(order.subtotal),

          tax:
            Number(order.tax),

          total:
            Number(order.total),
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
     * Stock changed during checkout.
     */
    if (error instanceof Error) {
      if (
        error.message.startsWith(
          "INSUFFICIENT_STOCK:"
        )
      ) {
        const productName =
          error.message
            .split(":")
            .slice(1)
            .join(":");

        return NextResponse.json(
          {
            success: false,

            message: `${productName} no longer has enough stock. Please review your cart and try again.`,
          },
          {
            status: 400,
          }
        );
      }

      /*
       * Cart was changed while the
       * transaction was running.
       */
      if (
        error.message ===
        "CART_CHANGED"
      ) {
        return NextResponse.json(
          {
            success: false,

            message:
              "Your cart changed while placing the order. Please refresh your cart and try again.",
          },
          {
            status: 400,
          }
        );
      }
    }

    return NextResponse.json(
      {
        success: false,

        message:
          "Something went wrong while placing your order.",
      },
      {
        status: 500,
      }
    );
  }
}