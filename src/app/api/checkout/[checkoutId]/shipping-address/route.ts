import { NextResponse } from "next/server";

import { OrderServiceError, saveOrderShippingSnapshot } from "@/lib/services/order.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { checkoutDraftParamsSchema, shippingAddressSchema } from "@/lib/validations/payment";

type RouteContext = { params: Promise<{ checkoutId: string }> };

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const user = await getUserSession();
    if (!user) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
    const paramsValidation = validateRequest(checkoutDraftParamsSchema, await params);
    if (!paramsValidation.success) return paramsValidation.response;
    const bodyValidation = validateRequest(shippingAddressSchema, await request.json());
    if (!bodyValidation.success) return bodyValidation.response;
    await saveOrderShippingSnapshot({
      userId: user.id,
      orderId: paramsValidation.data.checkoutId,
      ...bodyValidation.data,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof OrderServiceError) return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    console.error("Save checkout shipping error:", error);
    return NextResponse.json({ success: false, message: "Unable to save delivery details." }, { status: 500 });
  }
}
