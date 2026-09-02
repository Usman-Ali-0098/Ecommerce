import Link from "next/link";
import { redirect } from "next/navigation";

import SiteHeader from "@/components/layout/site-header";
import PaymentMethodManager from "@/components/payments/payment-method-manager";
import { listSavedPaymentMethods } from "@/lib/services/stripe-customer.service";
import { getUserSession } from "@/lib/user-auth";

export default async function PaymentMethodsPage() {
  const user = await getUserSession();

  if (!user) {
    redirect("/login");
  }

  const paymentMethods = await listSavedPaymentMethods(user.id);

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#f7f9fb] px-4 py-7 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Link href="/" className="mb-4 inline-flex text-xs font-medium text-blue-600 hover:text-blue-700">← Back to store</Link>
          <PaymentMethodManager initialPaymentMethods={paymentMethods} />
        </div>
      </main>
    </>
  );
}
