import { NextResponse } from "next/server";

import { createStripeCheckoutForOrder, PaymentServiceError } from "@/lib/services/payment.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { checkoutDraftParamsSchema } from "@/lib/validations/payment";

type RouteContext = { params: Promise<{ checkoutId: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const user = await getUserSession();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    const validation = validateRequest(checkoutDraftParamsSchema, await params);
    if (!validation.success) return validation.response;
    const checkout = await createStripeCheckoutForOrder({
      userId: user.id,
      orderId: validation.data.checkoutId,
      returnUrlBase: new URL(request.url).origin,
    });
    return NextResponse.json({ success: true, data: checkout }, { status: 201 });
  } catch (error) {
    if (error instanceof PaymentServiceError) return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    console.error("Create card checkout error:", error);
    return NextResponse.json({ success: false, message: "Unable to start card payment." }, { status: 500 });
  }
}
