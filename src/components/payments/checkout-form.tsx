"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  CardCvcElement,
  CardExpiryElement,
  CardNumberElement,
  Elements,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

import Alert from "@/components/ui/alert";
import PaymentFailedModal from "@/components/payments/payment-failed-modal";

type Shipping = {
  shippingName: string;
  shippingEmail: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingCity: string;
  shippingPostalCode: string;
  shippingCountry: string;
};

type Props = {
  cartItemIds?: string[];
  total?: number;
  publishableKey?: string;
  orderId?: string;
  checkoutId?: string;
  shipping: Shipping;
};

type SavedPaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
};

// Classic per-field card elements (card number / expiry / CVC only) instead
// of the auto-rendering PaymentElement: PaymentElement pulls in Link
// enrollment prompts, wallet buttons, and a "save my info" panel that can't
// be fully suppressed via its options. These have none of that by design.
const CLASSIC_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "14px",
      color: "#111827",
      fontFamily: "inherit",
      "::placeholder": { color: "#9ca3af" },
    },
    invalid: { color: "#dc2626" },
  },
};

// CardNumberElement still shows Stripe's own "Autofill"/Link button on top
// of everything above unless explicitly turned off — disableLink is only a
// valid option on this element, not on CardExpiryElement/CardCvcElement.
const CARD_NUMBER_ELEMENT_OPTIONS = {
  ...CLASSIC_ELEMENT_OPTIONS,
  disableLink: true,
};

function billingDetailsFor(shipping: Shipping) {
  return {
    name: shipping.shippingName,
    email: shipping.shippingEmail,
    phone: shipping.shippingPhone,
    address: {
      line1: shipping.shippingAddress,
      city: shipping.shippingCity,
      state: "",
      postal_code: shipping.shippingPostalCode,
      country: "PK",
    },
  };
}

