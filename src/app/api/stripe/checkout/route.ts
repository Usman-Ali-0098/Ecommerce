import { NextResponse } from "next/server";

import { createStripeCheckout } from "@/lib/services/payment.service";
import { OrderServiceError } from "@/lib/services/order.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { createCheckoutSchema } from "@/lib/validations/payment";

export async function POST(request: Request) {
  try {
    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User authentication required." },
        { status: 401 },
      );
    }

    const validation = validateRequest(
      createCheckoutSchema,
      await request.json(),
    );

    if (!validation.success) {
      return validation.response;
    }

    const origin = new URL(request.url).origin;
    const checkout = await createStripeCheckout({
      userId: user.id,
      cartItemIds: validation.data.cartItemIds,
      returnUrlBase: origin,
    });

    return NextResponse.json({ success: true, data: checkout }, { status: 201 });
  } catch (error) {
    console.error("Create Stripe checkout error:", error);

    if (error instanceof OrderServiceError) {
      return NextResponse.json(
        { success: false, message: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Unable to start secure checkout. Please try again.",
      },
      { status: 500 },
    );
  }
}
