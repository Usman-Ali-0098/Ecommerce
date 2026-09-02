import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

type EnsureStripeCustomerParams = {
  userId: number;
};

export async function ensureStripeCustomer({
  userId,
}: EnsureStripeCustomerParams) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      fullName: true,
      stripeCustomerId: true,
    },
  });

  if (!user) {
    throw new Error("User not found while creating Stripe customer.");
  }

  if (user.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  const stripe = getStripe();
  const customer = await stripe.customers.create(
    {
      email: user.email,
      name: user.fullName,
      metadata: {
        localUserId: user.id.toString(),
      },
    },
    {
      idempotencyKey: `customer:user:${user.id}`,
    },
  );

  const updated = await prisma.user.updateMany({
    where: {
      id: user.id,
      stripeCustomerId: null,
    },
    data: {
      stripeCustomerId: customer.id,
    },
  });

  if (updated.count === 1) {
    return customer.id;
  }

  const concurrentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { stripeCustomerId: true },
  });

  if (!concurrentUser?.stripeCustomerId) {
    throw new Error("Unable to associate Stripe customer with user.");
  }

  return concurrentUser.stripeCustomerId;
}

export async function listSavedPaymentMethods(userId: number) {
  const customerId = await ensureStripeCustomer({ userId });
  const stripe = getStripe();

  const [methods, user] = await Promise.all([
    stripe.paymentMethods.list({ customer: customerId, type: "card" }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { stripeDefaultPaymentMethodId: true },
    }),
  ]);

  return methods.data.map((method) => ({
    id: method.id,
    brand: method.card?.brand ?? "card",
    last4: method.card?.last4 ?? "••••",
    expMonth: method.card?.exp_month ?? null,
    expYear: method.card?.exp_year ?? null,
    isDefault: user?.stripeDefaultPaymentMethodId === method.id,
  }));
}

export async function createSetupIntent(userId: number) {
  const customerId = await ensureStripeCustomer({ userId });
  const setupIntent = await getStripe().setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
    usage: "off_session",
    metadata: { localUserId: userId.toString() },
  });

  if (!setupIntent.client_secret) {
    throw new Error("Stripe SetupIntent did not return a client secret.");
  }

  return { clientSecret: setupIntent.client_secret };
}

async function requireOwnedPaymentMethod(
  userId: number,
  paymentMethodId: string,
) {
  const customerId = await ensureStripeCustomer({ userId });
  const paymentMethod = await getStripe().paymentMethods.retrieve(
    paymentMethodId,
  );
  const owner =
    typeof paymentMethod.customer === "string"
      ? paymentMethod.customer
      : paymentMethod.customer?.id;

  if (owner !== customerId) {
    throw new Error("Payment method was not found for this customer.");
  }

  return { customerId, paymentMethod };
}

export async function removeSavedPaymentMethod(
  userId: number,
  paymentMethodId: string,
) {
  await requireOwnedPaymentMethod(userId, paymentMethodId);
  await getStripe().paymentMethods.detach(paymentMethodId);
  await prisma.user.updateMany({
    where: { id: userId, stripeDefaultPaymentMethodId: paymentMethodId },
    data: { stripeDefaultPaymentMethodId: null },
  });
}

export async function setDefaultPaymentMethod(
  userId: number,
  paymentMethodId: string,
) {
  const { customerId } = await requireOwnedPaymentMethod(
    userId,
    paymentMethodId,
  );

  await getStripe().customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { stripeDefaultPaymentMethodId: paymentMethodId },
  });
}
