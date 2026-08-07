import Link from "next/link";

import type { UserOrder } from "@/types/order";

type OrdersTableProps = {
  orders: UserOrder[];
};

export default function OrdersTable({
  orders,
}: OrdersTableProps) {
  return (
    <div className="overflow-x-auto border border-gray-200 bg-white">
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50 text-left text-sm text-gray-600">
            <th className="px-4 py-3 font-medium">
              Date
            </th>

            <th className="px-4 py-3 font-medium">
              Order #
            </th>

            <th className="px-4 py-3 font-medium">
              Number of Product(s)
            </th>

            <th className="px-4 py-3 font-medium">
              Amount
            </th>

            <th className="px-4 py-3 font-medium">
              Order Status
            </th>

            <th className="px-4 py-3 font-medium">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-gray-200 text-sm text-gray-700 last:border-b-0"
            >
              <td className="px-4 py-4">
                {formatDate(
                  order.createdAt
                )}
              </td>

              <td className="px-4 py-4">
                {order.orderNumber}
              </td>

              <td className="px-4 py-4">
                {order.productCount}
              </td>

              <td className="px-4 py-4">
                Rs.{" "}
                {order.total.toLocaleString(
                  "en-PK",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }
                )}
              </td>

              <td className="px-4 py-4">
                <OrderStatusBadge
                  status={
                    order.status
                  }
                />
              </td>

              <td className="px-4 py-4">
                <Link
                  href={`/orders/${order.id}`}
                  aria-label={`View order ${order.orderNumber}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-700 transition hover:bg-gray-100 hover:text-[#087ff5]"
                >
                  <ArrowIcon />
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OrderStatusBadge({
  status,
}: {
  status: UserOrder["status"];
}) {
  const styles = {
    PENDING:
      "bg-amber-100 text-amber-700",
    PROCESSING:
      "bg-yellow-100 text-yellow-700",
    SHIPPED:
      "bg-blue-100 text-blue-700",
    DELIVERED:
      "bg-green-100 text-green-700",
    CANCELLED:
      "bg-red-100 text-red-700",
  };

  const labels = {
    PENDING: "Pending",
    PROCESSING: "In Progress",
    SHIPPED: "Dispatched",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };

  return (
    <span
      className={`inline-flex min-w-[100px] justify-center rounded-md px-3 py-2 text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

function formatDate(
  date: Date
) {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M7 17 17 7" />
      <path d="M9 7h8v8" />
    </svg>
  );
}