import { NextResponse } from "next/server";
import { z } from "zod";

import { placeCashOnDeliveryOrder, PaymentServiceError } from "@/lib/services/payment.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { requiredIdSchema } from "@/lib/validations/common";

const codSchema = z.object({
  orderId: requiredIdSchema.optional(),
  checkoutId: requiredIdSchema.optional(),
}).refine((data) => Boolean(data.orderId || data.checkoutId), {
  message: "orderId is required",
});

export async function POST(request: Request) {
  try {
    const user = await getUserSession();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    const validation = validateRequest(codSchema, await request.json());
    if (!validation.success) return validation.response;
    const targetOrderId = (validation.data.orderId ?? validation.data.checkoutId)!;
    const order = await placeCashOnDeliveryOrder(user.id, targetOrderId);
    return NextResponse.json({ success: true, data: order });
  } catch (error) {
    if (error instanceof PaymentServiceError) return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    console.error("Place COD order error:", error);
    return NextResponse.json({ success: false, message: "Unable to place cash on delivery order." }, { status: 500 });
  }
}
