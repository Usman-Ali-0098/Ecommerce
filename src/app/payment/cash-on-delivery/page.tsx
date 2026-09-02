import Link from "next/link";
import { redirect } from "next/navigation";

import SiteHeader from "@/components/layout/site-header";
import { getUserOrderById } from "@/lib/services/order.service";
import { getUserSession } from "@/lib/user-auth";
import { requiredIdSchema } from "@/lib/validations/common";

type CashOnDeliverySuccessPageProps = {
  searchParams: Promise<{ order_id?: string }>;
};

export default async function CashOnDeliverySuccessPage({
  searchParams,
}: CashOnDeliverySuccessPageProps) {
  const user = await getUserSession();
  if (!user) redirect("/login");

  const query = await searchParams;
  const orderId = requiredIdSchema.safeParse(query.order_id);
  if (!orderId.success) redirect("/orders");

  const order = await getUserOrderById(user.id, orderId.data);
  if (!order || order.paymentMethod !== "CASH_ON_DELIVERY") redirect("/orders");

  return (
    <>
      <SiteHeader />
      <main className="flex min-h-[calc(100vh-64px)] items-center justify-center bg-[#f7f9fb] px-4 py-10">
        <section className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-lg shadow-gray-200/50">
          <div className="bg-green-600 px-6 py-7 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white/20 text-2xl font-bold text-white ring-1 ring-white/30">✓</div>
            <h1 className="mt-3 text-xl font-semibold text-white">Order placed successfully</h1>
            <p className="mt-1 text-sm text-white/85">Thank you for your order.</p>
          </div>
          <div className="p-6">
            <div className="space-y-2 rounded-xl bg-gray-50 p-3">
              <ResultRow label="Order ID" value={order.orderNumber} />
              <ResultRow label="Payment method" value="Cash on Delivery" />
              <ResultRow label="Amount" value={`Rs. ${Math.round(order.total).toLocaleString("en-PK")}`} />
            </div>
            <div className="mt-4 rounded-lg bg-green-50 px-3 py-2.5 text-xs leading-5 text-green-700">
              Your order is confirmed and will be processed. Payment will be collected when it is delivered.
            </div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <Link href={`/orders/${order.id}`} className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700">View order detail</Link>
              <Link href="/orders" className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-300 px-4 text-xs font-semibold text-gray-700 hover:bg-gray-50">Order history</Link>
              <Link href="/" className="inline-flex h-10 items-center justify-center rounded-lg border border-gray-200 px-4 text-xs font-medium text-gray-600 hover:bg-gray-50 sm:col-span-2">Continue shopping</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg bg-white px-3 py-2 text-xs">
      <span className="text-gray-500">{label}</span>
      <span className="truncate font-semibold text-gray-900" title={value}>{value}</span>
    </div>
  );
}
