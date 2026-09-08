import { NextResponse } from "next/server";

import {
  PaymentServiceError,
  placeCashOnDeliveryOrder,
} from "@/lib/services/payment.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { cashOnDeliverySchema } from "@/lib/validations/payment";

export async function POST(request: Request) {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const validation = validateRequest(cashOnDeliverySchema, await request.json());
    if (!validation.success) return validation.response;

    const order = await placeCashOnDeliveryOrder(user.id, validation.data.orderId);
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    console.error("Cash on delivery error:", error);
    if (error instanceof PaymentServiceError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, message: "Unable to place cash on delivery order." },
      { status: 500 },
    );
  }
}
