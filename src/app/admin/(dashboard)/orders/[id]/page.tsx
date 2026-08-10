import Image from "next/image";
import Link from "next/link";

import {
  notFound,
} from "next/navigation";

import {
  ArrowLeft,
  Package,
  ReceiptText,
  UserRound,
} from "lucide-react";

import AdminOrderStatus from "@/components/admin/orders/admin-order-status";

import {
  getAdminOrderById,
} from "@/lib/services/admin-order.service";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "en-PK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function money(
  amount: number
) {
  return `Rs. ${amount.toLocaleString(
    "en-PK",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  )}`;
}

export default async function AdminOrderDetailPage({
  params,
}: PageProps) {
  const { id } =
    await params;

  const order =
    await getAdminOrderById(
      id
    );

  if (!order) {
    notFound();
  }

  const productCount =
    order.items.reduce(
      (
        total,
        item
      ) =>
        total +
        item.quantity,
      0
    );

  return (
    <section className="space-y-5">
      {/* Header */}

      <div>
        <Link
          href="/admin/orders"
          className="inline-flex items-center gap-2 text-gray-900 transition hover:text-blue-600"
        >
          <ArrowLeft
            size={16}
            className="text-blue-600"
          />

          <span className="text-xl font-semibold tracking-tight">
            Order Detail
          </span>
        </Link>

        <p className="mt-1 pl-6 text-xs text-gray-500">
          Review order information,
          products and status.
        </p>
      </div>

      {/* Summary */}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        <SummaryItem
          label="Date"
          value={formatDate(
            order.createdAt
          )}
        />

        <SummaryItem
          label="Order #"
          value={
            order.orderNumber
          }
        />

        <SummaryItem
          label="Customer"
          value={
            order.customer
              .fullName ||
            "Customer"
          }
          secondary={
            order.customer
              .email
          }
        />

        <SummaryItem
          label="Products"
          value={String(
            productCount
          )}
        />

        <SummaryItem
          label="Sub Total"
          value={money(
            order.subtotal
          )}
        />

        <SummaryItem
          label="Tax"
          value={money(
            order.tax
          )}
        />

        <SummaryItem
          label="Total"
          value={money(
            order.total
          )}
          strong
        />
      </div>

      {/* Main Content */}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Product Information */}

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm shadow-gray-100/50">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <div>
              <div className="flex items-center gap-2">
                <Package
                  size={15}
                  className="text-blue-600"
                />

                <h2 className="text-sm font-semibold text-gray-900">
                  Product Information
                </h2>
              </div>

              <p className="mt-0.5 text-[11px] text-gray-400">
                Items included in
                this order.
              </p>
            </div>

            <span className="rounded-full bg-gray-100 px-2.5 py-1 text-[10px] font-medium text-gray-600">
              {productCount} unit
              {productCount === 1
                ? ""
                : "s"}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-2.5">
                    Product
                  </th>

                  <th className="px-4 py-2.5">
                    Price
                  </th>

                  <th className="px-4 py-2.5">
                    Qty
                  </th>

                  <th className="px-4 py-2.5">
                    Stock
                  </th>

                  <th className="px-4 py-2.5 text-right">
                    Line Total
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
                      className="border-b border-gray-100 last:border-b-0"
                    >
                      {/* Product */}

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-gray-100 bg-gray-50">
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
                                    .altText ||
                                  item
                                    .productName
                                }
                                fill
                                sizes="40px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Package
                                  size={15}
                                  className="text-gray-300"
                                />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="max-w-[260px] truncate text-xs font-medium text-gray-900">
                              {
                                item.productName
                              }
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-1.5">
                              {item.colorName ? (
                                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                                  {
                                    item.colorName
                                  }
                                </span>
                              ) : null}

                              {item.sizeName ? (
                                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                                  Size{" "}
                                  {
                                    item.sizeName
                                  }
                                </span>
                              ) : null}
                            </div>

                            <p className="mt-1 text-[10px] text-gray-400">
                              SKU:{" "}
                              {
                                item.sku
                              }
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Price */}

                      <td className="px-4 py-3">
                        <span className="whitespace-nowrap text-xs text-gray-700">
                          {money(
                            item.unitPrice
                          )}
                        </span>
                      </td>

                      {/* Quantity */}

                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-700">
                          {
                            item.quantity
                          }
                        </span>
                      </td>

                      {/* Stock */}

                      <td className="px-4 py-3">
                        <CurrentStock
                          stock={
                            item.currentStock
                          }
                        />
                      </td>

                      {/* Line Total */}

                      <td className="px-4 py-3 text-right">
                        <span className="whitespace-nowrap text-xs font-semibold text-gray-900">
                          {money(
                            item.lineTotal
                          )}
                        </span>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}

          <div className="border-t border-gray-100 bg-gray-50/40 px-4 py-3">
            <div className="ml-auto max-w-[260px] space-y-2">
              <TotalRow
                label="Subtotal"
                value={money(
                  order.subtotal
                )}
              />

              <TotalRow
                label="Tax"
                value={money(
                  order.tax
                )}
              />

              <div className="border-t border-gray-200 pt-2">
                <TotalRow
                  label="Total"
                  value={money(
                    order.total
                  )}
                  strong
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}

        <div className="space-y-4">
          {/* Customer */}

          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100/50">
            <div className="flex items-center gap-2">
              <UserRound
                size={15}
                className="text-blue-600"
              />

              <h2 className="text-sm font-semibold text-gray-900">
                Customer
              </h2>
            </div>

            <div className="mt-3 flex items-center gap-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-semibold text-blue-600">
                {getInitial(
                  order.customer
                    .fullName
                )}
              </div>

              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-gray-800">
                  {order.customer
                    .fullName ||
                    "Customer"}
                </p>

                <p className="mt-0.5 truncate text-[11px] text-gray-400">
                  {
                    order.customer
                      .email
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Order Status */}

          <AdminOrderStatus
            orderId={
              order.id
            }
            currentStatus={
              order.status
            }
          />

          {/* Order Amount */}

          {/* <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm shadow-gray-100/50">
            <div className="flex items-center gap-2">
              <ReceiptText
                size={15}
                className="text-blue-600"
              />

              <h2 className="text-sm font-semibold text-gray-900">
                Order Amount
              </h2>
            </div>

            <div className="mt-3 space-y-2">
              <TotalRow
                label="Subtotal"
                value={money(
                  order.subtotal
                )}
              />

              <TotalRow
                label="Tax"
                value={money(
                  order.tax
                )}
              />

              <div className="border-t border-gray-100 pt-2">
                <TotalRow
                  label="Total"
                  value={money(
                    order.total
                  )}
                  strong
                />
              </div>
            </div>
          </div> */}
        </div>
      </div>
    </section>
  );
}

