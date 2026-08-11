import Image from "next/image";
import Link from "next/link";

import {
  notFound,
  redirect,
} from "next/navigation";

import {
  auth,
} from "@/auth";

import SiteHeader from "@/components/layout/site-header";

import {
  getUserOrderById,
} from "@/lib/services/order.service";

type OrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function OrderDetailPage({
  params,
}: OrderDetailPageProps) {
  const session =
    await auth();

  if (
    !session?.user?.id
  ) {
    redirect("/login");
  }

  const userId =
    Number(
      session.user.id
    );

  if (
    !Number.isInteger(
      userId
    )
  ) {
    redirect("/login");
  }

  const { id } =
    await params;

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

      <main className="min-h-screen bg-[#f7f9fb] px-4 py-6 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[1400px]">
          {/* Heading */}

          <div className="mb-5 flex items-center gap-2.5">
            <Link
              href="/orders"
              aria-label="Back to orders"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[#087ff5] transition hover:bg-blue-50"
            >
              <span className="text-lg">
                ←
              </span>
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

          {/* Order Information */}

          <section className="rounded-lg border border-gray-200 bg-white px-4 py-4 sm:px-5">
            <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
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
                  order.user
                    .fullName
                }
              />

              <OrderMeta
                label="Products"
                value={String(
                  order.productCount
                )}
              />

              <OrderMeta
                label="Subtotal"
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
                strong
              />
            </div>
          </section>

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
              <table className="w-full min-w-[800px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                    <th className="px-4 py-2.5">
                      Product
                    </th>

                    <th className="px-4 py-2.5">
                      Color
                    </th>

                    <th className="px-4 py-2.5">
                      Size
                    </th>

                    <th className="px-4 py-2.5">
                      Price
                    </th>

                    <th className="px-4 py-2.5">
                      Qty
                    </th>

                    <th className="px-4 py-2.5">
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
                        className="border-b border-gray-100 text-xs text-gray-700 transition last:border-b-0 hover:bg-gray-50/50"
                      >
                        {/* Product */}

                        <td className="px-4 py-3">
                          <div className="flex min-w-[230px] items-center gap-3">
                            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-md border border-gray-100 bg-gray-100">
                              {item.image ? (
                                <Image
                                  src={
                                    item
                                      .image
                                      .url
                                  }
                                  alt={
                                    item
                                      .image
                                      .altText ??
                                    item.productName
                                  }
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
                              <p className="max-w-[260px] truncate font-medium text-gray-800">
                                {
                                  item.productName
                                }
                              </p>

                              <p className="mt-0.5 text-[10px] text-gray-400">
                                SKU:{" "}
                                {
                                  item.sku
                                }
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Color */}

                        <td className="px-4 py-3 text-gray-600">
                          {item.colorName ??
                            "—"}
                        </td>

                        {/* Size */}

                        <td className="px-4 py-3 text-gray-600">
                          {item.sizeName ??
                            "—"}
                        </td>

                        {/* Price */}

                        <td className="whitespace-nowrap px-4 py-3 font-medium text-gray-700">
                          {formatMoney(
                            item.unitPrice
                          )}
                        </td>

                        {/* Quantity */}

                        <td className="px-4 py-3">
                          {
                            item.quantity
                          }
                        </td>

                        {/* Total */}

                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
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
          strong
            ? "font-semibold text-gray-900"
            : "font-medium text-gray-700"
        }`}
        title={value}
      >
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
      day:
        "2-digit",
      month:
        "short",
      year:
        "numeric",
    }
  ).format(date);
}