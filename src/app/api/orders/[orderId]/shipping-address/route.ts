import { NextResponse } from "next/server";

import {
  OrderServiceError,
  saveOrderShippingSnapshot,
} from "@/lib/services/order.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import {
  retryPaymentParamsSchema,
  shippingAddressSchema,
} from "@/lib/validations/payment";

type RouteContext = { params: Promise<{ orderId: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const user = await getUserSession();
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    }

    const paramsValidation = validateRequest(retryPaymentParamsSchema, await params);
    if (!paramsValidation.success) return paramsValidation.response;
    const bodyValidation = validateRequest(shippingAddressSchema, await request.json());
    if (!bodyValidation.success) return bodyValidation.response;

    await saveOrderShippingSnapshot({
      userId: user.id,
      orderId: paramsValidation.data.orderId,
      ...bodyValidation.data,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Save shipping snapshot error:", error);
    if (error instanceof OrderServiceError) {
      return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { success: false, message: "Unable to save delivery details." },
      { status: 500 },
    );
  }
}
