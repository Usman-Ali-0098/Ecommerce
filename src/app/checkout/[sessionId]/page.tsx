import Image from "next/image";
import { notFound, redirect } from "next/navigation";

import SiteHeader from "@/components/layout/site-header";
import CheckoutForm from "@/components/payments/checkout-form";
import { getOrderCheckoutForDisplay } from "@/lib/services/order.service";
import { getStripePublishableKey } from "@/lib/stripe";
import { getUserSession } from "@/lib/user-auth";

type CheckoutPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function CheckoutPage({ params }: CheckoutPageProps) {
  const user = await getUserSession();

  if (!user) {
    redirect("/login");
  }

  // The [sessionId] segment is an orderId — a still-unpaid, still-retryable
  // order being resumed. CheckoutForm itself skips straight to the payment
  // step and only starts a card session once the customer picks Card.
  const { sessionId: orderId } = await params;
  const checkout = await getOrderCheckoutForDisplay(user.id, orderId);

  if (!checkout) {
    notFound();
  }

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#f7f9fb] px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1fr_360px]">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Secure checkout</p>
              <h1 className="mt-1 text-xl font-semibold text-gray-900">Complete your order</h1>
              <p className="mt-1 text-xs text-gray-500">Order {checkout.orderNumber}</p>
            </div>

            <CheckoutForm
              orderId={checkout.orderId}
              shipping={checkout.shipping}
              total={checkout.total}
              publishableKey={getStripePublishableKey()}
            />
          </section>

          <aside className="h-fit overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Order snapshot</h2>
              <p className="mt-0.5 text-[11px] text-gray-500">{checkout.orderNumber} · {checkout.items.length} item{checkout.items.length === 1 ? "" : "s"}</p>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto px-5 py-4">
              {checkout.items.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    {item.imageUrl ? (
                      <Image src={item.imageUrl} alt={item.imageAltText ?? item.productName} fill sizes="48px" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] text-gray-400">No image</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-800">{item.productName}</p>
                    <p className="mt-0.5 truncate text-[10px] text-gray-400">
                      {[item.colorName, item.sizeName ? `Size ${item.sizeName}` : null].filter(Boolean).join(" · ") || item.sku}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">Qty {item.quantity}</span>
                      <span className="font-semibold text-gray-800">Rs. {Math.round(item.lineTotal).toLocaleString("en-PK")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-gray-100 bg-gray-50/40 px-5 py-4 text-xs">
              <AmountRow label="Subtotal" value={checkout.subtotal} />
              <AmountRow label="Tax" value={checkout.tax} />
              <div className="border-t border-gray-200 pt-3">
                <AmountRow label="Total" value={checkout.total} strong />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

function AmountRow({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold text-gray-800" : "text-gray-500"}>{label}</span>
      <span className={strong ? "text-base font-semibold text-gray-900" : "font-medium text-gray-800"}>
        Rs. {Math.round(value).toLocaleString("en-PK")}
      </span>
    </div>
  );
}
