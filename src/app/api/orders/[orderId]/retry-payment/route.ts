import { NextResponse } from "next/server";

import { OrderServiceError } from "@/lib/services/order.service";
import { createStripeRetryPaymentIntent } from "@/lib/services/payment.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { retryPaymentParamsSchema } from "@/lib/validations/payment";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const validation = validateRequest(retryPaymentParamsSchema, await params);
    if (!validation.success) return validation.response;

    const checkout = await createStripeRetryPaymentIntent({
      userId: user.id,
      orderId: validation.data.orderId,
    });

    return NextResponse.json({ success: true, data: checkout }, { status: 201 });
  } catch (error) {
    console.error("Retry payment error:", error);
    if (error instanceof OrderServiceError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, message: "Unable to start payment retry." },
      { status: 500 },
    );
  }
}
