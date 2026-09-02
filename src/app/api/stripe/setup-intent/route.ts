import { NextResponse } from "next/server";

import { createSetupIntent } from "@/lib/services/stripe-customer.service";
import { getStripePublishableKey } from "@/lib/stripe";
import { getUserSession } from "@/lib/user-auth";

export async function POST() {
  try {
    const user = await getUserSession();

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User authentication required." },
        { status: 401 },
      );
    }

    const setup = await createSetupIntent(user.id);

    return NextResponse.json({
      success: true,
      data: { ...setup, publishableKey: getStripePublishableKey() },
    });
  } catch (error) {
    console.error("Create SetupIntent error:", error);
    return NextResponse.json(
      { success: false, message: "Unable to start payment method setup." },
      { status: 500 },
    );
  }
}
