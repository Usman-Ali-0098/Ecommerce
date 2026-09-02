import { NextResponse } from "next/server";

import { getCheckoutResult } from "@/lib/services/payment.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { checkoutSessionParamsSchema } from "@/lib/validations/payment";

export async function GET(request: Request) {
  try {
    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User authentication required." },
        { status: 401 },
      );
    }

    const validation = validateRequest(
      checkoutSessionParamsSchema,
      Object.fromEntries(new URL(request.url).searchParams),
    );

    if (!validation.success) {
      return validation.response;
    }

    const result = await getCheckoutResult(user.id, validation.data.sessionId);

    if (!result) {
      return NextResponse.json(
        { success: false, message: "Checkout session not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("Checkout result error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to confirm payment status." },
      { status: 500 },
    );
  }
}
