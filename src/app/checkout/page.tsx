import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import SiteHeader from "@/components/layout/site-header";
import CheckoutForm from "@/components/payments/checkout-form";
import { getUserCart } from "@/lib/services/cart.service";
import { getStripePublishableKey } from "@/lib/stripe";
import { getUserSession } from "@/lib/user-auth";

type FreshCheckoutPageProps = {
  searchParams: Promise<{ items?: string }>;
};

export default async function CheckoutPage({ searchParams }: FreshCheckoutPageProps) {
  const user = await getUserSession();

  if (!user) {
    redirect("/login");
  }

  const query = await searchParams;
  const selectedItemIds = query.items
    ? query.items.split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const cart = await getUserCart(user.id);

  const checkoutItems = selectedItemIds && selectedItemIds.length > 0
    ? cart.items.filter((item) => selectedItemIds.includes(item.id))
    : cart.items;

  if (checkoutItems.length === 0) {
    redirect("/cart");
  }

  const subtotal = Math.round(
    checkoutItems.reduce((sum, item) => sum + Number(item.variant.price) * item.quantity, 0),
  );
  const tax = Math.round(subtotal * 0.1);
  const total = subtotal + tax;

  const publishableKey = getStripePublishableKey();

  const initialShipping = {
    shippingName: user.fullName || "",
    shippingEmail: user.email || "",
    shippingPhone: "",
    shippingAddress: "",
    shippingCity: "",
    shippingPostalCode: "",
    shippingCountry: "Pakistan",
  };

  const itemIds = checkoutItems.map((item) => item.id);

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-[#f7f9fb] px-4 py-8 sm:px-6">
        <div className="mx-auto grid max-w-4xl gap-5 lg:grid-cols-[1fr_360px]">
          <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-blue-600">
                <Link href="/cart" className="hover:underline">
                  ← Return to cart
                </Link>
                <span>·</span>
                <span>Checkout</span>
              </div>
              <h1 className="mt-2 text-xl font-semibold text-gray-900">
                Complete your order
              </h1>
              <p className="mt-1 text-xs text-gray-500">
                Enter your shipping address and choose your payment method to finalize your purchase.
              </p>
            </div>

            <CheckoutForm
              cartItemIds={itemIds}
              total={total}
              publishableKey={publishableKey}
              shipping={initialShipping}
            />
          </section>

          <aside className="h-fit overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="border-b border-gray-100 bg-gray-50/70 px-5 py-4">
              <h2 className="text-sm font-semibold text-gray-900">Order snapshot</h2>
              <p className="mt-0.5 text-[11px] text-gray-500">
                {checkoutItems.length} item{checkoutItems.length === 1 ? "" : "s"} selected from cart
              </p>
            </div>
            <div className="max-h-72 space-y-3 overflow-y-auto px-5 py-4">
              {checkoutItems.map((item) => (
                <div key={item.id} className="flex gap-3">
                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
                    {item.product.image?.url ? (
                      <Image
                        src={item.product.image.url}
                        alt={item.product.image.altText ?? item.product.name}
                        fill
                        sizes="48px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[9px] text-gray-400">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-gray-800">
                      {item.product.name}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-gray-400">
                      {[
                        item.variant.color?.name,
                        item.variant.size?.name ? `Size ${item.variant.size.name}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || item.variant.sku}
                    </p>
                    <div className="mt-1 flex items-center justify-between text-[11px]">
                      <span className="text-gray-500">Qty {item.quantity}</span>
                      <span className="font-semibold text-gray-800">
                        Rs. {Math.round(item.lineTotal).toLocaleString("en-PK")}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-3 border-t border-gray-100 bg-gray-50/40 px-5 py-4 text-xs">
              <AmountRow label="Subtotal" value={subtotal} />
              <AmountRow label="Tax (10%)" value={tax} />
              <div className="border-t border-gray-200 pt-3">
                <AmountRow label="Total" value={total} strong />
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  );
}

function AmountRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "font-semibold text-gray-800" : "text-gray-500"}>
        {label}
      </span>
      <span
        className={
          strong
            ? "text-base font-semibold text-gray-900"
            : "font-medium text-gray-800"
        }
      >
        Rs. {Math.round(value).toLocaleString("en-PK")}
      </span>
    </div>
  );
}
