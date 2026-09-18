"use client";

import { useRouter } from "next/navigation";

type RetryPaymentButtonProps = {
  orderId: string;
  label?: string;
  className?: string;
};

// Just a deep link into the same full checkout flow used for a fresh order
// — CheckoutForm itself decides whether to skip the delivery step and
// which payment session (if any) to start, based on the orderId it's
// given. No fetch here: creating a Stripe session eagerly, before the
// customer has even chosen Card over COD, would be wasted work (and an
// unnecessary PaymentIntent) whenever they end up picking COD instead.
export default function RetryPaymentButton({
  orderId,
  label = "Retry payment",
  className,
}: RetryPaymentButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push(`/checkout/${encodeURIComponent(orderId)}`)}
      className={
        className ??
        "mt-3 inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700"
      }
    >
      {label}
    </button>
  );
}
