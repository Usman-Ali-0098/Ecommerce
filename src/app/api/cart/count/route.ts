import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { getCartCount } from "@/lib/services/cart.service";
import { getUserSession } from "@/lib/user-auth";

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

    if (session.user.role !== "USER") {
      return NextResponse.json(
        { success: false, count: 0, message: "Forbidden." },
        { status: 403 },
      );
    }

    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        { success: false, count: 0, message: "Invalid user session." },
        { status: 401 },
      );
    }

    const count =
      await getCartCount(user.id);

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
