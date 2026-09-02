"use client";

import { useMemo, useState } from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PaymentElement, useCheckoutElements } from "@stripe/react-stripe-js/checkout";
import { CheckoutElementsProvider } from "@stripe/react-stripe-js/checkout";
import { loadStripe } from "@stripe/stripe-js";

import Alert from "@/components/ui/alert";

type CheckoutFormProps = {
  clientSecret: string;
  publishableKey: string;
  orderId: string;
  orderNumber: string;
  sessionId: string;
  shipping: ShippingSnapshot;
};

type ShippingSnapshot = {
  shippingName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
};

const declineMessages: Record<string, string> = {
  incorrect_number: "Check your card number and try again.",
  incorrect_cvc: "Check your security code and try again.",
  expired_card: "This card has expired. Use another card.",
  insufficient_funds: "This card has insufficient funds.",
  authentication_required: "Please authenticate this payment and try again.",
  card_not_supported: "This card cannot be used for this payment.",
  card_declined: "Your bank declined the payment. Try another card.",
};

function safePaymentMessage(error: {
  code?: string | null;
  decline_code?: string | null;
}) {
  const code = error.decline_code ?? error.code ?? "";
  return (
    declineMessages[code] ??
    "Payment could not be completed. Check your details or try another card."
  );
}

function PaymentForm({ orderId, orderNumber, sessionId, initialShipping }: { orderId: string; orderNumber: string; sessionId: string; initialShipping: ShippingSnapshot }) {
  const router = useRouter();
  const checkoutResult = useCheckoutElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [shipping, setShipping] = useState(initialShipping);
  const [step, setStep] = useState<"delivery" | "payment">("delivery");
  const [paymentChoice, setPaymentChoice] = useState<"card" | "cod">("card");
  const [paymentFailure, setPaymentFailure] = useState<string | null>(null);

  function updateShipping(field: keyof ShippingSnapshot, value: string) {
    setShipping((current) => ({ ...current, [field]: value }));
  }

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (checkoutResult.type !== "success") {
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      if (step === "delivery") {
        const addressResponse = await fetch(`/api/orders/${encodeURIComponent(orderId)}/shipping-address`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(shipping),
        });
        const addressResult = (await addressResponse.json()) as { success: boolean; message?: string };

        if (!addressResponse.ok || !addressResult.success) {
          setErrorMessage(addressResult.message ?? "Check your delivery details.");
          return;
        }

        const billingResult = await checkoutResult.checkout.updateBillingAddress({
          name: shipping.shippingName,
          address: {
            line1: shipping.shippingAddress,
            city: shipping.shippingCity,
            postal_code: shipping.shippingPostalCode,
            country: "PK",
          },
        });
        if (billingResult.type === "error") {
          setErrorMessage(billingResult.error.message);
          return;
        }

        setStep("payment");
        return;
      }

      if (paymentChoice === "cod") {
        const response = await fetch("/api/stripe/cash-on-delivery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const result = (await response.json()) as {
          success: boolean;
          message?: string;
          data?: { orderId: string };
        };
        if (!response.ok || !result.success || !result.data) {
          setErrorMessage(result.message ?? "Unable to place cash on delivery order.");
          return;
        }
        router.push(`/payment/cash-on-delivery?order_id=${encodeURIComponent(result.data.orderId)}`);
        router.refresh();
        return;
      }

      if (!checkoutResult.checkout.canConfirm) return;

      const result = await checkoutResult.checkout.confirm();

      if (result.type === "error") {
        setPaymentFailure(safePaymentMessage(result.error));
      }
    } catch (error) {
      console.error("Stripe confirmation error:", error);
      setPaymentFailure("Payment could not be completed. Please try another card.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (checkoutResult.type === "loading") {
    return <p className="py-8 text-center text-sm text-gray-500">Loading secure payment form...</p>;
  }

  if (checkoutResult.type === "error") {
    return <Alert message="Unable to load the secure payment form." variant="error" />;
  }

  return (
    <>
    <form onSubmit={submitPayment} className="space-y-5">
      {step === "delivery" ? (
        <div>
          <div className="mb-3">
            <h2 className="text-base font-semibold text-gray-900">Contact & delivery</h2>
            <p className="mt-1 text-xs text-gray-500">Enter the details we should use for this order.</p>
          </div>
          <fieldset className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="mb-3 text-[11px] text-gray-500"><span className="text-red-500">*</span> Required fields</p>
            <div className="grid gap-3 sm:grid-cols-2">
            <CompactInput label="Full name" value={shipping.shippingName} onChange={(value) => updateShipping("shippingName", value)} autoComplete="name" />
            <CompactInput label="Email" type="email" value={shipping.shippingEmail} onChange={(value) => updateShipping("shippingEmail", value)} autoComplete="email" />
            <CompactInput label="Phone" value={shipping.shippingPhone} onChange={(value) => updateShipping("shippingPhone", value)} autoComplete="tel" />
            <div className="sm:col-span-2">
              <CompactInput label="Address" value={shipping.shippingAddress} onChange={(value) => updateShipping("shippingAddress", value)} autoComplete="street-address" />
            </div>
            <CompactInput label="City" value={shipping.shippingCity} onChange={(value) => updateShipping("shippingCity", value)} autoComplete="address-level2" />
            <CompactInput label="Postal code" value={shipping.shippingPostalCode} onChange={(value) => updateShipping("shippingPostalCode", value)} autoComplete="postal-code" />
            </div>
          </fieldset>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-xs">
            <div>
              <p className="font-semibold text-gray-800">{shipping.shippingName}</p>
              <p className="mt-0.5 text-gray-500">{shipping.shippingEmail} · {shipping.shippingPhone}</p>
              <p className="mt-0.5 text-gray-500">{shipping.shippingAddress}, {shipping.shippingCity} {shipping.shippingPostalCode}</p>
            </div>
            <button type="button" onClick={() => setStep("delivery")} className="font-semibold text-blue-600 hover:text-blue-700">Edit</button>
          </div>
          <div className="border-t border-gray-100 pt-5">
            <h2 className="text-base font-semibold text-gray-900">Choose payment method</h2>
            <p className="mt-1 text-xs text-gray-500">Select how you would like to pay for this order.</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <PaymentChoiceCard selected={paymentChoice === "cod"} title="Cash on delivery" description="Pay when your order arrives" onClick={() => setPaymentChoice("cod")} />
              <PaymentChoiceCard selected={paymentChoice === "card"} title="Credit / debit card" description="Pay securely with Stripe" onClick={() => setPaymentChoice("card")} />
            </div>
            {paymentChoice === "card" ? (
              <div className="mt-4 rounded-lg border border-gray-200 p-4">
                <PaymentElement options={{
                  layout: "accordion",
                  fields: {
                    billingDetails: {
                      name: "never",
                      email: "never",
                      phone: "never",
                      address: "never",
                    },
                  },
                }} />
              </div>
            ) : null}
          </div>
        </>
      )}

      {errorMessage ? <Alert message={errorMessage} variant="error" /> : null}

      <button
        type="submit"
        disabled={(step === "payment" && paymentChoice === "card" && !checkoutResult.checkout.canConfirm) || isSubmitting}
        className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isSubmitting
          ? step === "delivery" ? "Saving details..." : "Processing payment..."
          : step === "delivery"
            ? "Continue to payment"
            : paymentChoice === "cod" ? "Place cash on delivery order" : "Pay securely"}
      </button>

      <p className="text-center text-[11px] leading-4 text-gray-400">
        Sandbox mode. No real payment will be taken.
      </p>
    </form>
    {paymentFailure ? (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 py-8" role="dialog" aria-modal="true" aria-labelledby="payment-failed-title">
        <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
          <div className="bg-red-600 px-6 py-6 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white ring-1 ring-white/30">×</div>
            <h2 id="payment-failed-title" className="mt-3 text-xl font-semibold text-white">Payment unsuccessful</h2>
            <p className="mt-1 text-sm text-white/85">Your order is saved. No payment was collected.</p>
          </div>
          <div className="p-6">
            <div className="space-y-2 rounded-xl bg-gray-50 p-3">
              <FailureRow label="Order ID" value={orderNumber} />
              <FailureRow label="Payment method" value="Credit / Debit Card" />
              <FailureRow label="Status" value="Payment failed" />
            </div>
            <p className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">{paymentFailure}</p>
            <button type="button" onClick={() => setPaymentFailure(null)} className="mt-5 h-10 w-full rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">
              Try another card
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Link href={`/orders/${orderId}`} className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">View order detail</Link>
              <Link href="/orders" className="inline-flex h-9 items-center justify-center rounded-lg border border-gray-300 px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50">Order history</Link>
              <Link href="/" className="col-span-2 inline-flex h-9 items-center justify-center rounded-lg border border-gray-200 px-3 text-xs text-gray-600 hover:bg-gray-50">Continue shopping</Link>
            </div>
          </div>
        </div>
      </div>
    ) : null}
    </>
  );
}

