"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import Alert from "@/components/ui/alert";

type RetryPaymentButtonProps = {
  orderId: string;
  label?: string;
  className?: string;
};

export default function RetryPaymentButton({
  orderId,
  label = "Retry payment",
  className,
}: RetryPaymentButtonProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retryPayment() {
    try {
      setBusy(true);
      setError(null);
      const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/retry-payment`, {
        method: "POST",
      });
      const result = (await response.json()) as {
        success: boolean;
        message?: string;
        data?: { paymentAttemptId: string };
      };

      if (!response.ok || !result.success || !result.data) {
        setError(result.message ?? "Unable to retry payment.");
        return;
      }

      router.push(`/checkout/${encodeURIComponent(result.data.paymentAttemptId)}`);
    } catch (error) {
      console.error("Retry payment request error:", error);
      setError("Unable to retry payment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className ? undefined : "mt-4"}>
      {error ? <Alert message={error} variant="error" /> : null}
      <button
        type="button"
        onClick={retryPayment}
        disabled={busy}
        className={
          className ??
          "mt-3 inline-flex h-9 items-center rounded-md bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
        }
      >
        {busy ? "Preparing payment..." : label}
      </button>
    </div>
  );
}
