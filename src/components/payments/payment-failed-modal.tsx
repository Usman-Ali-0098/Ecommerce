"use client";

import { useEffect } from "react";
import Link from "next/link";

type PaymentFailedModalProps = {
  open: boolean;
  orderNumber?: string | null;
  amount?: number;
  message: string;
  onRetry: () => void;
  retryBusy: boolean;
  retryError?: string | null;
  onClose: () => void;
};

export default function PaymentFailedModal({
  open,
  orderNumber,
  amount,
  message,
  onRetry,
  retryBusy,
  retryError,
  onClose,
}: PaymentFailedModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4 py-8"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-failed-title"
        onMouseDown={(event) => event.stopPropagation()}
        className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-200/50"
      >
        <div className="relative bg-red-600 px-6 py-7 text-center">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 text-xl leading-none text-white/80 transition hover:text-white"
          >
            ×
          </button>
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white ring-1 ring-white/30">
            ×
          </div>
          <h1 id="payment-failed-title" className="mt-3 text-xl font-semibold text-white">
            Payment failed
          </h1>
          <p className="mt-1 text-sm text-white/85">
            Your order was saved, but payment was not completed.
          </p>
        </div>

        <div className="p-6">
          <div className="space-y-2 rounded-xl bg-gray-50 p-3">
            {orderNumber ? <ResultRow label="Order ID" value={orderNumber} /> : null}
            <ResultRow label="Payment method" value="Credit / Debit Card" />
            <ResultRow label="Status" value="Payment failed" />
            {typeof amount === "number" ? (
              <ResultRow label="Amount" value={`Rs. ${Math.round(amount).toLocaleString("en-PK")}`} />
            ) : null}
          </div>

          <div className="mt-4 rounded-lg bg-red-50 px-3 py-2.5 text-xs leading-5 text-red-700">
            {message}
          </div>

          {retryError ? (
            <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-700">
              {retryError}
            </div>
          ) : null}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onRetry}
              disabled={retryBusy}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:bg-gray-300"
            >
              {retryBusy ? "Preparing retry..." : "Retry payment"}
            </button>
            <Link
              href="/orders"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Order history
            </Link>
            <Link
              href="/"
              className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-4 text-xs font-medium text-gray-600 hover:bg-gray-50 sm:col-span-2"
            >
              Continue shopping
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-white px-3 py-2 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="truncate font-semibold text-gray-900" title={value}>
        {value}
      </span>
    </div>
  );
}
