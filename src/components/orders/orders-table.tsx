import Link from "next/link";

import type { UserOrder } from "@/types/order";

type OrdersTableProps = {
  orders: UserOrder[];
};

export default function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <table className="w-full min-w-212.5 border-collapse">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-4 py-2.5">Date</th>

            <th className="px-4 py-2.5">Order #</th>

            <th className="px-4 py-2.5">Products</th>

            <th className="px-4 py-2.5">Amount</th>

            <th className="px-4 py-2.5">Status</th>

            <th className="px-4 py-2.5 text-right">Action</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <tr
              key={order.id}
              className="border-b border-gray-100 text-xs text-gray-700 transition last:border-b-0 hover:bg-gray-50/50"
            >
              <td className="whitespace-nowrap px-4 py-3">
                {formatDate(order.createdAt)}
              </td>

              <td className="px-4 py-3">
                <span className="font-medium text-gray-800">
                  {order.orderNumber}
                </span>
              </td>

              <td className="px-4 py-3">{order.productCount}</td>

              <td className="whitespace-nowrap px-4 py-3 font-semibold text-gray-900">
                Rs.{" "}
                {Math.round(order.total).toLocaleString("en-PK")}
              </td>

              <td className="px-4 py-4">
                <OrderStatusBadge status={order.status} />
              </td>

              <td className="px-4 py-3 text-right">
                <Link
                  href={`/orders/${order.id}`}
                  aria-label={`View order ${order.orderNumber}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 transition hover:bg-blue-50 hover:text-[#087ff5]"
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

function OrderStatusBadge({ status }: { status: UserOrder["status"] }) {
  const labels = {
    PENDING: "Pending",
    PROCESSING: "In Progress",
    SHIPPED: "Dispatched",
    DELIVERED: "Delivered",
    CANCELLED: "Cancelled",
  };

  function getStatusClass() {
    switch (status) {
      case "PENDING":
        return "border border-amber-200 bg-amber-400 text-white";

      case "PROCESSING":
        return "border border-yellow-200 bg-blue-400 text-white";

      case "SHIPPED":
        return "border border-sky-200 bg-sky-100 text-sky-700";

      case "DELIVERED":
        return "border border-green-200 bg-green-400 text-white";

      case "CANCELLED":
        return "border border-red-200 bg-red-100 text-red-700";

      default:
        return "border border-gray-200 bg-gray-100 text-gray-700";
    }
  }

  return (
    <span
      className={`inline-flex min-w-26.25 items-center justify-center rounded-md px-3 py-1.5 text-[11px] font-medium ${getStatusClass()}`}
    >
      {labels[status]}
    </span>
  );
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",

    month: "short",

    year: "numeric",
  }).format(date);
}

function ArrowIcon() {
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
      <path d="M7 17 17 7" />

      <path d="M9 7h8v8" />
    </svg>
  );
}