type SummaryItemProps = {
  label: string;
  value: string;
  secondary?: string;
  strong?: boolean;
};

function SummaryItem({
  label,
  value,
  secondary,
  strong = false,
}: SummaryItemProps) {
  return (
    <div className="min-w-0 rounded-xl border border-gray-200 bg-white px-3 py-3 shadow-sm shadow-gray-100/50">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
        {label}
      </p>

      <p
        className={`mt-1 truncate text-xs ${
          strong
            ? "font-semibold text-blue-600"
            : "font-medium text-gray-800"
        }`}
      >
        {value}
      </p>

      {secondary ? (
        <p className="mt-0.5 truncate text-[10px] text-gray-400">
          {secondary}
        </p>
      ) : null}
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span
        className={
          strong
            ? "text-xs font-semibold text-gray-800"
            : "text-[11px] text-gray-500"
        }
      >
        {label}
      </span>

      <span
        className={
          strong
            ? "text-sm font-semibold text-gray-900"
            : "text-xs font-medium text-gray-700"
        }
      >
        {value}
      </span>
    </div>
  );
}

function CurrentStock({
  stock,
}: {
  stock:
    | number
    | null;
}) {
  if (stock === null) {
    return (
      <span className="text-xs text-gray-300">
        —
      </span>
    );
  }

  return (
    <span
      className={`text-xs font-medium ${
        stock > 0
          ? "text-gray-700"
          : "text-red-600"
      }`}
    >
      {stock}
    </span>
  );
}

function getInitial(
  name:
    | string
    | null
) {
  const value =
    name?.trim();

  if (!value) {
    return "C";
  }

  return value
    .charAt(0)
    .toUpperCase();
}