import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export class StripeConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StripeConfigurationError";
  }
}

export function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();

  if (!secretKey) {
    throw new StripeConfigurationError(
      "Stripe sandbox is not configured. Add STRIPE_SECRET_KEY to the environment.",
    );
  }

  if (!secretKey.startsWith("sk_test_")) {
    throw new StripeConfigurationError(
      "This application only accepts a Stripe sandbox secret key (sk_test_...).",
    );
  }

  stripeClient ??= new Stripe(secretKey);

  return stripeClient;
}

export function getStripePublishableKey() {
  const publishableKey =
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();

  if (!publishableKey?.startsWith("pk_test_")) {
    throw new StripeConfigurationError(
      "This application only accepts a Stripe sandbox publishable key (pk_test_...).",
    );
  }

  return publishableKey;
}

export function getStripeWebhookSecret() {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();

  if (!webhookSecret?.startsWith("whsec_")) {
    throw new StripeConfigurationError(
      "Stripe webhook signing secret is not configured.",
    );
  }

  return webhookSecret;
}
