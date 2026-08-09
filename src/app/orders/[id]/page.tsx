import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import { auth } from "@/auth";

import SiteHeader from "@/components/layout/site-header";

import { getUserOrderById } from "@/lib/services/order.service";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  // Authentication
  const session =
    await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const userId = Number(
    session.user.id
  );

  if (
    !Number.isInteger(
      userId
    )
  ) {
    redirect("/login");
  }

  // Next.js dynamic route
  const { id } =
    await params;

  // Fetch only this
  // user's order
  const order =
    await getUserOrderById(
      userId,
      id
    );

  if (!order) {
    notFound();
  }

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-[#f7f9fb] px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Heading */}
          <div className="mb-8 flex items-center gap-3">
            <Link
              href="/orders"
              aria-label="Back to orders"
              className="text-lg text-[#087ff5]"
            >
              ←
            </Link>

            <h1 className="text-2xl font-medium text-gray-900">
              Order Detail
            </h1>
          </div>

          {/* Order information */}
          <section className="border-y border-gray-300 py-7">
            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7">
              <OrderMeta
                label="Date"
                value={formatDate(
                  order.createdAt
                )}
              />

              <OrderMeta
                label="Order #"
                value={
                  order.orderNumber
                }
              />

              <OrderMeta
                label="User"
                value={
                  order.user.fullName
                }
              />

              <OrderMeta
                label="Products"
                value={String(
                  order.productCount
                )}
              />

              <OrderMeta
                label="Sub Total"
                value={formatMoney(
                  order.subtotal
                )}
              />

              <OrderMeta
                label="Tax"
                value={formatMoney(
                  order.tax
                )}
              />

              <OrderMeta
                label="Total"
                value={formatMoney(
                  order.total
                )}
              />
            </div>
          </section>

          {/* Products */}
          <section className="mt-8">
            <h2 className="mb-5 text-xl font-medium text-gray-900">
              Product Information
            </h2>

            <div className="overflow-x-auto border border-gray-200 bg-white">
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left text-sm text-gray-600">
                    <th className="px-4 py-3 font-medium">
                      Title
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Color
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Size
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Price
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Quantity
                    </th>

                    <th className="px-4 py-3 font-medium">
                      Total
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {order.items.map(
                    (item) => (
                      <tr
                        key={
                          item.id
                        }
                        className="border-b border-gray-200 text-sm text-gray-700 last:border-b-0"
                      >
                        {/* Product */}
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-medium text-gray-800">
                              {
                                item.productName
                              }
                            </p>

                            <p className="mt-1 text-xs text-gray-400">
                              SKU:{" "}
                              {
                                item.sku
                              }
                            </p>
                          </div>
                        </td>

                        {/* Color */}
                        <td className="px-4 py-4">
                          {item.colorName ??
                            "—"}
                        </td>

                        {/* Size */}
                        <td className="px-4 py-4">
                          {item.sizeName ??
                            "—"}
                        </td>

                        {/* Price */}
                        <td className="px-4 py-4">
                          {formatMoney(
                            item.unitPrice
                          )}
                        </td>

                        {/* Quantity */}
                        <td className="px-4 py-4">
                          {
                            item.quantity
                          }
                        </td>

                        {/* Line total */}
                        <td className="px-4 py-4 font-medium">
                          {formatMoney(
                            item.lineTotal
                          )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function OrderMeta({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div>
      <p className="text-sm text-gray-400">
        {label}
      </p>

      <p className="mt-2 text-sm font-medium text-gray-800">
        {value}
      </p>
    </div>
  );
}

function formatMoney(
  amount: number
) {
  return `Rs. ${amount.toLocaleString(
    "en-PK",
    {
      minimumFractionDigits:
        2,

      maximumFractionDigits:
        2,
    }
  )}`;
}

function formatDate(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  ).format(date);
}