import Image from "next/image";
import Link from "next/link";

import { notFound, redirect } from "next/navigation";

import SiteHeader from "@/components/layout/site-header";
import ReorderPanel from "@/components/orders/reorder-panel";
import RetryPaymentButton from "@/components/payments/retry-payment-button";

import { getUserOrderById } from "@/lib/services/order.service";
import { getUserSession } from "@/lib/user-auth";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const user = await getUserSession();

  if (!user) {
    redirect("/");
  }

  const { id } = await params;

  const order = await getUserOrderById(user.id, id);

  if (!order) {
    notFound();
  }

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-[#f7f9fb] px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-350">
          {/* Heading */}

          <div className="mb-5 flex items-center gap-2.5">
            <Link
              href="/orders"
              aria-label="Back to orders"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#087ff5] transition hover:bg-blue-50"
            >
              <span className="text-lg">←</span>
            </Link>

            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 sm:text-2xl">
                Order Detail
              </h1>

              <p className="mt-0.5 text-xs text-gray-500">
                Review order information and purchased products.
              </p>
            </div>
          </div>

          <div className="mx-4 sm:mx-8 lg:mx-14">
            {/* Order Information */}

            <section className="rounded-lg border border-gray-200 bg-white px-4 py-4 sm:px-5">
              <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
                <OrderMeta label="Date" value={formatDate(order.createdAt)} />

                <OrderMeta label="Order #" value={order.orderNumber} />

                <OrderMeta
                  label="Payment"
                  value={
                    order.paymentMethod === "CASH_ON_DELIVERY" && order.paymentStatus === "UNPAID"
                      ? "COD"
                      : order.paymentStatus === "NOT_REQUIRED"
                        ? "Legacy order"
                        : order.paymentStatus === "PAID"
                          ? "Paid"
                          : order.paymentStatus === "PROCESSING" || order.paymentStatus === "REQUIRES_ACTION"
                            ? "Processing"
                            : order.paymentStatus === "FAILED" || order.paymentStatus === "EXPIRED"
                              ? "Retry required"
                              : order.paymentStatus === "CANCELED"
                                ? "Cancelled"
                                : "Unpaid"
                  }
                />

                <OrderMeta label="Items" value={String(order.productCount)} />

                <OrderMeta label="Subtotal" value={formatMoney(order.subtotal)} />

                <OrderMeta label="Tax" value={formatMoney(order.tax)} />

                <OrderMeta
                  label="Total"
                  value={formatMoney(order.total)}
                  strong
                />
              </div>
            </section>

            {order.canRetryPayment ? (
              <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                <p className="text-sm font-semibold text-amber-900">Payment required</p>
                <p className="mt-1 text-xs text-amber-700">
                  {order.hasActivePaymentAttempt
                    ? "Your secure payment session is still active — continue where you left off."
                    : "You can start a new secure payment session before this order expires."}
                </p>
                <RetryPaymentButton orderId={order.id} />
              </section>
            ) : null}

            {order.shipping ? (
              <section className="mt-4 rounded-lg border border-blue-100 bg-blue-50/40 px-4 py-3.5">
                <div className="flex items-start gap-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[#087ff5]">
                    <PinIcon />
                  </span>

                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold text-gray-900">Delivery snapshot</h2>

                    <p className="mt-1.5 text-sm font-medium text-gray-800">
                      {order.shipping.name}
                    </p>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {[order.shipping.address, order.shipping.city, order.shipping.postalCode, order.shipping.country].filter(Boolean).join(", ")}
                    </p>

                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-blue-100 pt-2.5 text-xs text-gray-600">
                      <span className="inline-flex items-center gap-1.5">
                        <MailIcon />
                        {order.shipping.email}
                      </span>

                      <span className="inline-flex items-center gap-1.5">
                        <PhoneIcon />
                        {order.shipping.phone}
                      </span>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            {/* Product Information */}

            <section className="mt-6">
              <div className="mb-3">
                <h2 className="text-sm font-semibold text-gray-900">
                  Product Information
                </h2>

                <p className="mt-0.5 text-xs text-gray-500">
                  Products included in this order.
                </p>
              </div>

              <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                <table className="w-full min-w-200 border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                      <th className="px-4 py-2.5">Product</th>

                      <th className="px-4 py-2.5">Color</th>

                      <th className="px-4 py-2.5">Size</th>

                      <th className="px-4 py-2.5">Price</th>

                      <th className="px-4 py-2.5">Qty</th>

                      <th className="px-4 py-2.5">Total</th>
                    </tr>
                  </thead>

                  <tbody>
                    {order.items.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 text-xs text-gray-700 transition last:border-b-0 hover:bg-gray-50/50"
                      >
                        {/* Product */}

                        <td className="px-4 py-3">
                          <div className="flex min-w-57.5 items-center gap-3">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-100">
                              {item.image ? (
                                <Image
                                  src={item.image.url}
                                  alt={item.image.altText ?? item.productName}
                                  fill
                                  sizes="44px"
                                  className="object-cover"
                                />
                              ) : (
                                <div className="flex h-full items-center justify-center px-1 text-center text-[8px] leading-3 text-gray-400">
                                  No image
                                </div>
                              )}
                            </div>

                            <div className="min-w-0">
                              <p className="max-w-65 truncate font-medium text-gray-800">
                                {item.productName}
                              </p>

                              <p className="mt-0.5 text-[10px] text-gray-400">
                                SKU: {item.sku}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Color */}

                        <td className="px-4 py-3 text-gray-600">
                          {item.colorName ?? "—"}
                        </td>

                        {/* Size */}

                        <td className="px-4 py-3 text-gray-600">
                          {item.sizeName ?? "—"}
                        </td>

                        {/* Price */}

                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-700">
                          {formatMoney(item.unitPrice)}
                        </td>

                        {/* Quantity */}

                        <td className="px-4 py-3">{item.quantity}</td>

                        {/* Total */}

                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                          {formatMoney(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {order.status === "CANCELLED" ? (
              <ReorderPanel items={order.items} />
            ) : null}
          </div>
        </div>
      </main>
    </>
  );
}

function OrderMeta({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-xs ${
          strong ? "font-semibold text-gray-900" : "font-medium text-gray-700"
        }`}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}

function formatMoney(amount: number) {
  return `Rs. ${Math.round(amount).toLocaleString("en-PK")}`;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 21s7-6.5 7-11.5A7 7 0 0 0 5 9.5C5 14.5 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0 text-gray-400"
      aria-hidden="true"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 6 10 7 10-7" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5 shrink-0 text-gray-400"
      aria-hidden="true"
    >
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z" />
    </svg>
  );
}
