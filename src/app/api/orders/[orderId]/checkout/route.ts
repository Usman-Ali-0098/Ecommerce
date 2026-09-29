import { NextResponse } from "next/server";

import { getOrderCheckoutForDisplay } from "@/lib/services/order.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { retryPaymentParamsSchema } from "@/lib/validations/payment";

type RouteContext = { params: Promise<{ orderId: string }> };

/** Same data /checkout/[sessionId]'s server component fetches directly --
 * exposed here so the chat widget's retry flow (client-side) can resume a
 * failed order the same way that page does: shipping already on file,
 * jump straight to payment. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const validation = validateRequest(retryPaymentParamsSchema, await params);
    if (!validation.success) return validation.response;

    const checkout = await getOrderCheckoutForDisplay(user.id, validation.data.orderId);
    if (!checkout) {
      return NextResponse.json(
        { success: false, message: "This order can no longer be retried." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: checkout });
  } catch (error) {
    console.error("Get order checkout error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load this order." },
      { status: 500 },
    );
  }
}