function useSavedPaymentMethods() {
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/payment-methods")
      .then((response) => response.json())
      .then((body: { success: boolean; data?: { paymentMethods: SavedPaymentMethod[] } }) => {
        if (!cancelled && body.success && body.data) {
          setMethods(body.data.paymentMethods);
        }
      })
      .catch(() => {
        // Saved cards are a convenience, not required for checkout to work.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return methods;
}

function CardEntryFields({
  savedMethods,
  selection,
  onSelectionChange,
  saveCard,
  onSaveCardChange,
}: {
  savedMethods: SavedPaymentMethod[];
  selection: string;
  onSelectionChange: (value: string) => void;
  saveCard: boolean;
  onSaveCardChange: (value: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      {savedMethods.length > 0 && (
        <div className="space-y-2">
          {savedMethods.map((method) => (
            <label
              key={method.id}
              className={`flex cursor-pointer items-center justify-between rounded-lg border p-3 text-xs transition ${
                selection === method.id
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="payment-method"
                  checked={selection === method.id}
                  onChange={() => onSelectionChange(method.id)}
                  className="h-3.5 w-3.5"
                />
                <span className="font-semibold capitalize text-gray-800">
                  {method.brand} •••• {method.last4}
                </span>
                {method.isDefault && (
                  <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                    Default
                  </span>
                )}
              </span>
              <span className="text-gray-400">
                Exp {method.expMonth?.toString().padStart(2, "0")}/{method.expYear}
              </span>
            </label>
          ))}
          <label
            className={`flex cursor-pointer items-center gap-2 rounded-lg border p-3 text-xs transition ${
              selection === "new"
                ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              checked={selection === "new"}
              onChange={() => onSelectionChange("new")}
              className="h-3.5 w-3.5"
            />
            <span className="font-semibold text-gray-800">Use a new card</span>
          </label>
        </div>
      )}

      {selection === "new" && (
        <div className="space-y-3 rounded-lg border border-gray-200 p-4">
          <div>
            <label className="block text-xs font-medium text-gray-600">Card number</label>
            <div className="group mt-1 flex items-center gap-2.5 rounded-lg border border-gray-300 px-3 py-2.5 transition focus-within:border-[#087ff5] focus-within:ring-1 focus-within:ring-[#087ff5]">
              <span className="shrink-0 text-gray-400 transition-colors group-focus-within:text-[#087ff5]">
                <CardIcon />
              </span>
              <div className="min-w-0 flex-1">
                <CardNumberElement options={CARD_NUMBER_ELEMENT_OPTIONS} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600">Expiration (MM/YY)</label>
              <div className="group mt-1 flex items-center gap-2.5 rounded-lg border border-gray-300 px-3 py-2.5 transition focus-within:border-[#087ff5] focus-within:ring-1 focus-within:ring-[#087ff5]">
                <span className="shrink-0 text-gray-400 transition-colors group-focus-within:text-[#087ff5]">
                  <CalendarIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <CardExpiryElement options={CLASSIC_ELEMENT_OPTIONS} />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600">Security code</label>
              <div className="group mt-1 flex items-center gap-2.5 rounded-lg border border-gray-300 px-3 py-2.5 transition focus-within:border-[#087ff5] focus-within:ring-1 focus-within:ring-[#087ff5]">
                <span className="shrink-0 text-gray-400 transition-colors group-focus-within:text-[#087ff5]">
                  <LockIcon />
                </span>
                <div className="min-w-0 flex-1">
                  <CardCvcElement options={CLASSIC_ELEMENT_OPTIONS} />
                </div>
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={saveCard}
              onChange={(event) => onSaveCardChange(event.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 accent-[#087ff5]"
            />
            Save this card for future purchases
          </label>
        </div>
      )}
    </div>
  );
}

type PlacedOrder = { orderId: string; paymentAttemptId?: string };

function CardPaymentForm({
  shipping,
  cartItemIds,
  total,
  resume,
  onOrderPlaced,
  onFailure,
}: {
  shipping: Shipping;
  cartItemIds?: string[];
  total?: number;
  resume?: { clientSecret: string; orderId: string };
  onOrderPlaced: (orderId: string, orderNumber: string) => void;
  onFailure: (orderId: string, message: string) => void;
}) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const savedMethods = useSavedPaymentMethods();
  // null = customer hasn't explicitly picked yet, so default to the saved
  // card (if any) without needing a setState-in-effect once it loads.
  const [explicitSelection, setExplicitSelection] = useState<string | null>(null);
  const selection =
    explicitSelection ??
    (savedMethods.length > 0 ? (savedMethods.find((method) => method.isDefault) ?? savedMethods[0]).id : "new");
  const [saveCard, setSaveCard] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;

    // Set once the order actually exists (immediately for a retry, which
    // already has one). Any failure from this point on must go through
    // onFailure instead of a local error — re-submitting this form would
    // otherwise try to re-place the order against an already-emptied cart.
    let placedOrder: PlacedOrder | null = resume ? { orderId: resume.orderId } : null;
    let clientSecret = resume?.clientSecret ?? null;

    try {
      setPaying(true);
      setError(null);

      if (!clientSecret) {
        if (!cartItemIds) return;

        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentMethod: "CARD", cartItemIds, shipping }),
        });

        const body = (await response.json()) as {
          success: boolean;
          message?: string;
          data?: {
            orderId: string;
            orderNumber: string;
            paymentAttemptId: string;
            clientSecret: string;
          };
        };

        if (!response.ok || !body.success || !body.data?.clientSecret) {
          setError(body.message ?? "Unable to place order.");
          return;
        }

        placedOrder = { orderId: body.data.orderId, paymentAttemptId: body.data.paymentAttemptId };
        clientSecret = body.data.clientSecret;
        onOrderPlaced(body.data.orderId, body.data.orderNumber);
      }

      const confirmation =
        selection === "new"
          ? await stripe.confirmCardPayment(clientSecret, {
              payment_method: {
                card: elements.getElement(CardNumberElement)!,
                billing_details: billingDetailsFor(shipping),
              },
              setup_future_usage: saveCard ? "off_session" : undefined,
            })
          : await stripe.confirmCardPayment(clientSecret, {
              payment_method: selection,
            });

      if (confirmation.error) {
        if (placedOrder) {
          onFailure(placedOrder.orderId, confirmation.error.message ?? "Payment could not be completed.");
        } else {
          setError(confirmation.error.message ?? "Payment could not be completed.");
        }
        return;
      }

      if (placedOrder) {
        const query = new URLSearchParams({ order_id: placedOrder.orderId });
        if (placedOrder.paymentAttemptId) query.set("session_id", placedOrder.paymentAttemptId);
        router.push(`/payment/complete?${query.toString()}`);
      }
    } catch (err) {
      console.error("Payment confirmation error:", err);
      if (placedOrder) {
        onFailure(placedOrder.orderId, "Payment could not be completed. Please try again.");
      } else {
        setError("Payment could not be completed. Please try again.");
      }
    } finally {
      setPaying(false);
    }
  }

  return (
    <form onSubmit={pay} className="mt-4 space-y-4">
      <CardEntryFields
        savedMethods={savedMethods}
        selection={selection}
        onSelectionChange={setExplicitSelection}
        saveCard={saveCard}
        onSaveCardChange={setSaveCard}
      />
      {error && <Alert message={error} variant="error" />}
      <button
        type="submit"
        disabled={!stripe || !elements || paying}
        className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-300"
      >
        {paying
          ? "Processing payment..."
          : total
            ? `Pay Rs. ${Math.round(total).toLocaleString("en-PK")} securely`
            : "Pay securely"}
      </button>
    </form>
  );
}

export default function CheckoutForm({
  cartItemIds,
  total,
  publishableKey,
  orderId,
  checkoutId,
  shipping: initialShipping,
}: Props) {
  const router = useRouter();
  const activeOrderId = orderId ?? checkoutId ?? "";
  const [shipping, setShipping] = useState(initialShipping);
  const [step, setStep] = useState<"delivery" | "payment">("delivery");
  const [choice, setChoice] = useState<"card" | "cod" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Failed-payment modal + the resumed session it hands off to, once retried.
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [failure, setFailure] = useState<{ orderId: string; message: string } | null>(null);
  const [retrySession, setRetrySession] = useState<{ clientSecret: string; orderId: string } | null>(null);
  const [retryBusy, setRetryBusy] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  // Only load Stripe.js (and let it talk to Stripe) once the customer has
  // actually chosen to pay by card — not just for landing on /checkout.
  const stripePromise = useMemo(() => {
    if (!publishableKey || choice !== "card") return null;
    return loadStripe(publishableKey);
  }, [publishableKey, choice]);

  const update = (field: keyof Shipping, value: string) =>
    setShipping((current) => ({ ...current, [field]: value }));

  function saveDelivery(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    // Client-side validation: no database write until final action
    if (
      !shipping.shippingName.trim() ||
      !shipping.shippingEmail.trim() ||
      !shipping.shippingPhone.trim() ||
      !shipping.shippingAddress.trim() ||
      !shipping.shippingCity.trim() ||
      !shipping.shippingPostalCode.trim()
    ) {
      setError("Please fill in all required delivery details.");
      return;
    }

    setStep("payment");
  }

  function handleOrderPlaced(_placedOrderId: string, placedOrderNumber: string) {
    setOrderNumber(placedOrderNumber);
  }

  function handleCardFailure(failedOrderId: string, message: string) {
    setRetryError(null);
    setFailure({ orderId: failedOrderId, message });
  }

  async function retryPayment() {
    if (!failure) return;
    setRetryBusy(true);
    setRetryError(null);
    try {
      const response = await fetch(`/api/orders/${encodeURIComponent(failure.orderId)}/retry-payment`, {
        method: "POST",
      });
      const body = (await response.json()) as {
        success: boolean;
        message?: string;
        data?: { clientSecret: string };
      };

      if (!response.ok || !body.success || !body.data?.clientSecret) {
        setRetryError(body.message ?? "Unable to retry payment.");
        return;
      }

      setRetrySession({ clientSecret: body.data.clientSecret, orderId: failure.orderId });
      setFailure(null);
    } catch (error) {
      console.error("Retry payment request error:", error);
      setRetryError("Unable to retry payment. Please try again.");
    } finally {
      setRetryBusy(false);
    }
  }

  async function placeCod() {
    setBusy(true);
    setError(null);
    try {
      if (cartItemIds && cartItemIds.length > 0) {
        // Fresh checkout: place the COD order on this final click
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod: "CASH_ON_DELIVERY",
            cartItemIds,
            shipping,
          }),
        });
        const body = (await response.json()) as {
          success: boolean;
          message?: string;
          data?: { orderId: string };
        };
        if (!response.ok || !body.success || !body.data) {
          setError(body.message ?? "Unable to place cash on delivery order.");
          return;
        }
        router.push(
          `/payment/cash-on-delivery?order_id=${encodeURIComponent(body.data.orderId)}`,
        );
        router.refresh();
      } else if (activeOrderId) {
        // Resuming an existing order
        const response = await fetch("/api/stripe/cash-on-delivery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: activeOrderId }),
        });
        const body = (await response.json()) as {
          success: boolean;
          message?: string;
          data?: { orderId: string };
        };
        if (!response.ok || !body.success || !body.data) {
          setError(body.message ?? "Unable to place cash on delivery order.");
          return;
        }
        router.push(
          `/payment/cash-on-delivery?order_id=${encodeURIComponent(body.data.orderId)}`,
        );
        router.refresh();
      }
    } catch {
      setError("Unable to place cash on delivery order. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {step === "delivery" ? (
        <form onSubmit={saveDelivery} className="space-y-5">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              Contact & delivery
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Enter the details we should use for this order.
            </p>
          </div>
          <fieldset className="rounded-lg border border-gray-200 bg-white p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input
                label="Full name"
                value={shipping.shippingName}
                onChange={(v) => update("shippingName", v)}
                autoComplete="name"
              />
              <Input
                label="Email"
                value={shipping.shippingEmail}
                onChange={(v) => update("shippingEmail", v)}
                autoComplete="email"
                type="email"
              />
              <Input
                label="Phone"
                value={shipping.shippingPhone}
                onChange={(v) => update("shippingPhone", v)}
                autoComplete="tel"
              />
              <div className="sm:col-span-2">
                <Input
                  label="Address"
                  value={shipping.shippingAddress}
                  onChange={(v) => update("shippingAddress", v)}
                  autoComplete="street-address"
                />
              </div>
              <Input
                label="City"
                value={shipping.shippingCity}
                onChange={(v) => update("shippingCity", v)}
                autoComplete="address-level2"
              />
              <Input
                label="Postal code"
                value={shipping.shippingPostalCode}
                onChange={(v) => update("shippingPostalCode", v)}
                autoComplete="postal-code"
              />
            </div>
          </fieldset>
          {error && <Alert message={error} variant="error" />}
          <button
            type="submit"
            disabled={busy}
            className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-300"
          >
            Continue to payment
          </button>
        </form>
      ) : (
        <div className="space-y-5">
          <div className="flex justify-between rounded-lg bg-gray-50 px-3 py-2.5 text-xs">
            <div>
              <p className="text-sm font-semibold text-gray-900">{shipping.shippingName}</p>
              <p className="mt-0.5 text-gray-500">
                {shipping.shippingAddress}, {shipping.shippingCity}{" "}
                {shipping.shippingPostalCode}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setStep("delivery");
                setError(null);
              }}
              className="font-semibold text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
          </div>
          <div className="border-t pt-5">
            <h2 className="text-base font-semibold text-gray-900">
              Choose payment method
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Choice
                selected={choice === "cod"}
                title="Cash on delivery"
                description="Pay when your order arrives"
                icon={<CashIcon />}
                onClick={() => {
                  setChoice("cod");
                  setError(null);
                }}
              />
              <Choice
                selected={choice === "card"}
                title="Credit / debit card"
                description="Pay securely with Stripe"
                icon={<CardIcon />}
                onClick={() => {
                  setChoice("card");
                  setError(null);
                }}
              />
            </div>
            {error && (
              <div className="mt-4">
                <Alert message={error} variant="error" />
              </div>
            )}
            {choice === "cod" && (
              <button
                type="button"
                onClick={placeCod}
                disabled={busy}
                className="mt-4 h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-300"
              >
                {busy
                  ? "Placing order..."
                  : `Place cash on delivery order${total ? ` (Rs. ${Math.round(total).toLocaleString("en-PK")})` : ""}`}
              </button>
            )}
            {choice === "card" && stripePromise && (cartItemIds || retrySession) && (
              <Elements stripe={stripePromise}>
                <CardPaymentForm
                  shipping={shipping}
                  cartItemIds={retrySession ? undefined : cartItemIds}
                  total={total}
                  resume={retrySession ?? undefined}
                  onOrderPlaced={handleOrderPlaced}
                  onFailure={handleCardFailure}
                />
              </Elements>
            )}
          </div>
        </div>
      )}
      <p className="mt-5 text-center text-[11px] text-gray-400">
        Sandbox mode. No real payment will be taken.
      </p>

      <PaymentFailedModal
        open={failure !== null}
        orderNumber={orderNumber}
        amount={total}
        message={failure?.message ?? "We couldn't process your payment."}
        onRetry={retryPayment}
        retryBusy={retryBusy}
        retryError={retryError}
        onClose={() => setFailure(null)}
      />
    </>
  );
}

