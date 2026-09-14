"use client";

import { useMemo, useState } from "react";
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
import { useAlert } from "@/hooks/use-alert";

// Classic per-field card elements — same as checkout — instead of the
// auto-rendering PaymentElement, which pulls in Link enrollment prompts and
// a "save my info" panel that can't be fully suppressed via its options.
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

type SavedPaymentMethod = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
};

type SetupData = {
  clientSecret: string;
  publishableKey: string;
};

type Props = {
  initialPaymentMethods: SavedPaymentMethod[];
};

function AddPaymentMethodForm({
  clientSecret,
  onComplete,
}: {
  clientSecret: string;
  onComplete: () => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const { alert, showAlert, closeAlert } = useAlert();
  const [isSaving, setIsSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    const cardNumberElement = elements.getElement(CardNumberElement);
    if (!cardNumberElement) {
      return;
    }

    try {
      setIsSaving(true);
      const result = await stripe.confirmCardSetup(clientSecret, {
        payment_method: {
          card: cardNumberElement,
        },
      });

      if (result.error) {
        showAlert(
          result.error.message ?? "Unable to save this payment method.",
          { variant: "error" },
        );
        return;
      }

      onComplete();
    } catch (error) {
      console.error("Save payment method error:", error);
      showAlert("Unable to save this payment method.", { variant: "error" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-600">Card number</label>
        <div className="mt-1 rounded-lg border border-gray-300 px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
          <CardNumberElement options={CLASSIC_ELEMENT_OPTIONS} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600">Expiration (MM/YY)</label>
          <div className="mt-1 rounded-lg border border-gray-300 px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <CardExpiryElement options={CLASSIC_ELEMENT_OPTIONS} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600">Security code</label>
          <div className="mt-1 rounded-lg border border-gray-300 px-3 py-2.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500">
            <CardCvcElement options={CLASSIC_ELEMENT_OPTIONS} />
          </div>
        </div>
      </div>
      <button type="submit" disabled={!stripe || isSaving} className="h-10 w-full rounded-lg bg-blue-600 px-4 text-sm font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
        {isSaving ? "Saving..." : "Save payment method"}
      </button>
      <p className="text-center text-[11px] text-gray-400">Sandbox cards only. No real payment is taken.</p>
      {alert ? <Alert message={alert.message} variant={alert.variant} onClose={closeAlert} /> : null}
    </form>
  );
}

export default function PaymentMethodManager({ initialPaymentMethods }: Props) {
  const router = useRouter();
  const { alert, showAlert, closeAlert } = useAlert();
  const [methods, setMethods] = useState(initialPaymentMethods);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [isStartingSetup, setIsStartingSetup] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const stripePromise = useMemo(
    () => (setupData ? loadStripe(setupData.publishableKey) : null),
    [setupData],
  );

  async function startAddPaymentMethod() {
    try {
      setIsStartingSetup(true);
      const response = await fetch("/api/stripe/setup-intent", { method: "POST" });
      const result = await response.json();

      if (!response.ok || !result.success) {
        showAlert(result.message ?? "Unable to start card setup.", { variant: "error" });
        return;
      }

      setSetupData(result.data);
    } catch (error) {
      console.error("Start payment method setup error:", error);
      showAlert("Unable to start card setup.", { variant: "error" });
    } finally {
      setIsStartingSetup(false);
    }
  }

  async function updateMethod(action: "remove" | "setDefault", paymentMethodId: string) {
    try {
      setBusyId(paymentMethodId);
      const response = await fetch("/api/payment-methods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, paymentMethodId }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        showAlert(result.message ?? "Unable to update payment method.", { variant: "error" });
        return;
      }

      if (action === "remove") {
        setMethods((current) => current.filter((method) => method.id !== paymentMethodId));
      } else {
        setMethods((current) => current.map((method) => ({ ...method, isDefault: method.id === paymentMethodId })));
      }
      router.refresh();
    } catch (error) {
      console.error("Update payment method error:", error);
      showAlert("Unable to update payment method.", { variant: "error" });
    } finally {
      setBusyId(null);
    }
  }

  function finishSetup() {
    setSetupData(null);
    router.refresh();
  }

  return (
    <>
      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-gray-900">Payment methods</h1>
            <p className="mt-1 text-xs text-gray-500">Manage cards saved to your Stripe sandbox customer.</p>
          </div>
          <button type="button" onClick={startAddPaymentMethod} disabled={isStartingSetup || setupData !== null} className="h-9 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300">
            {isStartingSetup ? "Loading..." : "Add card"}
          </button>
        </div>

        {methods.length === 0 ? (
          <div className="mt-5 rounded-lg border border-dashed border-gray-300 px-5 py-10 text-center text-sm text-gray-500">No saved payment methods.</div>
        ) : (
          <div className="mt-5 space-y-2">
            {methods.map((method) => (
              <div key={method.id} className="flex flex-col gap-3 rounded-lg border border-gray-200 px-4 py-3 sm:flex-row sm:items-center">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold capitalize text-gray-800">{method.brand} •••• {method.last4}</p>
                  <p className="mt-0.5 text-xs text-gray-500">Expires {method.expMonth?.toString().padStart(2, "0")}/{method.expYear}</p>
                </div>
                {method.isDefault ? <span className="w-fit rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-semibold text-green-700">Default</span> : null}
                <div className="flex gap-2">
                  {!method.isDefault ? (
                    <button type="button" disabled={busyId === method.id} onClick={() => updateMethod("setDefault", method.id)} className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">Set default</button>
                  ) : null}
                  <button type="button" disabled={busyId === method.id} onClick={() => updateMethod("remove", method.id)} className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50">Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {setupData && stripePromise ? (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/45 px-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">Add payment method</h2>
              <button type="button" onClick={() => setSetupData(null)} className="text-xl text-gray-400 hover:text-gray-700" aria-label="Close">×</button>
            </div>
            <Elements stripe={stripePromise}>
              <AddPaymentMethodForm clientSecret={setupData.clientSecret} onComplete={finishSetup} />
            </Elements>
          </div>
        </div>
      ) : null}

      {alert ? <Alert message={alert.message} variant={alert.variant} onClose={closeAlert} /> : null}
    </>
  );
}
