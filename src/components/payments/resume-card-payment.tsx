"use client";

import { useState } from "react";

import Alert from "@/components/ui/alert";
import { CardPayment } from "@/components/payments/checkout-form";

export default function ResumeCardPayment({ clientSecret, publishableKey }: { clientSecret: string; publishableKey: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <section className="mx-auto w-full max-w-lg rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Resume payment</p>
      <h1 className="mt-1 text-xl font-semibold text-gray-900">Complete your secure payment</h1>
      <p className="mt-1 text-xs text-gray-500">This reopens your active payment session; it does not create a new order.</p>
      {error ? <div className="mt-4"><Alert message={error} variant="error" /></div> : null}
      <CardPayment data={{ clientSecret, publishableKey }} onError={setError} />
    </section>
  );
}
