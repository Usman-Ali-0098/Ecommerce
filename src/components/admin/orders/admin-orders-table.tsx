import Link from "next/link";

import type {
  AdminOrder,
} from "@/lib/services/admin-order.service";

type Props = {
  orders: AdminOrder[];
};

export default function AdminOrdersTable({
  orders,
}: Props) {
  if (
    orders.length === 0
  ) {
    return (
      <div className="px-5 py-14 text-center">
        <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-gray-100">
          <OrdersIcon />
        </div>

        <p className="mt-3 text-sm font-medium text-gray-800">
          No orders found
        </p>

        <p className="mt-1 text-xs text-gray-400">
          Try changing your
          search or status
          filter.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/80 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">
            <th className="px-4 py-3">
              Order
            </th>

            <th className="px-4 py-3">
              Customer
            </th>

            <th className="px-4 py-3">
              Date
            </th>

            <th className="px-4 py-3">
              Items
            </th>

            <th className="px-4 py-3">
              Total
            </th>

            <th className="px-4 py-3">
              Status
            </th>

            <th className="px-4 py-3 text-right">
              Action
            </th>
          </tr>
        </thead>

        <tbody>
          {orders.map(
            (order) => (
              <tr
                key={
                  order.id
                }
                className="border-b border-gray-100 transition last:border-b-0 hover:bg-gray-50/60"
              >
                {/* Order */}

                <td className="px-4 py-3">
                  <p className="whitespace-nowrap text-xs font-semibold text-gray-900">
                    {
                      order.orderNumber
                    }
                  </p>
                </td>

                {/* Customer */}

                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[11px] font-semibold text-blue-600">
                      {getInitial(
                        order.customer
                          .fullName
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="max-w-[180px] truncate text-xs font-medium text-gray-800">
                        {order.customer
                          .fullName ||
                          "Customer"}
                      </p>

                      <p className="mt-0.5 max-w-[200px] truncate text-[11px] text-gray-400">
                        {
                          order.customer
                            .email
                        }
                      </p>
                    </div>
                  </div>
                </td>

                {/* Date */}

                <td className="px-4 py-3">
                  <span className="whitespace-nowrap text-xs text-gray-600">
                    {formatDate(
                      order.createdAt
                    )}
                  </span>
                </td>

                {/* Items */}

                <td className="px-4 py-3">
                  <span className="text-xs font-medium text-gray-700">
                    {
                      order.itemCount
                    }
                  </span>
                </td>

                {/* Total */}

                <td className="px-4 py-3">
                  <span className="whitespace-nowrap text-xs font-semibold text-gray-900">
                    Rs.{" "}
                    {order.total.toLocaleString(
                      "en-PK"
                    )}
                  </span>
                </td>

                {/* Status */}

                <td className="px-4 py-3">
                  <OrderStatus
                    status={
                      order.status
                    }
                  />
                </td>

                {/* Action */}

                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      title="View order"
                      aria-label={`View order ${order.orderNumber}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-blue-50 hover:text-blue-600"
                    >
                      <ViewIcon />
                    </Link>
                  </div>
                </td>
              </tr>
            )
          )}
        </tbody>
      </table>
    </div>
  );
}

function OrderStatus({
  status,
}: {
  status: string;
}) {
  const styles =
    getStatusStyles(
      status
    );

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${styles.container}`}
    >
      <span
        className={`mr-1.5 h-1.5 w-1.5 rounded-full ${styles.dot}`}
      />

      {formatStatus(
        status
      )}
    </span>
  );
}

function getStatusStyles(
  status: string
) {
  switch (status) {
    case "PENDING":
      return {
        container:
          "bg-amber-50 text-amber-700",
        dot:
          "bg-amber-500",
      };

    case "PROCESSING":
      return {
        container:
          "bg-blue-50 text-blue-700",
        dot:
          "bg-blue-500",
      };

    case "SHIPPED":
      return {
        container:
          "bg-violet-50 text-violet-700",
        dot:
          "bg-violet-500",
      };

    case "DELIVERED":
      return {
        container:
          "bg-green-50 text-green-700",
        dot:
          "bg-green-500",
      };

    case "CANCELLED":
      return {
        container:
          "bg-red-50 text-red-700",
        dot:
          "bg-red-500",
      };

    default:
      return {
        container:
          "bg-gray-100 text-gray-600",
        dot:
          "bg-gray-400",
      };
  }
}

function formatStatus(
  status: string
) {
  return status
    .toLowerCase()
    .replace(
      /^\w/,
      (letter) =>
        letter.toUpperCase()
    );
}

function formatDate(
  value:
    | string
    | Date
) {
  return new Date(
    value
  ).toLocaleDateString(
    "en-PK",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
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

function ViewIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d="M2.75 12C4.55 8.65 7.78 6.5 12 6.5C16.22 6.5 19.45 8.65 21.25 12C19.45 15.35 16.22 17.5 12 17.5C7.78 17.5 4.55 15.35 2.75 12Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <circle
        cx="12"
        cy="12"
        r="2.5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function OrdersIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-4 w-4 text-gray-400"
      aria-hidden="true"
    >
      <path
        d="M7 4H17C18.1 4 19 4.9 19 6V20L16.5 18.5L14 20L11.5 18.5L9 20L6.5 18.5L5 19.4V6C5 4.9 5.9 4 7 4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      <path
        d="M8 9H16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      <path
        d="M8 13H14"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}