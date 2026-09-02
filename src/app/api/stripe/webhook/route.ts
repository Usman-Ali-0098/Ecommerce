import { NextResponse } from "next/server";

import { processStripeWebhook } from "@/lib/services/payment.service";
import { getStripe, getStripeWebhookSecret } from "@/lib/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { success: false, message: "Missing Stripe signature." },
      { status: 400 },
    );
  }

  try {
    const rawBody = await request.text();
    const event = getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      getStripeWebhookSecret(),
    );

    await processStripeWebhook(event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook error:", error);

    return NextResponse.json(
      { success: false, message: "Invalid or unprocessed Stripe event." },
      { status: 400 },
    );
  }
}