export default function CheckoutForm({
  clientSecret,
  publishableKey,
  orderId,
  orderNumber,
  sessionId,
  shipping,
}: CheckoutFormProps) {
  const stripePromise = useMemo(
    () => loadStripe(publishableKey),
    [publishableKey],
  );

  return (
    <CheckoutElementsProvider
      stripe={stripePromise}
      options={{
        clientSecret,
        elementsOptions: {
          appearance: {
            theme: "stripe",
            variables: { colorPrimary: "#087ff5", borderRadius: "8px" },
          },
        },
      }}
    >
      <PaymentForm orderId={orderId} orderNumber={orderNumber} sessionId={sessionId} initialShipping={shipping} />
    </CheckoutElementsProvider>
  );
}

function FailureRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-white px-3 py-2 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="truncate font-semibold text-gray-900" title={value}>{value}</span>
    </div>
  );
}

function PaymentChoiceCard({ selected, title, description, onClick }: {
  selected: boolean;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-3 text-left transition ${selected ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500" : "border-gray-200 bg-white hover:border-gray-300"}`}
    >
      <span className="flex items-center gap-2 text-xs font-semibold text-gray-900">
        <span className={`h-3.5 w-3.5 rounded-full border-4 ${selected ? "border-blue-600" : "border-gray-300"}`} />
        {title}
      </span>
      <span className="mt-1 block pl-5.5 text-[10px] text-gray-500">{description}</span>
    </button>
  );
}

function CompactInput({
  label,
  value,
  onChange,
  autoComplete,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  type?: "text" | "email";
}) {
  return (
    <label className="block text-xs font-medium text-gray-600">
      {label} <span className="text-red-500" aria-hidden="true">*</span>
      <input
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="mt-1 h-9 w-full rounded-md border border-gray-300 px-3 text-sm text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      />
    </label>
  );
}
