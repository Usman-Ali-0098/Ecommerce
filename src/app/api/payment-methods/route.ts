import { NextResponse } from "next/server";

import {
  listSavedPaymentMethods,
  removeSavedPaymentMethod,
  setDefaultPaymentMethod,
} from "@/lib/services/stripe-customer.service";
import { getUserSession } from "@/lib/user-auth";
import { validateRequest } from "@/lib/validate-request";
import { paymentMethodActionSchema } from "@/lib/validations/payment";

export async function GET() {
  try {
    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User authentication required." },
        { status: 401 },
      );
    }

    const paymentMethods = await listSavedPaymentMethods(user.id);
    return NextResponse.json({ success: true, data: { paymentMethods } });
  } catch (error) {
    console.error("List payment methods error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to load payment methods." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User authentication required." },
        { status: 401 },
      );
    }

    const validation = validateRequest(
      paymentMethodActionSchema,
      await request.json(),
    );

    if (!validation.success) {
      return validation.response;
    }

    if (validation.data.action === "remove") {
      await removeSavedPaymentMethod(
        user.id,
        validation.data.paymentMethodId,
      );
    } else {
      await setDefaultPaymentMethod(
        user.id,
        validation.data.paymentMethodId,
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update payment method error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to update payment method." },
      { status: 500 },
    );
  }
}