function Choice({
  selected,
  title,
  description,
  icon,
  onClick,
}: {
  selected: boolean;
  title: string;
  description: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center justify-between gap-3 rounded-lg border p-3 text-left transition ${
        selected
          ? "border-[#087ff5] bg-blue-50 ring-1 ring-[#087ff5]"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
            selected ? "border-[#087ff5]" : "border-gray-300"
          }`}
        >
          {selected ? <span className="h-2 w-2 rounded-full bg-[#087ff5]" /> : null}
        </span>

        <div>
          <span className="block text-xs font-semibold text-gray-900">{title}</span>
          <span className="mt-1 block text-[10px] text-gray-500">
            {description}
          </span>
        </div>
      </div>

      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#087ff5]"
      >
        {icon}
      </span>
    </button>
  );
}

function CashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M16 3v4M8 3v4M3 10h18" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}

function Input({
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
      {label} <span className="text-red-500">*</span>
      <input
        type={type}
        required
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="mt-1 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    </label>
  );
}

function ExistingIntentCardForm({
  clientSecret,
  onError,
}: {
  clientSecret: string;
  onError: (message: string) => void;
}) {
  const router = useRouter();
  const stripe = useStripe();
  const elements = useElements();
  const savedMethods = useSavedPaymentMethods();
  const [explicitSelection, setExplicitSelection] = useState<string | null>(null);
  const selection =
    explicitSelection ??
    (savedMethods.length > 0 ? (savedMethods.find((method) => method.isDefault) ?? savedMethods[0]).id : "new");
  const [saveCard, setSaveCard] = useState(true);
  const [paying, setPaying] = useState(false);

  async function pay(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!stripe || !elements) return;

    try {
      setPaying(true);
      onError("");

      const confirmation =
        selection === "new"
          ? await stripe.confirmCardPayment(clientSecret, {
              payment_method: {
                card: elements.getElement(CardNumberElement)!,
              },
              setup_future_usage: saveCard ? "off_session" : undefined,
            })
          : await stripe.confirmCardPayment(clientSecret, {
              payment_method: selection,
            });

      if (confirmation.error) {
        onError(confirmation.error.message ?? "Payment could not be completed.");
        return;
      }

      router.push("/payment/complete");
    } catch {
      onError("Payment could not be completed. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  return (
    <form onSubmit={pay} className="mt-4 space-y-4">
      <CardEntryFields
        savedMethods={savedMethods}
        selection={selection}
        onSelectionChange={setExplicitSelection}
        saveCard={saveCard}
        onSaveCardChange={setSaveCard}
      />
      <button
        type="submit"
        disabled={!stripe || !elements || paying}
        className="h-11 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:bg-gray-300"
      >
        {paying ? "Processing payment..." : "Pay now"}
      </button>
    </form>
  );
}

export function CardPayment({
  data,
  onError,
}: {
  data: { clientSecret: string; publishableKey: string };
  onError: (message: string) => void;
}) {
  const stripePromise = useMemo(
    () => loadStripe(data.publishableKey),
    [data.publishableKey],
  );

  return (
    <Elements stripe={stripePromise}>
      <ExistingIntentCardForm clientSecret={data.clientSecret} onError={onError} />
    </Elements>
  );
}
