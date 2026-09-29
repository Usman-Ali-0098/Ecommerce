import { NextResponse } from "next/server";

import { getCheckoutResult } from "@/lib/services/payment.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { retryPaymentParamsSchema } from "@/lib/validations/payment";

type RouteContext = { params: Promise<{ orderId: string }> };

/** Same synchronous Stripe reconciliation /payment/complete's own page
 * load already triggers on every fresh or retried card payment -- calling
 * getCheckoutResult() checks the PaymentIntent directly against Stripe
 * (not just whatever's currently in the DB) and, if it succeeded,
 * finalizes the order right here: paid status, customer + admin
 * notifications, saved card -- via the same finalizePaidAttempt() the
 * webhook itself calls.
 *
 * The embedded chat checkout deliberately never navigates to
 * /payment/complete (see chat-checkout-panel.tsx for why), so nothing else
 * triggers that reconciliation for it. This route lets the chat flow call
 * it directly right after stripe.confirmCardPayment() succeeds, so the
 * order is genuinely PAID -- and both notifications already exist -- by
 * the time the customer sees "Order placed" in the widget. */
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const validation = validateRequest(retryPaymentParamsSchema, await params);
    if (!validation.success) return validation.response;

    const result = await getCheckoutResult(user.id, validation.data.orderId);
    if (!result) {
      return NextResponse.json({ success: false, message: "Order not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Get payment result error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to check payment status." },
      { status: 500 },
    );
  }
}
