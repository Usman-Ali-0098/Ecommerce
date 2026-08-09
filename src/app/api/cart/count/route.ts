import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getCartCount } from "@/lib/services/cart.service";

export async function GET() {
  try {
    const session = await auth();

    /*
     * Logged-out user simply has
     * cart count 0.
     */
    if (!session?.user?.id) {
      return NextResponse.json({
        success: true,
        count: 0,
      });
    }

    const userId = Number(
      session.user.id
    );

    if (!Number.isInteger(userId)) {
      return NextResponse.json({
        success: true,
        count: 0,
      });
    }

    const count =
      await getCartCount(userId);

    return NextResponse.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(
      "Get cart count error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        count: 0,
        message:
          "Unable to load cart count.",
      },
      {
        status: 500,
      }
    );
  }
}