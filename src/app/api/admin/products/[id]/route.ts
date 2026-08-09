import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function DELETE(
  _request: Request,
  { params }: RouteContext
) {
  try {
    /*
     * Admin protection.
     *
     * Customer Auth.js login does
     * not give access here.
     */
    const admin = await getAdminSession();

    if (!admin) {
      return NextResponse.json(
        {
          success: false,
          message: "Admin authentication required.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Product ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Make sure product exists.
     */
    const product = await prisma.product.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        name: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        {
          success: false,
          message: "Product not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * Check whether any variant of
     * this product exists in historical
     * OrderItems.
     */
    const historicalOrderItems =
      await prisma.orderItem.count({
        where: {
          variant: {
            productId: id,
          },
        },
      });

    /*
     * CASE 1:
     * Product has been ordered before.
     *
     * Do NOT permanently delete it.
     * Historical order data should remain.
     */
    if (historicalOrderItems > 0) {
      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: {
            id,
          },

          data: {
            isActive: false,
          },
        });

        await tx.productVariant.updateMany({
          where: {
            productId: id,
          },

          data: {
            isActive: false,
          },
        });
      });

      return NextResponse.json({
        success: true,

        action: "deactivated",

        message: `${product.name} has previous orders, so it was deactivated instead of permanently deleted.`,
      });
    }

    /*
     * CASE 2:
     * Product has never been ordered.
     *
     * Safe to permanently delete.
     */
    await prisma.$transaction(async (tx) => {
      /*
       * CartItems reference variants.
       * Remove them first if your schema
       * does not already cascade.
       */
      await tx.cartItem.deleteMany({
        where: {
          variant: {
            productId: id,
          },
        },
      });

      await tx.productImage.deleteMany({
        where: {
          productId: id,
        },
      });

      await tx.productVariant.deleteMany({
        where: {
          productId: id,
        },
      });

      await tx.product.delete({
        where: {
          id,
        },
      });
    });

    return NextResponse.json({
      success: true,

      action: "deleted",

      message: `${product.name} deleted successfully.`,
    });
  } catch (error) {
    console.error(
      "Admin delete product error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          "Something went wrong while deleting the product.",
      },
      {
        status: 500,
      }
    );
  }
}